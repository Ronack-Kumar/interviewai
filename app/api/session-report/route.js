// Returns one session + its answers for the report page (user must own session)

export async function GET(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ error: 'Server not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const session_id = searchParams.get('session_id');
  const user_id = searchParams.get('user_id');

  if (!session_id || !user_id) {
    return Response.json({ error: 'session_id and user_id are required' }, { status: 400 });
  }

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  try {
    const sessUrl = `${supabaseUrl}/rest/v1/sessions?id=eq.${encodeURIComponent(session_id)}&user_id=eq.${encodeURIComponent(user_id)}&select=id,mode,created_at,user_id`;
    const sessRes = await fetch(sessUrl, { headers });
    if (!sessRes.ok) throw new Error(await sessRes.text());
    const sessRows = await sessRes.json();
    if (!Array.isArray(sessRows) || sessRows.length === 0) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessRows[0];

    const ansUrl = `${supabaseUrl}/rest/v1/answers?session_id=eq.${encodeURIComponent(session_id)}&select=id,question,answer,score,accuracy,clarity,depth,feedback,ideal_answer,time_taken_seconds,created_at&order=created_at.asc`;
    const ansRes = await fetch(ansUrl, { headers });
    if (!ansRes.ok) throw new Error(await ansRes.text());
    const answers = await ansRes.json();
    const list = Array.isArray(answers) ? answers : [];

    return Response.json({ session, answers: list }, { status: 200 });
  } catch (err) {
    console.error('session-report error:', err);
    return Response.json(
      { error: 'Failed to load session', detail: err.message },
      { status: 500 }
    );
  }
}
