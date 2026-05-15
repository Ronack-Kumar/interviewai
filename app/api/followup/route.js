// Adaptive follow-up question — Groq first, Gemini model chain fallback (same pattern as feedback)

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_REST_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL_TRY_ORDER = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash-001',
  'gemini-3-flash-preview',
];

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
  const p = normalizePersona(persona);
  const voice = PERSONA_FOLLOWUP_VOICE[p];
  if (!voice) return FOLLOWUP_CORE;
  return `${FOLLOWUP_CORE}\n\n${voice}`;
}

const MAX_QUESTION = 12000;
const MAX_ANSWER = 50000;

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
      temperature: 0.4,
      max_tokens: 256,
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

async function callGemini(systemPrompt, userContent) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error('GEMINI_API_KEY not set');

  const generationConfig = { temperature: 0.4, maxOutputTokens: 256 };
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

function normalizeFollowup(text) {
  if (typeof text !== 'string') return '';
  let t = text.replace(/^["'`]+|["'`]+$/g, '').trim();
  t = t.replace(/^(follow[-\s]?up|question)\s*:\s*/i, '').trim();
  return t.slice(0, 2000);
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
  const systemPrompt = buildFollowupSystem(persona);
  const roleLabel = typeof role === 'string' && role.trim() ? role.trim() : 'Software Engineer';

  const userContent = `Interview type: ${mode || 'technical'}
Target role: ${roleLabel}
Interviewer persona: ${persona}
Question:
${question}

Candidate answer:
${answer}`;

  let text;

  try {
    text = await callGroq(systemPrompt, userContent);
    console.log('✅ Follow-up served by Groq');
  } catch (groqErr) {
    console.warn('⚠️ Groq failed:', groqErr.message, '— trying Gemini...');
    try {
      text = await callGemini(systemPrompt, userContent);
      console.log('✅ Follow-up served by Gemini (fallback)');
    } catch (geminiErr) {
      console.error('❌ Both APIs failed:', geminiErr.message);
      return Response.json({ error: 'All AI providers failed', detail: geminiErr.message }, { status: 500 });
    }
  }

  const followup = normalizeFollowup(text);
  if (!followup) {
    return Response.json({ error: 'Empty follow-up from model' }, { status: 502 });
  }

  return Response.json({ followup }, { status: 200 });
}
