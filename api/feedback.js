// api/feedback.js
// Serverless function — API key stays on server, never exposed to frontend

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { question, answer, mode } = req.body;

    if (!question || !answer) {
        return res.status(400).json({ error: 'question and answer are required' });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

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
                        content: `You are an expert interview coach. Evaluate the candidate's answer and respond ONLY with a JSON object (no markdown, no extra text) in this exact format:\n{"score":7,"accuracy":70,"clarity":80,"depth":65,"feedback":"Your specific, actionable feedback in 2-3 sentences.","idealAnswer":"A concise model answer in 3-4 sentences."}`
                    },
                    {
                        role: 'user',
                        content: `Interview type: ${mode || 'technical'}\nQuestion: ${question}\nAnswer: ${answer}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 300
            })
        });

        const data = await groqRes.json();

        if (!data.choices || !data.choices[0]) {
            throw new Error('Invalid response');
        }

        const text = data.choices[0].message.content;
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

        return res.status(200).json(parsed);
    } catch (err) {
        console.error('API error:', err);
        return res.status(500).json({ error: 'Failed to get feedback', detail: err.message });
    }
}
