// Evaluates interview answers / code submissions
// Primary: Groq | Fallback: Google Gemini Flash

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_REST_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
/** Unversioned flash IDs are often retired; try current IDs until one works. */
const GEMINI_MODEL_TRY_ORDER = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash-001',
  'gemini-3-flash-preview',
];

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
  const p = normalizePersona(persona);
  const add = PERSONA_FEEDBACK_ADDENDUM[p];
  if (!add) return base;
  return `${base}\n\n${add}`;
}

const MAX_QUESTION = 12000;
const MAX_ANSWER = 50000;

function parseResponse(text) {
  let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const firstBrace = cleanText.indexOf('{');
  const lastBrace = cleanText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleanText = cleanText.substring(firstBrace, lastBrace + 1);
  }
  cleanText = cleanText.replace(/\\([^"\\/bfnrtu])/g, '$1');
  cleanText = cleanText.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return JSON.parse(cleanText);
}

// ── Groq call ────────────────────────────────────────────────────────
async function callGroq(systemPrompt, userContent) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY not set');

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (res.status === 429) throw Object.assign(new Error('Groq rate limit'), { status: 429 });

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('No text from Groq');
  return text;
}

function geminiExtractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('');
}

function geminiShouldTryNextModel(res, errorMessage) {
  if (res.status === 404) return true;
  const m = String(errorMessage || '');
  return /not found|is not found|does not exist|was not found|UNAVAILABLE_MODEL|MODEL_NOT_FOUND/i.test(m);
}

// ── Gemini call ──────────────────────────────────────────────────────
async function callGemini(systemPrompt, userContent) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error('GEMINI_API_KEY not set');

  const generationConfig = { temperature: 0.3, maxOutputTokens: 800 };
  let lastError = '';

  for (const modelId of GEMINI_MODEL_TRY_ORDER) {
    const res = await fetch(`${GEMINI_REST_BASE}/${modelId}:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig,
      }),
    });

    if (res.status === 429) throw Object.assign(new Error('Gemini rate limit'), { status: 429 });

    const data = await res.json();
    console.log(`Gemini (${modelId}):`, JSON.stringify(data).slice(0, 500));

    const errMsg = data?.error?.message || '';

    if (!res.ok) {
      lastError = `Gemini HTTP ${res.status} (${modelId}): ${errMsg || JSON.stringify(data).slice(0, 300)}`;
      if (geminiShouldTryNextModel(res, errMsg)) continue;
      throw new Error(lastError);
    }

    const text = geminiExtractText(data);
    if (text) return text;

    const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback || '';
    lastError =
      'No text from Gemini (' +
      modelId +
      ')' +
      (reason ? ` (${JSON.stringify(reason).slice(0, 200)})` : '') +
      ': ' +
      JSON.stringify(data).slice(0, 400);
  }

  throw new Error(lastError || 'All Gemini models failed');
}

export async function POST(request) {
  const body = await request.json();
  const { question, answer, mode, role, persona: personaRaw } = body;

  if (!question || !answer) {
    return Response.json({ error: 'question and answer are required' }, { status: 400 });
  }
  if (typeof question !== 'string' || question.length > MAX_QUESTION) {
    return Response.json({ error: `Invalid question — max ${MAX_QUESTION} characters` }, { status: 400 });
  }
  if (typeof answer !== 'string' || answer.length > MAX_ANSWER) {
    return Response.json({ error: `Answer too long — maximum ${MAX_ANSWER} characters` }, { status: 400 });
  }

  const persona = normalizePersona(personaRaw);
  const systemPrompt = buildFeedbackSystem(mode, persona);
  const roleLabel = typeof role === 'string' && role.trim() ? role.trim() : 'Software Engineer';

  const userContent = `Interview type: ${mode || 'technical'}
Target role: ${roleLabel}
Interviewer persona: ${persona}
Question / problem statement:
${question}

Candidate answer / code:
${answer}`;

  let text;

  // Try Groq first, fallback to Gemini on rate limit or error
  try {
    text = await callGroq(systemPrompt, userContent);
    console.log('✅ Feedback served by Groq');
  } catch (groqErr) {
    console.warn('⚠️ Groq failed:', groqErr.message, '— trying Gemini...');
    try {
      text = await callGemini(systemPrompt, userContent);
      console.log('✅ Feedback served by Gemini (fallback)');
    } catch (geminiErr) {
      console.error('❌ Both APIs failed:', geminiErr.message);
      return Response.json({ error: 'All AI providers failed', detail: geminiErr.message }, { status: 500 });
    }
  }

  try {
    const parsed = parseResponse(text);
    return Response.json(parsed, { status: 200 });
  } catch (parseErr) {
    return Response.json(
      {
        score: 5,
        accuracy: 50,
        clarity: 50,
        depth: 50,
        feedback: 'Feedback could not be fully parsed. Please try again.',
        scoreReason: 'Response was truncated.',
        idealAnswer: '',
      },
      { status: 200 }
    );
  }
}