// Fetches history: raw answers (default) or last N sessions with avg score (?sessions=1)

export async function GET(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json([], { status: 200 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');
  const limit = parseInt(searchParams.get('limit') || '20', 10) || 20;
  const user_id = searchParams.get('user_id');
  const sessionsOnly = searchParams.get('sessions') === '1' || searchParams.get('format') === 'sessions';

  if (!user_id) {
    return Response.json({ error: 'user_id is required' }, { status: 400 });
  }

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  try {
    if (sessionsOnly) {
      const sessLimit = Math.min(Math.max(limit, 1), 30);
      let sessionUrl = `${supabaseUrl}/rest/v1/sessions?select=id,mode,created_at&user_id=eq.${encodeURIComponent(user_id)}&order=created_at.desc&limit=${sessLimit}`;
      if (mode) {
        sessionUrl += `&mode=eq.${encodeURIComponent(mode)}`;
      }

      const sessionRes = await fetch(sessionUrl, { headers });
      if (!sessionRes.ok) throw new Error(await sessionRes.text());
      const sessionJson = await sessionRes.json();
      const sessions = Array.isArray(sessionJson) ? sessionJson : [];
      if (sessions.length === 0) {
        return Response.json({ sessions: [] }, { status: 200 });
      }

      const ids = sessions.map((s) => s.id).filter(Boolean);
      const inList = ids.join(',');
      const answersUrl = `${supabaseUrl}/rest/v1/answers?select=session_id,score&session_id=in.(${inList})`;

      const answersRes = await fetch(answersUrl, { headers });
      if (!answersRes.ok) throw new Error(await answersRes.text());
      const ansJson = await answersRes.json();
      const ansRows = Array.isArray(ansJson) ? ansJson : [];

      const bySession = {};
      for (const row of ansRows) {
        const sid = row.session_id;
        if (!sid) continue;
        if (!bySession[sid]) bySession[sid] = [];
        if (typeof row.score === 'number') bySession[sid].push(row.score);
      }

      const out = sessions.map((s) => {
        const scores = bySession[s.id] || [];
        const avg =
          scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        return {
          session_id: s.id,
          mode: s.mode,
          created_at: s.created_at,
          avg_score: avg != null ? Math.round(avg * 10) / 10 : null,
          answer_count: scores.length,
        };
      });

      return Response.json({ sessions: out }, { status: 200 });
    }

    let sessionUrl = `${supabaseUrl}/rest/v1/sessions?select=id,mode,created_at&user_id=eq.${encodeURIComponent(user_id)}&order=created_at.desc&limit=80`;
    if (mode) {
      sessionUrl += `&mode=eq.${encodeURIComponent(mode)}`;
    }

    const sessionRes = await fetch(sessionUrl, { headers });
    if (!sessionRes.ok) throw new Error(await sessionRes.text());
    const sessions = await sessionRes.json();
    const sessionList = Array.isArray(sessions) ? sessions : [];
    if (sessionList.length === 0) {
      return Response.json([], { status: 200 });
    }

    const sessionMap = Object.fromEntries(sessionList.map((s) => [s.id, s]));
    const ids = sessionList.map((s) => s.id).filter(Boolean);
    if (ids.length === 0) {
      return Response.json([], { status: 200 });
    }

    const inList = ids.join(',');
    const answersUrl = `${supabaseUrl}/rest/v1/answers?select=id,session_id,question,answer,score,accuracy,clarity,depth,feedback,created_at&session_id=in.(${inList})&order=created_at.desc&limit=${limit}`;

    const answersRes = await fetch(answersUrl, { headers });
    if (!answersRes.ok) throw new Error(await answersRes.text());
    const answers = await answersRes.json();
    const rows = Array.isArray(answers) ? answers : [];

    const mapped = rows.map((row) => {
      const sess = sessionMap[row.session_id] || {};
      return {
        id: row.id,
        session_id: row.session_id,
        question: row.question,
        score: row.score,
        accuracy: row.accuracy,
        clarity: row.clarity,
        depth: row.depth,
        feedback: row.feedback,
        mode: sess.mode,
        created_at: row.created_at || sess.created_at,
      };
    });

    return Response.json(mapped, { status: 200 });
  } catch (err) {
    console.error('Supabase fetch error:', err);
    return Response.json(
      { error: 'Failed to fetch history', detail: err.message },
      { status: 500 }
    );
  }
}
