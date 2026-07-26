/**
 * app/api/hiring-decision/route.js
 *
 * Generates a session-level hiring verdict from all answers in a session.
 * Groq primary → Gemini fallback (via shared aiRouter).
 * Per-user daily rate limiting (via shared rateLimit helper).
 */

import { AiCapacityError, aiCapacityResponse, callAI } from '../../../lib/aiRouter';
import {
  checkAndIncrement,
  getUserKey,
  logAIUsage,
  rateLimitedResponse,
} from '../../../lib/rateLimit';

// ── Prompt ────────────────────────────────────────────────────────────────────

const HIRING_SYSTEM = `You are a senior hiring manager. Based on the candidate's interview performance, give a hiring decision. Be honest and critical. Return ONLY valid JSON in this exact format:
{
  "verdict": "Strong Hire" | "Hire" | "Borderline" | "No Hire" | "Strong No Hire",
  "overall_score": <number from 1 to 10>,
  "communication": { "rating": "Strong" | "Good" | "Weak", "comment": "<one or two sentences>" },
  "technical_depth": { "rating": "Strong" | "Good" | "Weak", "comment": "<one or two sentences>" },
  "confidence": { "rating": "Strong" | "Good" | "Weak", "comment": "<one or two sentences>" },
  "key_strength": "<optional one sentence>",
  "critical_weakness": "<optional one sentence>",
  "summary": "<2–4 sentences explaining the verdict for a hiring committee>"
}
Use double quotes for all JSON keys and string values. No markdown, no code fences, no text before or after the JSON object.`;

// ── Validation helpers ────────────────────────────────────────────────────────

const VERDICTS = new Set(['Strong Hire', 'Hire', 'Borderline', 'No Hire', 'Strong No Hire']);
const RATINGS  = new Set(['Strong', 'Good', 'Weak']);
const MAX_ANSWERS = 20;
const MAX_Q       = 12000;
const MAX_A       = 50000;

function parseResponse(text) {
  let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const first = clean.indexOf('{');
  const last  = clean.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    clean = clean.substring(first, last + 1);
  }
  clean = clean.replace(/\\([^"\\/bfnrtu])/g, '$1');
  clean = clean.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return JSON.parse(clean);
}

function clampDim(obj) {
  if (!obj || typeof obj !== 'object') return { rating: 'Good', comment: '' };
  const rating  = RATINGS.has(obj.rating) ? obj.rating : 'Good';
  const comment = typeof obj.comment === 'string' ? obj.comment.trim().slice(0, 800) : '';
  return { rating, comment };
}

function optSentence(val, max) {
  if (typeof val !== 'string') return undefined;
  const t = val.trim().slice(0, max);
  return t || undefined;
}

function normalizeHiring(parsed) {
  const verdict = VERDICTS.has(parsed?.verdict) ? parsed.verdict : 'Borderline';
  let overall   = Number(parsed?.overall_score);
  if (!Number.isFinite(overall)) overall = 5;
  overall = Math.min(10, Math.max(1, overall));
  const keyStrength      = optSentence(parsed?.key_strength, 800) ?? optSentence(parsed?.keyStrength, 800);
  const criticalWeakness = optSentence(parsed?.critical_weakness, 800) ?? optSentence(parsed?.criticalWeakness, 800);
  return {
    verdict,
    overall_score:   overall,
    communication:   clampDim(parsed?.communication),
    technical_depth: clampDim(parsed?.technical_depth),
    confidence:      clampDim(parsed?.confidence),
    summary: typeof parsed?.summary === 'string' ? parsed.summary.trim().slice(0, 1200) : '',
    ...(keyStrength      ? { key_strength:      keyStrength      } : {}),
    ...(criticalWeakness ? { critical_weakness: criticalWeakness } : {}),
  };
}

const FALLBACK_HIRING = normalizeHiring({
  verdict: 'Borderline',
  overall_score: 5,
  communication:   { rating: 'Good', comment: 'Could not parse model output.' },
  technical_depth: { rating: 'Good', comment: 'Could not parse model output.' },
  confidence:      { rating: 'Good', comment: 'Could not parse model output.' },
  summary: 'The hiring model returned invalid JSON. Please try again.',
});

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { answers, mode, role, user_id } = body;

  // ── Input validation ──
  if (!Array.isArray(answers) || answers.length === 0) {
    return Response.json({ error: 'answers must be a non-empty array' }, { status: 400 });
  }
  if (answers.length > MAX_ANSWERS) {
    return Response.json({ error: `At most ${MAX_ANSWERS} answers allowed` }, { status: 400 });
  }
  for (let i = 0; i < answers.length; i++) {
    const row = answers[i];
    if (!row || typeof row !== 'object')
      return Response.json({ error: `Invalid answer at index ${i}` }, { status: 400 });
    if (typeof row.question !== 'string' || !row.question.trim())
      return Response.json({ error: `question required at index ${i}` }, { status: 400 });
    if (typeof row.answer !== 'string')
      return Response.json({ error: `answer must be a string at index ${i}` }, { status: 400 });
    if (row.question.length > MAX_Q || row.answer.length > MAX_A)
      return Response.json({ error: `question or answer too long at index ${i}` }, { status: 400 });
    if (row.score != null && typeof row.score !== 'number')
      return Response.json({ error: `score must be a number or null at index ${i}` }, { status: 400 });
  }

  // ── Rate limiting ──
  const userKey = getUserKey(request, user_id);
  const { allowed, resetAt } = await checkAndIncrement(userKey, 'hiring-decision');
  if (!allowed) return rateLimitedResponse(resetAt);

  // ── Build AI prompt ──
  const roleLabel  = typeof role === 'string' && role.trim() ? role.trim() : 'Software Engineer';
  const modeLabel  = typeof mode === 'string' && mode.trim() ? mode.trim() : 'technical';

  const compact = answers.map((a, idx) => ({
    n:        idx + 1,
    question: a.question.slice(0, MAX_Q),
    answer:   a.answer.slice(0, MAX_A),
    score:    typeof a.score === 'number' && Number.isFinite(a.score) ? a.score : null,
  }));

  const userContent = `Interview type: ${modeLabel}
Target role: ${roleLabel}

Per-question performance (JSON array — use scores as signals; read answers for substance):
${JSON.stringify(compact)}`;

  // ── AI call ──
  const t0 = Date.now();
  let text, provider;
  try {
    ({ text, provider } = await callAI({
      systemPrompt:  HIRING_SYSTEM,
      userContent,
      maxTokens:     1200,
      temperature:   0.35,
    }));
    console.log(`✅ Hiring decision served by ${provider}`);
    logAIUsage({ userKey, route: 'hiring-decision', provider, success: true, latencyMs: Date.now() - t0 });
  } catch (err) {
    logAIUsage({ userKey, route: 'hiring-decision', provider: 'none', success: false, latencyMs: Date.now() - t0 });
    if (err instanceof AiCapacityError) return aiCapacityResponse(err);
    console.error('❌ Hiring-decision AI error:', err.message);
    return Response.json({ error: 'All AI providers failed', detail: err.message }, { status: 500 });
  }

  // ── Parse and return ──
  try {
    return Response.json(normalizeHiring(parseResponse(text)), { status: 200 });
  } catch {
    return Response.json(FALLBACK_HIRING, { status: 200 });
  }
}
