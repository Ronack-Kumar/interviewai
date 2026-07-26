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

// Ordered list of Gemini model IDs to try (newest/most capable first)
const GEMINI_MODEL_TRY_ORDER = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash',
  'gemini-3-flash-preview',
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

async function callGroq({ systemPrompt, userContent, model, temperature, maxTokens }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: model ?? 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent  },
      ],
      temperature: temperature ?? 0.3,
      max_tokens:  maxTokens  ?? 800,
    }),
  });

  if (res.status === 429) {
    throw Object.assign(new Error('Groq rate limit'), { status: 429, provider: 'groq' });
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('No text content from Groq');
  return text;
}

// ── Gemini ────────────────────────────────────────────────────────────────────

function geminiExtractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('');
}

function geminiShouldTryNextModel(status, errorMessage) {
  if (status === 404) return true;
  return /not found|is not found|does not exist|was not found|UNAVAILABLE_MODEL|MODEL_NOT_FOUND/i.test(
    String(errorMessage || '')
  );
}

async function callGemini({ systemPrompt, userContent, temperature, maxTokens }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');

  const generationConfig = {
    temperature: temperature ?? 0.3,
    maxOutputTokens: maxTokens ?? 800,
  };
  let lastError = '';

  for (const modelId of GEMINI_MODEL_TRY_ORDER) {
    const res = await fetch(
      `${GEMINI_REST_BASE}/${modelId}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userContent }] }],
          generationConfig,
        }),
      }
    );

    if (res.status === 429) {
      throw Object.assign(new Error('Gemini rate limit'), { status: 429, provider: 'gemini' });
    }

    const data = await res.json().catch(() => ({}));
    const errMsg = data?.error?.message || '';

    if (!res.ok) {
      lastError = `Gemini HTTP ${res.status} (${modelId}): ${errMsg || JSON.stringify(data).slice(0, 200)}`;
      if (geminiShouldTryNextModel(res.status, errMsg)) continue;
      throw new Error(lastError);
    }

    const text = geminiExtractText(data);
    if (text) return text;

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
 * @param {string}  [params.groqModel]   - Override Groq model (default: llama-3.3-70b-versatile)
 * @param {number}  [params.temperature] - Sampling temperature (default: 0.3)
 * @param {number}  [params.maxTokens]   - Max output tokens (default: 800)
 *
 * @returns {Promise<{ text: string, provider: 'groq' | 'gemini' }>}
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
    const text = await callGroq({
      systemPrompt,
      userContent,
      model: groqModel,
      temperature,
      maxTokens,
    });
    return { text, provider: 'groq' };
  } catch (groqErr) {
    console.warn(`[aiRouter] Groq failed (${groqErr.message}) — trying Gemini…`);
  }

  // Fallback: Gemini model chain
  try {
    const text = await callGemini({ systemPrompt, userContent, temperature, maxTokens });
    return { text, provider: 'gemini' };
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
