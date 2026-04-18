// Saves interview answers: one session per run; optional session_id continues same session

const VALID_MODES = ['technical', 'hr', 'case', 'stress', 'coding'];

const MAX_Q = 12000;
const MAX_ANS = 50000;

export async function POST(request) {
  const body = await request.json();
  const {
    mode,
    question,
    answer,
    score,
    accuracy,
    clarity,
    depth,
    feedback,
    user_id,
    session_id: incomingSessionId,
    time_taken_seconds,
    ideal_answer: idealAnswer,
  } = body;

  if (!user_id || typeof user_id !== 'string') {
    return Response.json({ error: 'user_id is required' }, { status: 400 });
  }

  if (!mode || !VALID_MODES.includes(mode)) {
    return Response.json({ error: 'Invalid mode' }, { status: 400 });
  }
  if (!question || typeof question !== 'string' || question.length > MAX_Q) {
    return Response.json({ error: 'Invalid question' }, { status: 400 });
  }
  if (!answer || typeof answer !== 'string' || answer.length > MAX_ANS) {
    return Response.json({ error: 'Invalid answer' }, { status: 400 });
  }
  if (score !== undefined && score !== null && (typeof score !== 'number' || score < 1 || score > 10)) {
    return Response.json({ error: 'Score must be between 1 and 10' }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ success: true, saved: false, reason: 'Supabase not configured' }, { status: 200 });
  }

  const baseHeaders = {
    'Content-Type': 'application/json',
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  const tts =
    typeof time_taken_seconds === 'number' && time_taken_seconds >= 0 && time_taken_seconds < 86400
      ? Math.round(time_taken_seconds)
      : null;
  const ideal =
    typeof idealAnswer === 'string' && idealAnswer.length > 0
      ? idealAnswer.slice(0, 20000)
      : null;

  try {
    let sessionId =
      typeof incomingSessionId === 'string' && incomingSessionId.trim()
        ? incomingSessionId.trim()
        : null;

    if (sessionId) {
      const verifyUrl = `${supabaseUrl}/rest/v1/sessions?id=eq.${encodeURIComponent(sessionId)}&user_id=eq.${encodeURIComponent(user_id)}&select=id`;
      const verifyRes = await fetch(verifyUrl, { headers: baseHeaders });
      if (!verifyRes.ok) throw new Error(await verifyRes.text());
      const verifyRows = await verifyRes.json();
      if (!Array.isArray(verifyRows) || verifyRows.length === 0) {
        sessionId = null;
      }
    } else {
      sessionId = null;
    }

    if (!sessionId) {
      const sessionRes = await fetch(`${supabaseUrl}/rest/v1/sessions`, {
        method: 'POST',
        headers: {
          ...baseHeaders,
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          user_id,
          mode,
          created_at: new Date().toISOString(),
        }),
      });

      if (!sessionRes.ok) {
        const err = await sessionRes.text();
        throw new Error(err || 'Failed to create session');
      }

      const sessionRows = await sessionRes.json();
      sessionId = Array.isArray(sessionRows) ? sessionRows[0]?.id : sessionRows?.id;
      if (!sessionId) {
        throw new Error('No session id returned');
      }
    }

    const answerPayload = {
      session_id: sessionId,
      question,
      answer,
      score,
      accuracy: accuracy ?? null,
      clarity: clarity ?? null,
      depth: depth ?? null,
      feedback: feedback ?? null,
      created_at: new Date().toISOString(),
    };

    if (tts != null) answerPayload.time_taken_seconds = tts;
    if (ideal != null) answerPayload.ideal_answer = ideal;

    const answerRes = await fetch(`${supabaseUrl}/rest/v1/answers`, {
      method: 'POST',
      headers: {
        ...baseHeaders,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(answerPayload),
    });

    if (!answerRes.ok) {
      const errText = await answerRes.text();
      const lower = errText.toLowerCase();
      if (lower.includes('time_taken') || lower.includes('ideal_answer') || lower.includes('column')) {
        const fallbackPayload = { ...answerPayload };
        delete fallbackPayload.time_taken_seconds;
        delete fallbackPayload.ideal_answer;
        const retry = await fetch(`${supabaseUrl}/rest/v1/answers`, {
          method: 'POST',
          headers: {
            ...baseHeaders,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(fallbackPayload),
        });
        if (!retry.ok) throw new Error(await retry.text() || 'Failed to save answer');
      } else {
        throw new Error(errText || 'Failed to save answer');
      }
    }

    return Response.json({ success: true, saved: true, session_id: sessionId }, { status: 200 });
  } catch (err) {
    console.error('Supabase save error:', err);
    return Response.json(
      { error: 'Failed to save session', detail: err.message },
      { status: 500 }
    );
  }
}
