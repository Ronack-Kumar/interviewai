// Evaluates interview answers / code submissions using Groq

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

const MAX_QUESTION = 12000;
const MAX_ANSWER = 50000;

export async function POST(request) {
  const body = await request.json();
  const { question, answer, mode, role } = body;

  if (!question || !answer) {
    return Response.json({ error: 'question and answer are required' }, { status: 400 });
  }
  if (typeof question !== 'string' || question.length > MAX_QUESTION) {
    return Response.json({ error: `Invalid question — max ${MAX_QUESTION} characters` }, { status: 400 });
  }
  if (typeof answer !== 'string' || answer.length > MAX_ANSWER) {
    return Response.json({ error: `Answer too long — maximum ${MAX_ANSWER} characters` }, { status: 400 });
  }

  const groqKey = process.env.GEMINI_API_KEY;
  if (!groqKey) {
    return Response.json({ error: 'API key not configured' }, { status: 500 });
  }

  const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.technical;
  const roleLabel = typeof role === 'string' && role.trim() ? role.trim() : 'Software Engineer';

  const userContent = `Interview type: ${mode || 'technical'}
Target role: ${roleLabel}
Question / problem statement:
${question}

Candidate answer / code:
${answer}`;

  try {
    const groqRes = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.0-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 800,
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

    return Response.json(parsed, { status: 200 });
  } catch (err) {
    console.error('Feedback API error:', err);
    return Response.json({ error: 'Failed to get feedback', detail: err.message }, { status: 500 });
  }
}
