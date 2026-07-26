/**
 * app/api/feedback/route.js
 *
 * Evaluates interview answers / code submissions.
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

// ── System prompts ────────────────────────────────────────────────────────────

const SYSTEM_PROMPTS = {
  hr: `You are an expert HR interview coach specialising in behavioural interviews.
Evaluate the candidate's answer using the STAR method (Situation, Task, Action, Result).
Check: Did they set context (Situation)? Was the goal clear (Task)? Did they describe specific steps (Action)? Was there a measurable outcome (Result)?
Respond ONLY with a JSON object (no markdown, no extra text) in this exact format:
{"score":7,"accuracy":70,"clarity":80,"depth":65,"star_score":3,"feedback":"Your specific, actionable feedback in 2-3 sentences.","scoreReason":"One sentence explaining the score.","idealAnswer":"A concise STAR-structured model answer in 3-4 sentences."}
star_score is out of 4 (one point per STAR component present).`,

  technical: `You are an expert technical interview coach.
Evaluate the candidate's answer for technical accuracy, time/space complexity awareness, and system design thinking.
Respond ONLY with a JSON object (no markdown, no extra text) in this exact format:
{"score":7,"accuracy":70,"clarity":80,"depth":65,"feedback":"Your specific, actionable feedback in 2-3 sentences.","scoreReason":"One sentence explaining the score.","idealAnswer":"A concise model answer in 3-4 sentences."}`,

  case: `You are an expert case interview coach.
Evaluate the candidate's structured thinking, framework use, and quantitative reasoning.
Respond ONLY with a JSON object (no markdown, no extra text) in this exact format:
{"score":7,"accuracy":70,"clarity":80,"depth":65,"feedback":"Your specific, actionable feedback in 2-3 sentences.","scoreReason":"One sentence explaining the score.","idealAnswer":"A concise model answer in 3-4 sentences."}`,

  stress: `You are a tough stress-round interviewer evaluating how the candidate holds up under pressure.
Evaluate composure, directness, and self-awareness.
Respond ONLY with a JSON object (no markdown, no extra text) in this exact format:
{"score":7,"accuracy":70,"clarity":80,"depth":65,"feedback":"Your specific, actionable feedback in 2-3 sentences.","scoreReason":"One sentence explaining the score.","idealAnswer":"A concise model answer in 3-4 sentences."}`,

  coding: `You are an expert coding interview reviewer.
Evaluate the submitted code for correctness vs the stated problem, edge cases, time/space complexity, and code quality.
Respond ONLY with a JSON object (no markdown, no extra text) in this exact format:
{"score":7,"accuracy":70,"clarity":80,"depth":65,"feedback":"Your specific, actionable feedback in 2-4 sentences.","scoreReason":"One sentence explaining the score.","idealAnswer":"A concise outline or pseudocode of an optimal approach (not necessarily full code)."}
Do not include star_score.`,
};

// ── Persona config ────────────────────────────────────────────────────────────

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

const PERSONA_FEEDBACK_ADDENDUM = {
  aggressive_faang: `Interviewer persona — Aggressive FAANG bar: calibrate to an elite hiring standard. Be harsher and more specific—call out missing edge cases, shallow trade-off analysis, and hand-wavy claims. Penalize vagueness in scores and written feedback. Minimize praise unless clearly earned.`,
  friendly_startup: `Interviewer persona — Friendly startup CTO: sound encouraging while staying honest. Acknowledge good instincts where present, then name gaps constructively with concrete next steps. Avoid insults or dismissive tone.`,
  silent_skeptical: `Interviewer persona — Silent & skeptical: keep feedback blunt and economical—minimal warmth, minimal hedging. State issues directly; little praise; mostly matter-of-fact critique.`,
  strict_hr: `Interviewer persona — Strict HR: explicitly evaluate STAR structure where applicable (Situation, Task, Action, Result). Flag missing components, vague metrics, and unstructured answers in feedback and scoreReason.`,
  tcs_infosys: `Interviewer persona — TCS/Infosys style: use a formal, process-oriented tone. Emphasize fundamentals, project specifics, ownership, and clarity of implementation details in your feedback.`,
};

function buildFeedbackSystem(mode, persona) {
  const base = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.technical;
  const p    = normalizePersona(persona);
  const add  = PERSONA_FEEDBACK_ADDENDUM[p];
  return add ? `${base}\n\n${add}` : base;
}

// ── Response parsing ──────────────────────────────────────────────────────────

const MAX_QUESTION = 12000;
const MAX_ANSWER   = 50000;

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
  const { allowed, resetAt } = await checkAndIncrement(userKey, 'feedback');
  if (!allowed) return rateLimitedResponse(resetAt);

  // ── Build AI prompt ──
  const persona       = normalizePersona(personaRaw);
  const systemPrompt  = buildFeedbackSystem(mode, persona);
  const roleLabel     = typeof role === 'string' && role.trim() ? role.trim() : 'Software Engineer';

  const userContent = `Interview type: ${mode || 'technical'}
Target role: ${roleLabel}
Interviewer persona: ${persona}
Question / problem statement:
${question}

Candidate answer / code:
${answer}`;

  // ── AI call ──
  const t0 = Date.now();
  let text, provider;
  try {
    ({ text, provider } = await callAI({
      systemPrompt,
      userContent,
      maxTokens: 800,
      temperature: 0.3,
    }));
    console.log(`✅ Feedback served by ${provider}`);
    logAIUsage({ userKey, route: 'feedback', provider, success: true, latencyMs: Date.now() - t0 });
  } catch (err) {
    logAIUsage({ userKey, route: 'feedback', provider: 'none', success: false, latencyMs: Date.now() - t0 });
    if (err instanceof AiCapacityError) return aiCapacityResponse(err);
    console.error('❌ Feedback AI error:', err.message);
    return Response.json({ error: 'AI provider error', detail: err.message }, { status: 500 });
  }

  // ── Parse and return ──
  try {
    const parsed = parseResponse(text);
    return Response.json(parsed, { status: 200 });
  } catch {
    return Response.json(
      {
        score: 5, accuracy: 50, clarity: 50, depth: 50,
        feedback: 'Feedback could not be fully parsed. Please try again.',
        scoreReason: 'Response was truncated.',
        idealAnswer: '',
      },
      { status: 200 }
    );
  }
}