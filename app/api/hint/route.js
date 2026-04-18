// Dedicated hint endpoint — concise pointer without full solution

const MAX_Q = 12000;

export async function POST(request) {
  const body = await request.json();
  const { question, mode, role } = body;

  if (!question || typeof question !== 'string' || question.length > MAX_Q) {
    return Response.json({ error: `Valid question is required (max ${MAX_Q} chars)` }, { status: 400 });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return Response.json({ error: 'API key not configured' }, { status: 500 });
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

  if (roleLabel) {
    modeHint += ` Context: interview for ${roleLabel}.`;
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a helpful interview coach giving a single, concise hint.
Do NOT give away the full answer — just point the candidate in the right direction.
${modeHint}
Respond ONLY with a JSON object: {"hint":"Your one or two sentence hint here."}`,
          },
          {
            role: 'user',
            content: `Give me a hint for this interview question / problem:\n${question}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 200,
      }),
    });

    const data = await groqRes.json();

    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response from LLM');
    }

    const text = data.choices[0].message.content;
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
  } catch (err) {
    console.error('Hint API error:', err);
    return Response.json({ error: 'Failed to get hint', detail: err.message }, { status: 500 });
  }
}
