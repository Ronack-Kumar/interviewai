// api/get-history.js
// Fetches session history from Supabase — filtered by user_id for privacy
// Set SUPABASE_URL and SUPABASE_SERVICE_KEY in Vercel environment variables

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        return res.status(200).set(CORS_HEADERS).end();
    }

    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        // Supabase not configured — return empty history so the app still works
        return res.status(200).json([]);
    }

    const { mode, limit = 20, user_id } = req.query;

    // user_id is required — refuse to return all users' data
    if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    let url = `${supabaseUrl}/rest/v1/sessions?select=id,mode,question,score,accuracy,clarity,depth,feedback,created_at&order=created_at.desc&limit=${encodeURIComponent(limit)}&user_id=eq.${encodeURIComponent(user_id)}`;
    if (mode) url += `&mode=eq.${encodeURIComponent(mode)}`;

    try {
        const response = await fetch(url, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        return res.status(200).json(data);
    } catch (err) {
        console.error('Supabase fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch history', detail: err.message });
    }
}
