// api/hint.js
// Dedicated hint endpoint — returns a single helpful pointer without scoring
// This keeps hints out of session history and avoids prompt injection via fake answers

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        return res.status(200).set(CORS_HEADERS).end();
    }

    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { question, mode } = req.body;

    if (!question || typeof question !== 'string' || question.length > 500) {
        return res.status(400).json({ error: 'Valid question is required (max 500 chars)' });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    const modeHint = mode === 'hr'
        ? 'Think about structuring your answer using the STAR method (Situation, Task, Action, Result).'
        : mode === 'case'
            ? 'Consider starting with a framework or structure before diving into specifics.'
            : 'Think about the core concept, edge cases, and trade-offs.';

    try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful interview coach giving a single, concise hint.
Do NOT give away the full answer — just point the candidate in the right direction.
${modeHint}
Respond ONLY with a JSON object: {"hint":"Your one or two sentence hint here."}`
                    },
                    {
                        role: 'user',
                        content: `Give me a hint for this interview question: ${question}`
                    }
                ],
                temperature: 0.4,
                max_tokens: 150
            })
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
            // Fallback: return the raw text as the hint
            parsed = { hint: text.trim() };
        }

        return res.status(200).json({ hint: parsed.hint || 'Consider the key concepts and think about real examples.' });
    } catch (err) {
        console.error('Hint API error:', err);
        return res.status(500).json({ error: 'Failed to get hint', detail: err.message });
    }
}
