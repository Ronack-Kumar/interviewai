/**
 * app/api/followup/route.js
 *
 * Generates adaptive follow-up questions after each answer.
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

// ── Persona config ────────────────────────────────────────────────────────────

const FOLLOWUP_CORE = `You are a senior interviewer. Based on the candidate's answer, generate 1 sharp follow-up question that probes deeper. If the answer is very weak or off-topic, ask a simpler clarifying question. If the answer is strong, challenge them with a harder edge case. Return ONLY the follow-up question text, nothing else. No explanation, no prefix.`;

const VALID_PERSONAS = new Set([
  'standard',
  'aggressive_faang',
  'friendly_startup',
  'silent_skeptical',
  'strict_hr',
  'tcs_infosys',
]);

function normalizePersona(raw) {
  const id = typeof raw === 'string' ? raw.trim() : '';
  return VALID_PERSONAS.has(id) ? id : 'standard';
}

const PERSONA_FOLLOWUP_VOICE = {
  aggressive_faang:
    'You are an aggressive FAANG interviewer. Challenge the answer hard. Ask a difficult follow-up that exposes gaps.',
  friendly_startup:
    'You are a friendly startup CTO. Ask a curious, encouraging follow-up.',
  silent_skeptical:
    'You are a skeptical interviewer. Ask a short, pointed follow-up with no warmth.',
  strict_hr:
    'You are a strict HR interviewer. If STAR structure was missing, ask them to restructure their answer.',
  tcs_infosys:
    'You are a formal TCS interviewer. Ask a straightforward follow-up about implementation details.',
};

function buildFollowupSystem(persona) {
  const p     = normalizePersona(persona);
  const voice = PERSONA_FOLLOWUP_VOICE[p];
  return voice ? `${FOLLOWUP_CORE}\n\n${voice}` : FOLLOWUP_CORE;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MAX_QUESTION = 12000;
const MAX_ANSWER   = 50000;

function normalizeFollowup(text) {
  if (typeof text !== 'string') return '';
  let t = text.replace(/^["'`]+|["'`]+$/g, '').trim();
  t = t.replace(/^(follow[-\s]?up|question)\s*:\s*/i, '').trim();
  return t.slice(0, 2000);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { question, answer, mode, role, persona: personaRaw, user_id } = body;

  // ── Input validation ──
  if (!question || !answer) {
    return Response.json({ error: 'question and answer are required' }, { status: 400 });
  }
  if (typeof question !== 'string' || question.length > MAX_QUESTION) {
    return Response.json(
      { error: `Invalid question — max ${MAX_QUESTION} characters` },
      { status: 400 }
    );
  }
  if (typeof answer !== 'string' || answer.length > MAX_ANSWER) {
    return Response.json(
      { error: `Answer too long — maximum ${MAX_ANSWER} characters` },
      { status: 400 }
    );
  }

  // ── Rate limiting ──
  const userKey = getUserKey(request, user_id);
  const { allowed, resetAt } = await checkAndIncrement(userKey, 'followup');
  if (!allowed) return rateLimitedResponse(resetAt);

  // ── Build AI prompt ──
  const persona      = normalizePersona(personaRaw);
  const systemPrompt = buildFollowupSystem(persona);
  const roleLabel    = typeof role === 'string' && role.trim() ? role.trim() : 'Software Engineer';

  const userContent = `Interview type: ${mode || 'technical'}
Target role: ${roleLabel}
Interviewer persona: ${persona}
Question:
${question}

Candidate answer:
${answer}`;

  // ── AI call ──
  const t0 = Date.now();
  let text, provider;
  try {
    ({ text, provider } = await callAI({
      systemPrompt,
      userContent,
      maxTokens: 256,
      temperature: 0.4,
    }));
    console.log(`✅ Follow-up served by ${provider}`);
    logAIUsage({ userKey, route: 'followup', provider, success: true, latencyMs: Date.now() - t0 });
  } catch (err) {
    logAIUsage({ userKey, route: 'followup', provider: 'none', success: false, latencyMs: Date.now() - t0 });
    if (err instanceof AiCapacityError) return aiCapacityResponse(err);
    console.error('❌ Follow-up AI error:', err.message);
    return Response.json({ error: 'AI provider error', detail: err.message }, { status: 500 });
  }

  const followup = normalizeFollowup(text);
  if (!followup) {
    return Response.json({ error: 'Empty follow-up from model' }, { status: 502 });
  }

  return Response.json({ followup }, { status: 200 });
}
