// Dedicated hint endpoint — concise pointer without full solution
// Primary: Groq | Fallback: Google Gemini Flash

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const MAX_Q = 12000;

// ── Groq call ────────────────────────────────────────────────────────
async function callGroq(systemPrompt, userContent) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
      max_tokens: 200,
    }),
  });

  if (res.status === 429) throw Object.assign(new Error('Groq rate limit'), { status: 429 });

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('No text from Groq');
  return text;
}

// ── Gemini call ──────────────────────────────────────────────────────
async function callGemini(systemPrompt, userContent) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');

  const res = await fetch(`${GEMINI_API_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userContent }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 200 },
    }),
  });

  if (res.status === 429) throw Object.assign(new Error('Gemini rate limit'), { status: 429 });

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text from Gemini');
  return text;
}

export async function POST(request) {
  const body = await request.json();
  const { question, mode, role } = body;

  if (!question || typeof question !== 'string' || question.length > MAX_Q) {
    return Response.json({ error: `Valid question is required (max ${MAX_Q} chars)` }, { status: 400 });
  }

  const roleLabel = typeof role === 'string' && role.trim() ? role.trim() : '';

  let modeHint =
    mode === 'hr'
      ? 'Think about structuring your answer using the STAR method (Situation, Task, Action, Result).'
      : mode === 'case'
        ? 'Consider starting with a framework or structure before diving into specifics.'
        : mode === 'coding'
          ? 'Give a hint about algorithm pattern, data structure, or edge cases — do NOT reveal full working code.'
          : 'Think about the core concept, edge cases, and trade-offs.';

  if (roleLabel) modeHint += ` Context: interview for ${roleLabel}.`;

  const systemPrompt = `You are a helpful interview coach giving a single, concise hint.
Do NOT give away the full answer — just point the candidate in the right direction.
${modeHint}
Respond ONLY with a JSON object: {"hint":"Your one or two sentence hint here."}`;

  const userContent = `Give me a hint for this interview question / problem:\n${question}`;

  let text;

  // Try Groq first, fallback to Gemini
  try {
    text = await callGroq(systemPrompt, userContent);
    console.log('✅ Hint served by Groq');
  } catch (groqErr) {
    console.warn('⚠️ Groq failed:', groqErr.message, '— trying Gemini...');
    try {
      text = await callGemini(systemPrompt, userContent);
      console.log('✅ Hint served by Gemini (fallback)');
    } catch (geminiErr) {
      console.error('❌ Both APIs failed:', geminiErr.message);
      return Response.json({ error: 'Failed to get hint', detail: geminiErr.message }, { status: 500 });
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    parsed = { hint: text.trim() };
  }

  return Response.json(
    { hint: parsed.hint || 'Consider the key concepts and think about real examples.' },
    { status: 200 }
  );
}