// api/questions.js
// Generates interview questions dynamically using Groq LLM

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { mode, pack, resumeText } = req.body;

    if (!mode) {
        return res.status(400).json({ error: 'mode is required' });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    // Build prompt based on mode, pack, and resume
    const modeDescriptions = {
        technical: 'technical software engineering interview (data structures, algorithms, system design, databases)',
        hr: 'HR and behavioral interview using the STAR method (situational, teamwork, leadership, conflict, growth)',
        case: 'case study and analytical interview (market sizing, business problem solving, frameworks)',
        stress: 'stress/pressure interview with tough follow-up questions that challenge the candidate'
    };

    const packDescriptions = {
        tcs: 'TCS (Tata Consultancy Services) — focus on Java, OOPS, DBMS, networking, SDLC, service-based company style',
        infosys: 'Infosys — focus on microservices, Agile, REST APIs, cloud, design patterns, enterprise tech',
        wipro: 'Wipro — focus on DSA basics, SQL, MVC, HTTP, recursion, end-to-end project experience',
        faang: 'FAANG/top tech companies — focus on distributed systems, large-scale design, advanced algorithms, trade-offs'
    };

    let systemPrompt = `You are an expert interview question generator. Generate exactly 8 unique, varied interview questions.
Respond ONLY with a JSON array of 8 strings (no markdown, no extra text, no numbering).
Example format: ["Question 1?","Question 2?","Question 3?","Question 4?","Question 5?","Question 6?","Question 7?","Question 8?"]
Make questions varied in difficulty and topic. Avoid repetition.`;

    let userPrompt = `Generate 8 ${modeDescriptions[mode] || 'interview'} questions`;

    if (pack && pack !== 'general' && packDescriptions[pack]) {
        userPrompt += ` specifically for a ${packDescriptions[pack]} interview`;
    }

    if (resumeText && resumeText.trim().length > 50) {
        userPrompt += `.\n\nThe candidate's resume/background:\n${resumeText.substring(0, 2000)}\n\nTailor 3-4 of the questions specifically to their experience, skills, and projects mentioned. The remaining questions should be standard ${mode} questions.`;
    } else {
        userPrompt += '.';
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
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.85,
                max_tokens: 800
            })
        });

        const data = await groqRes.json();

        if (!data.choices || !data.choices[0]) {
            throw new Error('Invalid response from LLM');
        }

        const text = data.choices[0].message.content;
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);

        if (!Array.isArray(parsed) || parsed.length === 0) {
            throw new Error('Response was not a valid array');
        }

        return res.status(200).json({ questions: parsed });
    } catch (err) {
        console.error('Questions API error:', err);
        return res.status(500).json({ error: 'Failed to generate questions', detail: err.message });
    }
}
