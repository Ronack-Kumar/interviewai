// Logs anti-cheat / paste violations to Supabase violations table

export async function POST(request) {
  const body = await request.json();
  const { user_id, type, detail } = body;

  if (!user_id || typeof user_id !== 'string') {
    return Response.json({ error: 'user_id is required' }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ ok: true, logged: false }, { status: 200 });
  }

  const headers = {
    'Content-Type': 'application/json',
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    Prefer: 'return=minimal',
  };

  const payloadA = {
    user_id,
    type: typeof type === 'string' ? type.slice(0, 120) : 'paste',
    detail: typeof detail === 'string' ? detail.slice(0, 2000) : '',
    created_at: new Date().toISOString(),
  };

  try {
    let res = await fetch(`${supabaseUrl}/rest/v1/violations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payloadA),
    });
    if (res.ok) {
      return Response.json({ ok: true, logged: true }, { status: 200 });
    }

    const payloadB = {
      user_id,
      violation_type: payloadA.type,
      description: payloadA.detail,
      created_at: payloadA.created_at,
    };
    res = await fetch(`${supabaseUrl}/rest/v1/violations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payloadB),
    });
    if (res.ok) {
      return Response.json({ ok: true, logged: true }, { status: 200 });
    }

    console.warn('violations insert failed:', await res.text());
    return Response.json({ ok: true, logged: false }, { status: 200 });
  } catch (e) {
    console.error('log-violation', e);
    return Response.json({ ok: true, logged: false }, { status: 200 });
  }
}
