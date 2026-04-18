// Saves feedback to Supabase and optionally emails via Resend

export async function POST(request) {
  const body = await request.json();
  const { type, description, email, user_id } = body;

  if (!description || typeof description !== 'string' || description.trim().length < 3) {
    return Response.json({ error: 'Description is required' }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  const headers = {
    'Content-Type': 'application/json',
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    Prefer: 'return=minimal',
  };

  if (supabaseUrl && supabaseKey) {
    const insert = {
      type: typeof type === 'string' ? type.slice(0, 80) : 'general',
      description: description.slice(0, 8000),
      email: typeof email === 'string' ? email.slice(0, 320) : null,
      user_id: typeof user_id === 'string' ? user_id : null,
      created_at: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/feedback`, {
        method: 'POST',
        headers,
        body: JSON.stringify(insert),
      });
      if (!res.ok) {
        console.warn('feedback insert', await res.text());
      }
    } catch (e) {
      console.warn('feedback insert error', e);
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'MockPrep <onboarding@resend.dev>',
          to: ['raunackbhardwaj@gmail.com'],
          subject: `[MockPrep Feedback] ${type || 'general'}`,
          text: `Type: ${type}\nEmail: ${email || '(none)'}\nUser: ${user_id || '(anon)'}\n\n${description}`,
        }),
      });
    } catch (e) {
      console.warn('Resend email failed', e);
    }
  }

  return Response.json({ ok: true }, { status: 200 });
}
