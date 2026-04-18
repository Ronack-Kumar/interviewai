// Generates interview questions / coding problems via Groq

export async function POST(request) {
  console.log('GROQ KEY exists:', !!process.env.GROQ_API_KEY);
  console.log('GROQ KEY prefix:', process.env.GROQ_API_KEY?.substring(0, 8));
  const body = await request.json();
  const { mode, pack, resumeText, role } = body;

  if (!mode) {
    return Response.json({ error: 'mode is required' }, { status: 400 });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return Response.json({ error: 'API key not configured' }, { status: 500 });
  }

  const roleLabel =
    typeof role === 'string' && role.trim()
      ? role.trim()
      : 'Software Engineer';

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
  const topicPools = {
    technical: [
      'indexing','caching','load balancing','microservices','REST vs GraphQL','CAP theorem',
      'SOLID principles','design patterns','CI/CD','Docker','Kubernetes','database sharding',
      'event-driven architecture','message queues','WebSockets','OAuth','JWT','SQL optimization',
      'NoSQL tradeoffs','distributed systems','rate limiting','API gateway','memory management',
      'garbage collection','concurrency','threading','recursion','dynamic programming','system design',
      'scalability'
    ],
    hr: [
      'conflict resolution','leadership','failure story','team collaboration','time management',
      'feedback handling','career goals','motivation','work under pressure','difficult colleague',
      'project ownership','cross-functional work','mentoring','ambiguity handling','initiative',
      'communication','prioritization','remote work','learning agility','stakeholder management'
    ],
    case: [
      'market sizing','pricing strategy','unit economics','customer segmentation','growth strategy',
      'retention analysis','churn reduction','go-to-market','competitive analysis','profitability',
      'cost optimization','channel strategy','product launch','international expansion','ops bottlenecks',
      'forecasting','risk analysis','supply chain','north star metric','experimentation'
    ],
    stress: [
      'pressure handling','rapid prioritization','defensive criticism','ethical dilemma','scope challenge',
      'deadline shock','resource constraint','contradictory requirements','stakeholder conflict','self-awareness',
      'decision under uncertainty','communication under stress','pushback handling','ownership challenge',
      'unexpected failure','ambiguity pressure','role fit challenge','career gap defense','tradeoff defense','resilience'
    ],
  };

  // ── Coding round: structured problems ─────────────────────────────
  if (mode === 'coding') {
    const systemPrompt = `You are an expert coding interview author. Generate exactly 8 unique algorithmic problems as a JSON array ONLY (no markdown).
Each element must be an object with these keys:
- "title": string
- "difficulty": "Easy" | "Medium" | "Hard"
- "description": string (full problem statement)
- "constraints": array of strings
- "examples": array of objects {"input": string, "output": string, "explanation": string}
- "visibleTests": array of exactly 3 objects {"input": string, "output": string} (shown to candidate)
- "hiddenTests": array of exactly 2 objects {"input": string, "output": string} (not shown; for evaluation only)
- "templates": object with keys: "python","javascript","java","cpp","c","go","rust","typescript","csharp","ruby","kotlin","swift" — each value is starter code as a string for that language.

Cover these topics, exactly one problem each — no two problems may share the same topic:
arrays, strings, linked lists, trees, graphs, dynamic programming, sorting, two pointers.
Each problem JSON object must implicitly reflect its distinct topic (vary problem statements accordingly).
No plagiarism — original statements.`;

    let userPrompt = `Generate 8 coding interview problems for a ${roleLabel} interview. Tailor difficulty mix: 2 Easy, 4 Medium, 2 Hard.
Enforce one unique topic per problem from the fixed list (arrays, strings, linked lists, trees, graphs, dynamic programming, sorting, two pointers) — no duplicates.`;

    if (safeResumeText.trim().length > 50) {
      userPrompt += `\n\nCandidate background (tailor 2-3 problems):\n${safeResumeText}`;
    }

    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.75,
          max_tokens: 8192,
        }),
      });

      const data = await groqRes.json();
      if (!data.choices || !data.choices[0]) {
        console.log('Groq API response (coding, no choices):', JSON.stringify(data));
        throw new Error('Invalid response from LLM');
      }

      const text = data.choices[0].message.content;
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Response was not a valid array');
      }

      return Response.json({ problems: parsed.slice(0, 8) }, { status: 200 });
    } catch (err) {
      console.log('GROQ KEY exists:', !!process.env.GROQ_API_KEY);
      console.log('GROQ KEY prefix:', process.env.GROQ_API_KEY?.substring(0, 10));
      console.log('Questions API full error:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        cause: err?.cause,
      });
      console.error('Questions API error:', err);
      return Response.json(
        { error: 'Failed to generate coding problems', detail: err.message },
        { status: 500 }
      );
    }
  }

  // ── Standard interview modes: 8 strings ─────────────────────────
  let systemPrompt = `You are an expert interview question generator. Generate exactly 8 unique, varied interview questions.
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
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.95,
        max_tokens: 800,
      }),
    });

    const data = await groqRes.json();

    if (!data.choices || !data.choices[0]) {
      console.log('Groq API response (standard, no choices):', JSON.stringify(data));
      throw new Error('Invalid response from LLM');
    }

    const text = data.choices[0].message.content;
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Response was not a valid array');
    }

    return Response.json({ questions: parsed }, { status: 200 });
  } catch (err) {
    console.log('GROQ KEY exists:', !!process.env.GROQ_API_KEY);
    console.log('GROQ KEY prefix:', process.env.GROQ_API_KEY?.substring(0, 10));
    console.log('Questions API full error:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
      cause: err?.cause,
    });
    console.error('Questions API error:', err);
    return Response.json({ error: 'Failed to generate questions', detail: err.message }, { status: 500 });
  }
}

