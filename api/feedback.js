// api/feedback.js
// Serverless function — evaluates interview answers using Groq
// Set GROQ_API_KEY in Vercel environment variables

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// Mode-aware system prompts
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
};

export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).set(CORS_HEADERS).end();
    }

    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { question, answer, mode } = req.body;

    // Input validation
    if (!question || !answer) {
        return res.status(400).json({ error: 'question and answer are required' });
    }
    if (typeof question !== 'string' || question.length > 500) {
        return res.status(400).json({ error: 'Invalid question — max 500 characters' });
    }
    if (typeof answer !== 'string' || answer.length > 2000) {
        return res.status(400).json({ error: 'Answer too long — maximum 2000 characters' });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.technical;

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
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: `Interview type: ${mode || 'technical'}\nQuestion: ${question}\nAnswer: ${answer}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 600
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
        } catch (parseErr) {
            // Truncated or malformed JSON — return a graceful fallback
            return res.status(200).json({
                score: 5,
                accuracy: 50,
                clarity: 50,
                depth: 50,
                feedback: 'Feedback could not be fully parsed. Please try again.',
                scoreReason: 'Response was truncated.',
                idealAnswer: ''
            });
        }

        return res.status(200).json(parsed);
    } catch (err) {
        console.error('Feedback API error:', err);
        return res.status(500).json({ error: 'Failed to get feedback', detail: err.message });
    }
}
