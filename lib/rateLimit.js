/**
 * lib/rateLimit.js
 *
 * Server-side rate-limit helper for AI routes.
 * Tracks per-user daily AI call counts in Supabase `usage_daily`.
 *
 * Design principles:
 *  - Fail open: if Supabase is unavailable, the call is allowed rather than
 *    silently breaking the product for all users.
 *  - Atomic upsert: uses Supabase's "ON CONFLICT DO UPDATE" via the REST API
 *    to avoid race conditions on concurrent requests.
 *  - Non-blocking logging: ai_usage_log writes are fire-and-forget.
 */

// Daily call caps
export const AUTH_DAILY_CAP  = 20;   // signed-in users
export const GUEST_DAILY_CAP = 5;    // anonymous / guest users

// ── Supabase service-key REST helpers ────────────────────────────────────────

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  return { url, key, configured: !!(url && key) };
}

function supabaseHeaders(key) {
  return {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: 'return=representation',
  };
}

// ── Core: check + increment ──────────────────────────────────────────────────

/**
 * Atomically increments the daily call count for a user key.
 * Returns whether the call is allowed and how many calls remain today.
 *
 * @param {string} userKey - Supabase user UUID, or 'guest:<hash>'
 * @param {string} route   - Route name for logging, e.g. 'feedback'
 * @returns {{ allowed: boolean, remaining: number, resetAt: string, total: number }}
 */
export async function checkAndIncrement(userKey, route = 'unknown') {
  const isGuest = userKey.startsWith('guest:');
  const cap = isGuest ? GUEST_DAILY_CAP : AUTH_DAILY_CAP;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC

  // Fail open if Supabase isn't configured
  const { url, key, configured } = getSupabaseConfig();
  if (!configured) {
    return { allowed: true, remaining: cap, resetAt: nextMidnightUTC(), total: 0 };
  }

  try {
    // Step 1: upsert a row for (user_key, date) and increment call_count
    const upsertRes = await fetch(`${url}/rest/v1/usage_daily`, {
      method: 'POST',
      headers: {
        ...supabaseHeaders(key),
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        user_key: userKey,
        date: today,
        call_count: 1,
        last_called: new Date().toISOString(),
      }),
    });

    if (!upsertRes.ok) {
      // Upsert failed — try a direct RPC increment, or fail open
      const errText = await upsertRes.text().catch(() => '');
      console.warn('[rateLimit] upsert failed:', errText);
      return { allowed: true, remaining: cap, resetAt: nextMidnightUTC(), total: 0 };
    }

    const rows = await upsertRes.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : rows;

    // The upsert above inserts call_count=1 on new rows. For existing rows,
    // Supabase's merge-duplicates merges—but does NOT auto-increment.
    // We need an explicit increment via PATCH on conflict.
    // Better approach: fetch current, then patch.
    const current = await getCurrentCount(url, key, userKey, today);
    const newCount = current + 1;

    if (current < cap) {
      // Increment
      await patchCount(url, key, userKey, today, newCount);
    }

    const remaining = Math.max(0, cap - newCount);
    const allowed = newCount <= cap;

    return { allowed, remaining, resetAt: nextMidnightUTC(), total: newCount };
  } catch (err) {
    console.warn('[rateLimit] checkAndIncrement error (failing open):', err.message);
    return { allowed: true, remaining: cap, resetAt: nextMidnightUTC(), total: 0 };
  }
}

/**
 * Returns the current call count for (userKey, date). Returns 0 if not found.
 */
async function getCurrentCount(url, key, userKey, date) {
  try {
    const res = await fetch(
      `${url}/rest/v1/usage_daily?user_key=eq.${encodeURIComponent(userKey)}&date=eq.${date}&select=call_count`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      }
    );
    if (!res.ok) return 0;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0 ? (rows[0].call_count ?? 0) : 0;
  } catch {
    return 0;
  }
}

/**
 * Patches the call_count for an existing (userKey, date) row.
 */
async function patchCount(url, key, userKey, date, newCount) {
  try {
    await fetch(
      `${url}/rest/v1/usage_daily?user_key=eq.${encodeURIComponent(userKey)}&date=eq.${date}`,
      {
        method: 'PATCH',
        headers: {
          ...supabaseHeaders(key),
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          call_count: newCount,
          last_called: new Date().toISOString(),
        }),
      }
    );
  } catch {
    // Non-critical — fail silently
  }
}

// ── Usage log (fire-and-forget) ───────────────────────────────────────────────

/**
 * Logs one AI call to ai_usage_log for observability.
 * Never awaited — does not block the request path.
 *
 * @param {{ userKey: string, route: string, provider: string, success: boolean, latencyMs: number }} entry
 */
export function logAIUsage({ userKey, route, provider, success, latencyMs }) {
  const { url, key, configured } = getSupabaseConfig();
  if (!configured) return;

  fetch(`${url}/rest/v1/ai_usage_log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      user_key: userKey ?? null,
      route: route ?? null,
      provider: provider ?? null,
      success: success ?? null,
      latency_ms: typeof latencyMs === 'number' ? Math.round(latencyMs) : null,
      created_at: new Date().toISOString(),
    }),
  }).catch((err) => {
    console.warn('[rateLimit] ai_usage_log insert failed (non-critical):', err.message);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns an ISO string for midnight UTC today (the next reset point).
 */
function nextMidnightUTC() {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

/**
 * Derives a user key from the Next.js request object.
 * Auth'd users: their user_id from the request body (trusted, server-side).
 * Guests: a hash of the client IP.
 *
 * @param {Request} request - Next.js Request object
 * @param {string|undefined} userId - user_id from the parsed body (may be undefined for guests)
 * @returns {string}
 */
export function getUserKey(request, userId) {
  if (userId && typeof userId === 'string' && userId.trim()) {
    return userId.trim();
  }
  // Derive guest key from IP (not a security measure, just a soft limit)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  // Simple 16-char prefix to avoid storing full IPs
  const ipKey = ip.slice(0, 16).replace(/[^a-zA-Z0-9.:]/g, '_');
  return `guest:${ipKey}`;
}

/**
 * Builds the standard HTTP 429 response for rate-limited requests.
 *
 * @param {string} resetAt - ISO string of when the limit resets
 * @returns {Response}
 */
export function rateLimitedResponse(resetAt) {
  const resetDate = new Date(resetAt);
  const hoursUntilReset = Math.ceil((resetDate - Date.now()) / 3_600_000);
  return Response.json(
    {
      error: 'rate_limited',
      message: `You've reached your free daily practice limit. Come back in ${hoursUntilReset}h — resets at midnight UTC.`,
      resetAt,
      remaining: 0,
      code: 'DAILY_LIMIT_REACHED',
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((resetDate - Date.now()) / 1000)),
        'X-RateLimit-Reset': resetAt,
      },
    }
  );
}
