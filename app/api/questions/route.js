// Generates interview questions / coding problems
// Primary: Groq | Fallback: Google Gemini Flash

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ── Shared helpers ───────────────────────────────────────────────────
function safeParseJSON(text) {
  let clean = text.replace(/```json|```/g, '').trim();
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  clean = clean.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
  clean = clean.replace(/"([^"]*)"/g, (match) =>
    match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
  );
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (!match) throw new Error('No valid JSON found in response');
    return JSON.parse(match[1]);
  }
}

// ── Groq call ────────────────────────────────────────────────────────
async function callGroq({ model, systemPrompt, userPrompt, temperature, max_tokens }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens,
    }),
  });

  if (res.status === 429) throw Object.assign(new Error('Groq rate limit'), { status: 429 });

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('No text from Groq');
  return text;
}

// ── Gemini call ──────────────────────────────────────────────────────
async function callGemini(systemPrompt, userPrompt) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error('GEMINI_API_KEY not set');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 4096 },
      }),
    }
  );

  const data = await res.json();
  console.log('Gemini raw response:', JSON.stringify(data).slice(0, 300));
  
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text from Gemini: ' + JSON.stringify(data).slice(0, 200));
  return text;
}

// ── Smart router: try Groq, fallback to Gemini ───────────────────────
async function callAI(params) {
  try {
    const text = await callGroq(params);
    console.log('✅ Questions served by Groq');
    return text;
  } catch (groqErr) {
    console.warn('⚠️ Groq failed:', groqErr.message, '— trying Gemini...');
    const text = await callGemini(params.systemPrompt, params.userPrompt);
    console.log('✅ Questions served by Gemini (fallback)');
    return text;
  }
}

export async function POST(request) {
  const body = await request.json();
  const { mode, pack, resumeText, role } = body;

  if (!mode) {
    return Response.json({ error: 'mode is required' }, { status: 400 });
  }

  const hasGroqKey = !!process.env.GROQ_API_KEY;
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  console.log('GROQ key exists:', hasGroqKey, '| GEMINI key exists:', hasGeminiKey);

  if (!hasGroqKey && !hasGeminiKey) {
    return Response.json({ error: 'No API key configured' }, { status: 500 });
  }

  const roleLabel =
    typeof role === 'string' && role.trim() ? role.trim() : 'Software Engineer';

  const modeDescriptions = {
    technical: 'technical software engineering interview (data structures, algorithms, system design, databases)',
    hr: 'HR and behavioral interview using the STAR method (situational, teamwork, leadership, conflict, growth)',
    case: 'case study and analytical interview (market sizing, business problem solving, frameworks)',
    stress: 'stress/pressure interview with tough follow-up questions that challenge the candidate',
    coding: 'live coding and data structures / algorithms round',
  };

  const packDescriptions = {
    tcs: 'TCS (Tata Consultancy Services) — focus on Java, OOPS, DBMS, networking, SDLC, service-based company style',
    infosys: 'Infosys — focus on microservices, Agile, REST APIs, cloud, design patterns, enterprise tech',
    wipro: 'Wipro — focus on DSA basics, SQL, MVC, HTTP, recursion, end-to-end project experience',
    faang: 'FAANG/top tech companies — focus on distributed systems, large-scale design, advanced algorithms, trade-offs',
  };

  const safeResumeText = typeof resumeText === 'string' ? resumeText.substring(0, 500) : '';

  // ── Coding round ─────────────────────────────────────────────────
  if (mode === 'coding') {
    const systemPrompt = `You are an expert coding interview author. Generate exactly 6 unique algorithmic problems as a JSON array ONLY (no markdown).
Each element must be an object with these keys:
- "title": string
- "difficulty": "Easy" | "Medium" | "Hard"
- "description": string (full problem statement)
- "constraints": array of strings
- "examples": array of objects {"input": string, "output": string, "explanation": string}
- "visibleTests": array of exactly 3 objects {"input": string, "output": string} (shown to candidate)
- "hiddenTests": array of exactly 2 objects {"input": string, "output": string} (not shown; for evaluation only)

Cover these topics, exactly one problem each — no two problems may share the same topic:
arrays, strings, linked lists, trees, dynamic programming, sorting.
Each problem JSON object must implicitly reflect its distinct topic (vary problem statements accordingly).
No plagiarism — original statements.`;

    let userPrompt = `Generate 6 coding interview problems for a ${roleLabel} interview. Tailor difficulty mix: 1 Easy, 3 Medium, 2 Hard.
Enforce one unique topic per problem from the fixed list (arrays, strings, linked lists, trees, dynamic programming, sorting) — no duplicates.`;

    if (safeResumeText.trim().length > 50) {
      userPrompt += `\n\nCandidate background (tailor 2-3 problems):\n${safeResumeText}`;
    }

    try {
      const text = await callAI({
        model: 'llama-3.1-8b-instant', // for Groq; Gemini ignores this field
        systemPrompt,
        userPrompt,
        temperature: 0.75,
        max_tokens: 4096,
      });

      const parsed = safeParseJSON(text);

      const starterTemplates = {
        python: 'def solution():\n    pass',
        javascript: 'function solution() {\n  \n}',
        java: 'public static void solution() {\n  \n}',
        cpp: 'void solution() {\n  \n}',
      };

      parsed.forEach((p) => {
        if (!p.templates) p.templates = starterTemplates;
      });

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Response was not a valid array');
      }

      return Response.json({ problems: parsed.slice(0, 6) }, { status: 200 });
    } catch (err) {
      console.error('Questions (coding) API error:', err);
      return Response.json(
        { error: 'Failed to generate coding problems', detail: err.message },
        { status: 500 }
      );
    }
  }

  // ── Standard interview modes: 8 questions ────────────────────────
  const systemPrompt = `You are an expert interview question generator. Generate exactly 8 unique, varied interview questions.
Respond ONLY with a JSON array of 8 strings (no markdown, no extra text, no numbering).
Example format: ["Question 1?","Question 2?","Question 3?","Question 4?","Question 5?","Question 6?","Question 7?","Question 8?"]
Make questions varied in difficulty and topic. Avoid repetition.`;

  let userPrompt = `Generate 8 ${modeDescriptions[mode] || 'interview'} questions for a ${roleLabel} interview`;

  if (pack && pack !== 'general' && packDescriptions[pack]) {
    userPrompt += ` specifically for a ${packDescriptions[pack]} interview`;
  }

  if (safeResumeText.trim().length > 50) {
    userPrompt += `.\n\nThe candidate's resume/background:\n${safeResumeText}\n\nTailor 3-4 of the questions specifically to their experience, skills, and projects mentioned. The remaining questions should be standard ${mode} questions.`;
  } else {
    userPrompt += '.';
  }
  userPrompt += ' Ensure all 8 questions are unique and cover different topics. Do not repeat common generic questions.';

  try {
    const text = await callAI({
      model: 'llama-3.3-70b-versatile',
      systemPrompt,
      userPrompt,
      temperature: 0.95,
      max_tokens: 800,
    });

    const parsed = safeParseJSON(text);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Response was not a valid array');
    }

    return Response.json({ questions: parsed }, { status: 200 });
  } catch (err) {
    console.error('Questions API error:', err);
    return Response.json({ error: 'Failed to generate questions', detail: err.message }, { status: 500 });
  }
}