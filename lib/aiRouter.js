/**
 * lib/aiRouter.js
 *
 * Shared AI call router: Groq (primary) → Gemini model-chain (fallback).
 *
 * Eliminates duplicated callGroq / callGemini code that previously existed
 * across all 5 AI routes (feedback, followup, hint, questions, hiring-decision).
 *
 * Design principles:
 *  - Any error from Groq (429, network failure, bad response) triggers Gemini.
 *  - Gemini tries a chain of model IDs in order, skipping 404/unavailable models.
 *  - If both providers fail, throws AiCapacityError with structured metadata.
 *  - Returns { text, provider } so callers can log which provider responded.
 */

const GROQ_API_URL    = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_REST_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Ordered list of candidate Groq models to try (primary + compatible models)
const GROQ_MODEL_TRY_ORDER = [
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'llama-3.1-8b-instant',
];

// Ordered list of Gemini model IDs to try (newest/most capable first, with lightweight fallback)
const GEMINI_MODEL_TRY_ORDER = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
];

// ── Typed error for total capacity failure ───────────────────────────────────

export class AiCapacityError extends Error {
  constructor(message, detail) {
    super(message);
    this.name  = 'AiCapacityError';
    this.code  = 'AI_CAPACITY';
    this.detail = detail ?? message;
  }
}

// ── Groq ──────────────────────────────────────────────────────────────────────

function getGroqModelsToTry(requestedModel) {
  const envModel = process.env.GROQ_MODEL?.trim();
  const candidates = [
    envModel,
    requestedModel,
    ...GROQ_MODEL_TRY_ORDER,
  ].filter(Boolean);
  return Array.from(new Set(candidates));
}

async function callGroq({ systemPrompt, userContent, model, temperature, maxTokens }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');

  const modelsToTry = getGroqModelsToTry(model);
  let lastError = '';

  for (const modelId of modelsToTry) {
    try {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userContent  },
          ],
          temperature: temperature ?? 0.3,
          max_tokens:  maxTokens  ?? 800,
        }),
      });

      if (res.status === 429) {
        throw Object.assign(new Error(`Groq rate limit on ${modelId}`), { status: 429, provider: 'groq' });
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        lastError = `Groq HTTP ${res.status} (${modelId}): ${body.slice(0, 200)}`;
        // If model not found or decommissioned on this tier/key, try next candidate
        if (res.status === 404 || body.includes('model_not_found') || body.includes('decommissioned')) {
          console.warn(`[aiRouter] Groq model ${modelId} unavailable (${res.status}) — trying next candidate…`);
          continue;
        }
        throw new Error(lastError);
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) {
        lastError = `No text content from Groq (${modelId})`;
        continue;
      }
      return { text, model: modelId };
    } catch (err) {
      if (err.status === 429) throw err;
      lastError = err.message;
    }
  }

  throw new Error(lastError || 'All Groq models failed');
}

// ── Gemini ────────────────────────────────────────────────────────────────────

function geminiExtractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('');
}

function getGeminiModelsToTry() {
  const envModel = process.env.GEMINI_MODEL?.trim();
  const candidates = [
    envModel,
    ...GEMINI_MODEL_TRY_ORDER,
  ].filter(Boolean);
  return Array.from(new Set(candidates));
}

async function callGemini({ systemPrompt, userContent, temperature, maxTokens }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');

  const generationConfig = {
    maxOutputTokens: maxTokens ?? 800,
  };
  let lastError = '';

  const modelsToTry = getGeminiModelsToTry();

  for (const modelId of modelsToTry) {
    let res;
    try {
      res = await fetch(
        `${GEMINI_REST_BASE}/${modelId}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userContent }] }],
            generationConfig,
          }),
        }
      );
    } catch (fetchErr) {
      lastError = `Gemini network error (${modelId}): ${fetchErr.message}`;
      console.warn(`[aiRouter] ${lastError} — trying next model…`);
      continue;
    }

    // Auth failure: invalid or rejected API key
    if (res.status === 401 || res.status === 403) {
      const data = await res.json().catch(() => ({}));
      const msg = data?.error?.message || 'Invalid or unauthorized GEMINI_API_KEY';
      throw Object.assign(new Error(msg), { status: res.status, provider: 'gemini' });
    }

    // Rate limit (429): Quota on Gemini Free Tier is tracked per-model.
    // Trying the next model in chain preserves service availability.
    if (res.status === 429) {
      console.warn(`[aiRouter] Gemini model ${modelId} rate limited (429) — trying next model in chain…`);
      lastError = `Gemini model ${modelId} rate limited (429)`;
      continue;
    }

    const data = await res.json().catch(() => ({}));
    const errMsg = data?.error?.message || '';

    if (!res.ok) {
      lastError = `Gemini HTTP ${res.status} (${modelId}): ${errMsg || JSON.stringify(data).slice(0, 200)}`;
      console.warn(`[aiRouter] Gemini model ${modelId} failed (${res.status}): ${errMsg || 'error'} — trying next model…`);
      continue;
    }

    const text = geminiExtractText(data);
    if (text) {
      return {
        text,
        rawData: data,
        status: res.status,
        model: modelId,
        finishReason: data?.candidates?.[0]?.finishReason || ''
      };
    }

    const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback || '';
    lastError = `No text from Gemini (${modelId})${reason ? ` (${JSON.stringify(reason).slice(0, 100)})` : ''}`;
  }

  throw new Error(lastError || 'All Gemini models failed');
}

// ── Public router ─────────────────────────────────────────────────────────────

/**
 * Routes an AI call through Groq first, Gemini second.
 *
 * @param {object} params
 * @param {string}  params.systemPrompt  - System instruction
 * @param {string}  params.userContent   - User message / prompt
 * @param {string}  [params.groqModel]   - Override Groq model (default: llama-3.3-70b-versatile with fallbacks)
 * @param {number}  [params.temperature] - Sampling temperature (default: 0.3)
 * @param {number}  [params.maxTokens]   - Max output tokens (default: 800)
 *
 * @returns {Promise<{ text: string, provider: 'groq' | 'gemini', model?: string }>}
 * @throws  {AiCapacityError} When both providers are unavailable
 */
export async function callAI({
  systemPrompt,
  userContent,
  groqModel,
  temperature,
  maxTokens,
}) {
  // Try Groq first
  try {
    const groqRes = await callGroq({
      systemPrompt,
      userContent,
      model: groqModel,
      temperature,
      maxTokens,
    });
    return { text: groqRes.text, provider: 'groq', model: groqRes.model };
  } catch (groqErr) {
    console.warn(`[aiRouter] Groq failed (${groqErr.message}) — trying Gemini…`);
  }

  // Fallback: Gemini model chain
  try {
    const geminiRes = await callGemini({ systemPrompt, userContent, temperature, maxTokens });
    return {
      text: geminiRes.text,
      provider: 'gemini',
      rawData: geminiRes.rawData,
      status: geminiRes.status,
      model: geminiRes.model,
      finishReason: geminiRes.finishReason
    };
  } catch (geminiErr) {
    console.error('[aiRouter] Both Groq and Gemini failed:', geminiErr.message);
    throw new AiCapacityError(
      'All AI providers are currently unavailable. Please try again in a moment.',
      geminiErr.message
    );
  }
}

/**
 * Builds a standard HTTP 503 response for total AI provider failure.
 * Use this in route handlers after catching AiCapacityError.
 *
 * @param {AiCapacityError} err
 * @returns {Response}
 */
export function aiCapacityResponse(err) {
  return Response.json(
    {
      error: 'ai_unavailable',
      message: "We're at capacity right now — both AI providers are temporarily rate-limited. Please try again in about a minute.",
      code:   'AI_CAPACITY',
      detail: err.detail ?? err.message,
    },
    { status: 503 }
  );
}
