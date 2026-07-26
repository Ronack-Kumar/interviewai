/**
 * app/api/hint/route.js
 *
 * Provides a concise hint for the current question without revealing the answer.
 * Groq primary → Gemini model-chain fallback (via shared aiRouter).
 * Per-user daily rate limiting (via shared rateLimit helper).
 *
 * Note: previously this route only fell back to a single Gemini model
 * (gemini-2.0-flash), skipping the full model-chain fallback.
 * Now uses the shared aiRouter which tries the full ordered model list.
 */

import { AiCapacityError, aiCapacityResponse, callAI } from '../../../lib/aiRouter';
import {
  checkAndIncrement,
  getUserKey,
  logAIUsage,
  rateLimitedResponse,
} from '../../../lib/rateLimit';

const MAX_Q = 12000;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { question, mode, role, user_id } = body;

  // ── Input validation ──
  if (!question || typeof question !== 'string' || question.length > MAX_Q) {
    return Response.json(
      { error: `Valid question is required (max ${MAX_Q} chars)` },
      { status: 400 }
    );
  }

  // ── Rate limiting ──
  const userKey = getUserKey(request, user_id);
  const { allowed, resetAt } = await checkAndIncrement(userKey, 'hint');
  if (!allowed) return rateLimitedResponse(resetAt);

  // ── Build AI prompt ──
  const roleLabel = typeof role === 'string' && role.trim() ? role.trim() : '';

  let modeHint =
    mode === 'hr'
      ? 'Think about structuring your answer using the STAR method (Situation, Task, Action, Result).'
      : mode === 'case'
        ? 'Consider starting with a framework or structure before diving into specifics.'
        : mode === 'coding'
          ? 'Give a hint about algorithm pattern, data structure, or edge cases — do NOT reveal full working code.'
          : 'Think about the core concept, edge cases, and trade-offs.';

  if (roleLabel) modeHint += ` Context: interview for ${roleLabel}.`;

  const systemPrompt = `You are a helpful interview coach giving a single, concise hint.
Do NOT give away the full answer — just point the candidate in the right direction.
${modeHint}
Respond ONLY with a JSON object: {"hint":"Your one or two sentence hint here."}`;

  const userContent = `Give me a hint for this interview question / problem:\n${question}`;

  // ── AI call ──
  const t0 = Date.now();
  let text, provider;
  try {
    ({ text, provider } = await callAI({
      systemPrompt,
      userContent,
      maxTokens: 200,
      temperature: 0.4,
    }));
    console.log(`✅ Hint served by ${provider}`);
    logAIUsage({ userKey, route: 'hint', provider, success: true, latencyMs: Date.now() - t0 });
  } catch (err) {
    logAIUsage({ userKey, route: 'hint', provider: 'none', success: false, latencyMs: Date.now() - t0 });
    if (err instanceof AiCapacityError) return aiCapacityResponse(err);
    console.error('❌ Hint AI error:', err.message);
    return Response.json({ error: 'Failed to get hint', detail: err.message }, { status: 500 });
  }

  // ── Parse and return ──
  let parsed;
  try {
    parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    parsed = { hint: text.trim() };
  }

  return Response.json(
    { hint: parsed.hint || 'Consider the key concepts and think about real examples.' },
    { status: 200 }
  );
}