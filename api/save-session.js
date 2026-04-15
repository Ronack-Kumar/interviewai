// api/save-session.js
// Saves interview session results to Supabase
// Set SUPABASE_URL and SUPABASE_SERVICE_KEY in Vercel environment variables

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const VALID_MODES = ['technical', 'hr', 'case', 'stress'];

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        return res.status(200).set(CORS_HEADERS).end();
    }

    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { mode, question, answer, score, accuracy, clarity, depth, feedback, user_id } = req.body;

    // Input validation
    if (!mode || !VALID_MODES.includes(mode)) {
        return res.status(400).json({ error: 'Invalid mode' });
    }
    if (!question || typeof question !== 'string' || question.length > 500) {
        return res.status(400).json({ error: 'Invalid question' });
    }
    if (!answer || typeof answer !== 'string' || answer.length > 2000) {
        return res.status(400).json({ error: 'Invalid answer' });
    }
    if (typeof score !== 'number' || score < 1 || score > 10) {
        return res.status(400).json({ error: 'Score must be between 1 and 10' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        // Supabase not configured — silently succeed so the app still works
        return res.status(200).json({ success: true, saved: false, reason: 'Supabase not configured' });
    }

    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                mode,
                question,
                answer,
                score,
                accuracy: accuracy || null,
                clarity: clarity || null,
                depth: depth || null,
                feedback: feedback || null,
                user_id: user_id || null,
                created_at: new Date().toISOString()
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err);
        }

        return res.status(200).json({ success: true, saved: true });
    } catch (err) {
        console.error('Supabase save error:', err);
        return res.status(500).json({ error: 'Failed to save session', detail: err.message });
    }
}
