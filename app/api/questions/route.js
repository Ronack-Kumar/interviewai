/**
 * app/api/questions/route.js
 *
 * Generates interview questions or coding problems.
 * Groq primary → Gemini fallback (via shared aiRouter).
 * Per-user daily rate limiting (via shared rateLimit helper).
 * Short-window request deduplication to avoid burning quota on double-loads.
 */

import { AiCapacityError, aiCapacityResponse, callAI } from '../../../lib/aiRouter';
import {
  checkAndIncrement,
  getUserKey,
  logAIUsage,
  rateLimitedResponse,
} from '../../../lib/rateLimit';

// ── Request deduplication cache ───────────────────────────────────────────────
// Stores recent results keyed by a hash of the request payload.
// TTL: 30 seconds — catches rapid double-loads without being stale.

const requestCache = new Map();
const CACHE_TTL_MS = 30_000;

function hashRequest(obj) {
  const str = JSON.stringify(obj);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

function getCached(key) {
  const entry = requestCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    requestCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  // Limit cache size to 50 entries (memory guard)
  if (requestCache.size >= 50) {
    const oldest = requestCache.keys().next().value;
    requestCache.delete(oldest);
  }
  requestCache.set(key, { data, ts: Date.now() });
}

// ── Shared JSON parser ────────────────────────────────────────────────────────

function safeParseJSON(text) {
  let clean = text.replace(/```json|```/g, '').trim();
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  clean = clean.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
  clean = clean.replace(/"([^"]*)"/g, (match) =>
    match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
  );
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (!match) throw new Error('No valid JSON found in response');
    return JSON.parse(match[1]);
  }
}

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

function personaQuestionModifier(persona) {
  switch (persona) {
    case 'aggressive_faang':
      return `\n\nInterviewer persona — Aggressive FAANG: bias toward harder questions, edge cases, scalability, failure modes, and system design at large scale. Avoid softball prompts.`;
    case 'friendly_startup':
      return `\n\nInterviewer persona — Friendly startup CTO: favor practical, real-world scenarios, shipping trade-offs, and "how would you approach this on a small team" angles. Keep questions grounded but still substantive.`;
    case 'silent_skeptical':
      return `\n\nInterviewer persona — Silent & skeptical: keep questions terse and slightly under-specified; minimal setup; no warm framing; let the candidate fill gaps.`;
    case 'strict_hr':
      return `\n\nInterviewer persona — Strict HR: behavioral and STAR-oriented prompts; ask for specific situations, actions, metrics, and reflections; avoid vague hypotheticals without asking for concrete past examples.`;
    case 'tcs_infosys':
      return `\n\nInterviewer persona — TCS/Infosys style: formal, process-oriented; mix fundamentals (OOP, DBMS, SDLC, basics) with project walk-through and role-aligned enterprise questions.`;
    default:
      return '';
  }
}

// ── Code starter templates ────────────────────────────────────────────────────

const starterTemplates = {
  python:     'def solution():\n    pass',
  javascript: 'function solution() {\n  \n}',
  java:       'public static void solution() {\n  \n}',
  cpp:        'void solution() {\n  \n}',
};

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { mode, pack, resumeText, role, persona: personaRaw, user_id } = body;

  if (!mode) {
    return Response.json({ error: 'mode is required' }, { status: 400 });
  }

  const hasGroqKey   = !!process.env.GROQ_API_KEY;
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  console.log('GROQ key exists:', hasGroqKey, '| GEMINI key exists:', hasGeminiKey);

  if (!hasGroqKey && !hasGeminiKey) {
    return Response.json({ error: 'No API key configured' }, { status: 500 });
  }

  // ── Rate limiting ──
  const userKey = getUserKey(request, user_id);
  const { allowed, resetAt } = await checkAndIncrement(userKey, 'questions');
  if (!allowed) return rateLimitedResponse(resetAt);

  // ── Deduplication cache check ──
  const cacheKey = hashRequest({ mode, pack, role, persona: normalizePersona(personaRaw), resumeText: (resumeText || '').slice(0, 50) });
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('✅ Questions served from cache (dedup)');
    return Response.json(cached, { status: 200 });
  }

  // ── Build prompts ──
  const persona      = normalizePersona(personaRaw);
  const personaBlock = personaQuestionModifier(persona);
  const roleLabel    = typeof role === 'string' && role.trim() ? role.trim() : 'Software Engineer';
  const safeResume   = typeof resumeText === 'string' ? resumeText.substring(0, 500) : '';

  const modeDescriptions = {
    technical: 'technical software engineering interview (data structures, algorithms, system design, databases)',
    hr:        'HR and behavioral interview using the STAR method (situational, teamwork, leadership, conflict, growth)',
    case:      'case study and analytical interview (market sizing, business problem solving, frameworks)',
    stress:    'stress/pressure interview with tough follow-up questions that challenge the candidate',
    coding:    'live coding and data structures / algorithms round',
  };

  const packDescriptions = {
    tcs:     'TCS (Tata Consultancy Services) — focus on Java, OOPS, DBMS, networking, SDLC, service-based company style',
    infosys: 'Infosys — focus on microservices, Agile, REST APIs, cloud, design patterns, enterprise tech',
    wipro:   'Wipro — focus on DSA basics, SQL, MVC, HTTP, recursion, end-to-end project experience',
    faang:   'FAANG/top tech companies — focus on distributed systems, large-scale design, advanced algorithms, trade-offs',
  };

  const t0 = Date.now();

  // ── Coding mode ──────────────────────────────────────────────────────────────
  if (mode === 'coding') {
    const systemPrompt = `You are an expert coding interview author. Generate exactly 6 unique algorithmic problems as a JSON array ONLY (no markdown).
Each element must be an object with these keys:
- "title": string
- "difficulty": "Easy" | "Medium" | "Hard"
- "description": string (full problem statement)
- "constraints": array of strings
- "examples": array of objects {"input": string, "output": string, "explanation": string}
- "visibleTests": array of exactly 3 objects {"input": string, "output": string} (shown to candidate)
- "hiddenTests": array of exactly 2 objects {"input": string, "output": string} (not shown; for evaluation only)

Cover these topics, exactly one problem each — no two problems may share the same topic:
arrays, strings, linked lists, trees, dynamic programming, sorting.
Each problem JSON object must implicitly reflect its distinct topic (vary problem statements accordingly).
No plagiarism — original statements.${personaBlock}`;

    let userPrompt = `Generate 6 coding interview problems for a ${roleLabel} interview. Tailor difficulty mix: 1 Easy, 3 Medium, 2 Hard.
Enforce one unique topic per problem from the fixed list (arrays, strings, linked lists, trees, dynamic programming, sorting) — no duplicates.`;

    if (safeResume.trim().length > 50) {
      userPrompt += `\n\nCandidate background (tailor 2-3 problems):\n${safeResume}`;
    }

    try {
      const { text, provider } = await callAI({
        systemPrompt,
        userContent: userPrompt,
        groqModel:   'llama-3.1-8b-instant',
        temperature: 0.75,
        maxTokens:   4096,
      });

      const parsed = safeParseJSON(text);
      parsed.forEach((p) => { if (!p.templates) p.templates = starterTemplates; });

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Response was not a valid array');
      }

      const result = { problems: parsed.slice(0, 6) };
      setCache(cacheKey, result);
      console.log(`✅ Questions (coding) served by ${provider}`);
      logAIUsage({ userKey, route: 'questions/coding', provider, success: true, latencyMs: Date.now() - t0 });
      return Response.json(result, { status: 200 });
    } catch (err) {
      logAIUsage({ userKey, route: 'questions/coding', provider: 'none', success: false, latencyMs: Date.now() - t0 });
      if (err instanceof AiCapacityError) return aiCapacityResponse(err);
      console.error('Questions (coding) API error:', err);
      return Response.json(
        { error: 'Failed to generate coding problems', detail: err.message },
        { status: 500 }
      );
    }
  }

  // ── Standard interview modes ──────────────────────────────────────────────────
  const systemPrompt = `You are an expert interview question generator. Generate exactly 8 unique, varied interview questions.
Respond ONLY with a JSON array of 8 strings (no markdown, no extra text, no numbering).
Example format: ["Question 1?","Question 2?","Question 3?","Question 4?","Question 5?","Question 6?","Question 7?","Question 8?"]
Make questions varied in difficulty and topic. Avoid repetition.${personaBlock}`;

  let userPrompt = `Generate 8 ${modeDescriptions[mode] || 'interview'} questions for a ${roleLabel} interview`;

  if (pack && pack !== 'general' && packDescriptions[pack]) {
    userPrompt += ` specifically for a ${packDescriptions[pack]} interview`;
  }

  if (safeResume.trim().length > 50) {
    userPrompt += `.\n\nThe candidate's resume/background:\n${safeResume}\n\nTailor 3-4 of the questions specifically to their experience, skills, and projects mentioned. The remaining questions should be standard ${mode} questions.`;
  } else {
    userPrompt += '.';
  }
  userPrompt += ' Ensure all 8 questions are unique and cover different topics. Do not repeat common generic questions.';

  try {
    const { text, provider } = await callAI({
      systemPrompt,
      userContent:  userPrompt,
      groqModel:    'llama-3.3-70b-versatile',
      temperature:  0.95,
      maxTokens:    800,
    });

    const parsed = safeParseJSON(text);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Response was not a valid array');
    }

    const result = { questions: parsed };
    setCache(cacheKey, result);
    console.log(`✅ Questions served by ${provider}`);
    logAIUsage({ userKey, route: 'questions', provider, success: true, latencyMs: Date.now() - t0 });
    return Response.json(result, { status: 200 });
  } catch (err) {
    logAIUsage({ userKey, route: 'questions', provider: 'none', success: false, latencyMs: Date.now() - t0 });
    if (err instanceof AiCapacityError) return aiCapacityResponse(err);
    console.error('Questions API error:', err);
    return Response.json({ error: 'Failed to generate questions', detail: err.message }, { status: 500 });
  }
}