// Session-level hiring verdict — Groq first, Gemini model chain fallback (same pattern as feedback)

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_REST_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL_TRY_ORDER = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash-001',
  'gemini-3-flash-preview',
];

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

const VERDICTS = new Set(['Strong Hire', 'Hire', 'Borderline', 'No Hire', 'Strong No Hire']);
const RATINGS = new Set(['Strong', 'Good', 'Weak']);
const MAX_ANSWERS = 20;
const MAX_Q = 12000;
const MAX_A = 50000;

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

function clampDim(obj) {
  if (!obj || typeof obj !== 'object') return { rating: 'Good', comment: '' };
  const rating = RATINGS.has(obj.rating) ? obj.rating : 'Good';
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
  let overall = Number(parsed?.overall_score);
  if (!Number.isFinite(overall)) overall = 5;
  overall = Math.min(10, Math.max(1, overall));
  const keyStrength =
    optSentence(parsed?.key_strength, 800) ?? optSentence(parsed?.keyStrength, 800);
  const criticalWeakness =
    optSentence(parsed?.critical_weakness, 800) ?? optSentence(parsed?.criticalWeakness, 800);
  return {
    verdict,
    overall_score: overall,
    communication: clampDim(parsed?.communication),
    technical_depth: clampDim(parsed?.technical_depth),
    confidence: clampDim(parsed?.confidence),
    summary: typeof parsed?.summary === 'string' ? parsed.summary.trim().slice(0, 1200) : '',
    ...(keyStrength ? { key_strength: keyStrength } : {}),
    ...(criticalWeakness ? { critical_weakness: criticalWeakness } : {}),
  };
}

async function callGroq(userContent) {
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
        { role: 'system', content: HIRING_SYSTEM },
        { role: 'user', content: userContent },
      ],
      temperature: 0.35,
      max_tokens: 1200,
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

async function callGemini(userContent) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error('GEMINI_API_KEY not set');

  const generationConfig = { temperature: 0.35, maxOutputTokens: 1200 };
  let lastError = '';

  for (const modelId of GEMINI_MODEL_TRY_ORDER) {
    const res = await fetch(`${GEMINI_REST_BASE}/${modelId}:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: HIRING_SYSTEM }] },
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

export async function POST(request) {
  const body = await request.json();
  const { answers, mode, role } = body;

  if (!Array.isArray(answers) || answers.length === 0) {
    return Response.json({ error: 'answers must be a non-empty array' }, { status: 400 });
  }
  if (answers.length > MAX_ANSWERS) {
    return Response.json({ error: `At most ${MAX_ANSWERS} answers allowed` }, { status: 400 });
  }

  for (let i = 0; i < answers.length; i++) {
    const row = answers[i];
    if (!row || typeof row !== 'object') {
      return Response.json({ error: `Invalid answer at index ${i}` }, { status: 400 });
    }
    if (typeof row.question !== 'string' || !row.question.trim()) {
      return Response.json({ error: `question required at index ${i}` }, { status: 400 });
    }
    if (typeof row.answer !== 'string') {
      return Response.json({ error: `answer must be a string at index ${i}` }, { status: 400 });
    }
    if (row.question.length > MAX_Q || row.answer.length > MAX_A) {
      return Response.json({ error: `question or answer too long at index ${i}` }, { status: 400 });
    }
    if (row.score != null && typeof row.score !== 'number') {
      return Response.json({ error: `score must be a number or null at index ${i}` }, { status: 400 });
    }
  }

  const roleLabel = typeof role === 'string' && role.trim() ? role.trim() : 'Software Engineer';
  const modeLabel = typeof mode === 'string' && mode.trim() ? mode.trim() : 'technical';

  const compact = answers.map((a, idx) => ({
    n: idx + 1,
    question: a.question.slice(0, MAX_Q),
    answer: a.answer.slice(0, MAX_A),
    score: typeof a.score === 'number' && Number.isFinite(a.score) ? a.score : null,
  }));

  const userContent = `Interview type: ${modeLabel}
Target role: ${roleLabel}

Per-question performance (JSON array — use scores as signals; read answers for substance):
${JSON.stringify(compact)}`;

  let text;
  try {
    text = await callGroq(userContent);
    console.log('✅ Hiring decision served by Groq');
  } catch (groqErr) {
    console.warn('⚠️ Groq failed:', groqErr.message, '— trying Gemini...');
    try {
      text = await callGemini(userContent);
      console.log('✅ Hiring decision served by Gemini (fallback)');
    } catch (geminiErr) {
      console.error('❌ Both APIs failed:', geminiErr.message);
      return Response.json({ error: 'All AI providers failed', detail: geminiErr.message }, { status: 500 });
    }
  }

  try {
    const parsed = parseResponse(text);
    return Response.json(normalizeHiring(parsed), { status: 200 });
  } catch {
    return Response.json(
      normalizeHiring({
        verdict: 'Borderline',
        overall_score: 5,
        communication: { rating: 'Good', comment: 'Could not parse model output.' },
        technical_depth: { rating: 'Good', comment: 'Could not parse model output.' },
        confidence: { rating: 'Good', comment: 'Could not parse model output.' },
        summary: 'The hiring model returned invalid JSON. Please try again.',
      }),
      { status: 200 }
    );
  }
}
