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

class MalformedJSONError extends Error {
  constructor(message, diagnostic) {
    super(message);
    this.name = 'MalformedJSONError';
    this.diagnostic = diagnostic;
  }
}

function safeParseJSON(aiResult) {
  const { text, provider, rawData, status, model, finishReason } = aiResult;
  
  if (!text) {
    throw new MalformedJSONError('Empty response text', { provider, model, finishReason, status, rawResponse: rawData, extractedText: text, parserFailureReason: 'No text extracted' });
  }

  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();

  let startIndex = -1;
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === '{' || clean[i] === '[') {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) {
    throw new MalformedJSONError('No valid JSON start character found', { provider, model, finishReason, status, rawResponse: rawData, extractedText: text, parserFailureReason: 'Missing { or [' });
  }

  let stack = [];
  let inString = false;
  let escape = false;
  let endIndex = -1;

  for (let i = startIndex; i < clean.length; i++) {
    const char = clean[i];
    if (inString) {
      if (escape) escape = false;
      else if (char === '\\') escape = true;
      else if (char === '"') inString = false;
    } else {
      if (char === '"') inString = true;
      else if (char === '{' || char === '[') stack.push(char);
      else if (char === '}' || char === ']') {
        const last = stack.pop();
        if ((char === '}' && last !== '{') || (char === ']' && last !== '[')) {
          throw new MalformedJSONError('Mismatched JSON braces/brackets', { provider, model, finishReason, status, rawResponse: rawData, extractedText: text, parserFailureReason: `Mismatched ${char} at index ${i}` });
        }
        if (stack.length === 0) {
          endIndex = i;
          break;
        }
      }
    }
  }

  if (endIndex === -1) {
    throw new MalformedJSONError('Unterminated JSON structure', { provider, model, finishReason, status, rawResponse: rawData, extractedText: text, parserFailureReason: 'End of string reached before JSON closed' });
  }

  const jsonStr = clean.substring(startIndex, endIndex + 1);

  // Normalize literal newlines in strings, dropping control chars, preserving escapes
  let normalized = '';
  inString = false;
  escape = false;
  
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (inString) {
      if (escape) {
        normalized += char;
        escape = false;
      } else if (char === '\\') {
        normalized += char;
        escape = true;
      } else if (char === '"') {
        normalized += char;
        inString = false;
      } else if (char === '\n') {
        normalized += '\\n';
      } else if (char === '\r') {
        normalized += '\\r';
      } else if (char === '\t') {
        normalized += '\\t';
      } else {
        const code = char.charCodeAt(0);
        if (code >= 32) normalized += char;
      }
    } else {
      if (char === '"') inString = true;
      normalized += char;
    }
  }

  try {
    return JSON.parse(normalized);
  } catch (err) {
    throw new MalformedJSONError('SyntaxError during JSON.parse', { provider, model, finishReason, status, rawResponse: rawData, extractedText: text, parserFailureReason: err.message, exactStringPassed: normalized });
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

  const { mode, pack, resumeText, role, persona: personaRaw, user_id, difficulty = 'Medium', history = [] } = body;

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
  const cacheKey = hashRequest({ mode, pack, role, persona: normalizePersona(personaRaw), resumeText: (resumeText || '').slice(0, 50), difficulty, history: history.join(',') });
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

  if (mode === 'coding') {
    const systemPrompt = `You are an expert coding interview author. Generate exactly 1 algorithmic problem as a JSON array ONLY (no markdown).
The array must contain exactly 1 element. The element must be an object with these keys:
- "title": string
- "difficulty": "Easy" | "Medium" | "Hard"
- "description": string (concise problem statement)
- "constraints": array of strings
- "examples": array of objects {"input": string, "output": string}
- "visibleTests": array of exactly 2 objects {"input": string, "output": string}
- "hiddenTests": array of exactly 2 objects {"input": string, "output": string}
- "functionSignature": string (e.g., "def twoSum(nums: List[int], target: int) -> List[int]:")

Keep descriptions and strings as short and concise as possible to save tokens. Do not include templates or explanations.
No plagiarism — original statements.${personaBlock}`;

    let userPrompt = `Generate 1 concise coding problem for a ${roleLabel} interview. The difficulty MUST be: ${difficulty}.`;
    
    if (history && history.length > 0) {
      userPrompt += `\nDo NOT generate any problems related to these previously covered topics/titles: ${history.join(', ')}. Ensure the new problem is unique and uses a different topic (e.g. arrays, strings, dynamic programming, etc).`;
    } else {
      userPrompt += `\nSelect a standard coding interview topic (e.g. arrays, strings, dynamic programming, etc).`;
    }

    if (safeResume.trim().length > 50) {
      userPrompt += `\n\nCandidate background (tailor the problem if possible):\n${safeResume}`;
    }

    try {
      const aiResult = await callAI({
        systemPrompt,
        userContent: userPrompt,
        groqModel:   'llama-3.1-8b-instant',
        temperature: 0.75,
        maxTokens:   8192,
      });

      const parsed = safeParseJSON(aiResult);
      const provider = aiResult.provider;
      parsed.forEach((p) => { if (!p.templates) p.templates = starterTemplates; });

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Response was not a valid array');
      }

      const result = { problems: parsed.slice(0, 1) };
      setCache(cacheKey, result);
      console.log(`✅ Questions (coding) served by ${provider}`);
      logAIUsage({ userKey, route: 'questions/coding', provider, success: true, latencyMs: Date.now() - t0 });
      return Response.json(result, { status: 200 });
    } catch (err) {
      logAIUsage({ userKey, route: 'questions/coding', provider: 'none', success: false, latencyMs: Date.now() - t0 });
      if (err instanceof AiCapacityError) return aiCapacityResponse(err);
      
      if (err.name === 'MalformedJSONError') {
        console.error('Questions (coding) API Malformed JSON:', JSON.stringify(err.diagnostic, null, 2));
        return Response.json(
          { error: 'Failed to generate coding problems', detail: 'Received malformed JSON from AI provider', diagnostic: err.diagnostic },
          { status: 500 }
        );
      }

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
    const aiResult = await callAI({
      systemPrompt,
      userContent:  userPrompt,
      groqModel:    'llama-3.3-70b-versatile',
      temperature:  0.95,
      maxTokens:    2500,
    });

    const parsed = safeParseJSON(aiResult);
    const provider = aiResult.provider;
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
    
    if (err.name === 'MalformedJSONError') {
      console.error('Questions API Malformed JSON:', JSON.stringify(err.diagnostic, null, 2));
      return Response.json(
        { error: 'Failed to generate questions', detail: 'Received malformed JSON from AI provider', diagnostic: err.diagnostic },
        { status: 500 }
      );
    }

    console.error('Questions API error:', err);
    return Response.json({ error: 'Failed to generate questions', detail: err.message }, { status: 500 });
  }
}