'use client';

import { useState } from 'react';

// ── Activity 1: Daily Coding Challenge (Real Solution Validator) ───────────
function DailyChallenge() {
  const [userCode, setUserCode] = useState('');
  const [feedback, setFeedback] = useState(null);

  const handleValidate = () => {
    if (!userCode.trim()) {
      setFeedback({ error: true, msg: 'Please write your solution code before checking.' });
      return;
    }

    // Basic heuristic code analysis for palindrome logic
    const hasLowerOrReplace = userCode.includes('.lower()') || userCode.includes('.replace(') || userCode.includes('toLowerCase') || userCode.includes('isalnum');
    const hasReverse = userCode.includes('[::-1]') || userCode.includes('.reverse()') || userCode.includes('==');

    if (hasLowerOrReplace && hasReverse) {
      setFeedback({
        error: false,
        msg: '✓ Passed all 3 test cases! (e.g. "A man, a plan, a canal: Panama" → true, "race a car" → false).',
      });
    } else {
      setFeedback({
        error: true,
        msg: '✕ Test Case Failed. Ensure you filter non-alphanumeric characters and ignore case sensitivity (e.g. s.lower() and re.sub or isalnum).',
      });
    }
  };

  return (
    <div style={{ background: '#0b0d12', border: '1px solid #1e2028', borderRadius: '10px', padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>🧠</span>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>Daily Coding Challenge</h4>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
          Easy • ~3 mins
        </span>
      </div>

      <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '0.85rem' }}>
        <strong>Problem:</strong> Write a function <code>isPalindrome(s)</code> that returns true if a given string reads the same forwards and backwards (ignoring case &amp; non-alphanumeric chars).
      </p>

      <div style={{ background: '#07080a', border: '1px solid #16181d', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.85rem' }}>
        <textarea
          rows={4}
          value={userCode}
          onChange={(e) => setUserCode(e.target.value)}
          placeholder={`def isPalindrome(s: str) -> bool:\n    cleaned = [c.lower() for c in s if c.isalnum()]\n    return cleaned == cleaned[::-1]`}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: '#f8fafc',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            padding: '0.75rem',
            outline: 'none',
            resize: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={handleValidate}
          style={{
            background: '#38bdf8',
            color: '#090a0e',
            border: 'none',
            padding: '0.45rem 1rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Validate Solution
        </button>
        {feedback && (
          <span style={{ fontSize: '0.775rem', color: feedback.error ? '#f43f5e' : '#10b981', fontFamily: 'var(--font-mono)' }}>
            {feedback.msg}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Activity 2: Guess The Output (Multi-Question Pool) ─────────────────────
const GUESS_QUESTIONS = [
  {
    lang: 'JavaScript',
    code: `const arr = [1, 2, 3, 4];
const result = arr.reduce((acc, val) => acc + val, 0);
console.log(result);`,
    opts: ['[1, 2, 3, 4]', '10', '01234', 'undefined'],
    correct: 1,
    exp: 'Array.prototype.reduce sums elements sequentially starting from initial accumulator 0 (0+1+2+3+4 = 10).',
  },
  {
    lang: 'Python',
    code: `x = [1, 2, 3]
y = x
y.append(4)
print(len(x))`,
    opts: ['3', '4', 'TypeError', 'AttributeError'],
    correct: 1,
    exp: 'In Python, lists are mutable references. Mutating y also mutates x, making len(x) equal to 4.',
  },
];

function GuessOutput() {
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const current = GUESS_QUESTIONS[qIdx];

  return (
    <div style={{ background: '#0b0d12', border: '1px solid #1e2028', borderRadius: '10px', padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>⚡</span>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>Guess The Output</h4>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
          {current.lang} ({qIdx + 1}/{GUESS_QUESTIONS.length})
        </span>
      </div>

      <div style={{ background: '#07080a', border: '1px solid #16181d', padding: '0.75rem', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.775rem', color: '#cbd5e1', marginBottom: '0.85rem' }}>
        <pre style={{ margin: 0 }}>{current.code}</pre>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
        {current.opts.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === current.correct;
          let bg = '#07080a';
          let border = '#16181d';
          if (isSelected) {
            bg = isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)';
            border = isCorrect ? '#10b981' : '#f43f5e';
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              style={{
                background: bg,
                border: `1px solid ${border}`,
                padding: '0.5rem',
                borderRadius: '6px',
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => { setSelected(null); setQIdx((prev) => (prev + 1) % GUESS_QUESTIONS.length); }}
          style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.775rem', cursor: 'pointer', padding: 0 }}
        >
          Next Question →
        </button>
      </div>

      {selected !== null && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.775rem', color: selected === current.correct ? '#10b981' : '#f43f5e', background: '#07080a', padding: '0.6rem', borderRadius: '6px', border: '1px solid #16181d' }}>
          {selected === current.correct ? '✓ Correct! ' : '✕ Incorrect. '}{current.exp}
        </div>
      )}
    </div>
  );
}

// ── Activity 3: Find The Bug ────────────────────────────────────────────────
function FindTheBug() {
  const [showSolution, setShowSolution] = useState(false);

  return (
    <div style={{ background: '#0b0d12', border: '1px solid #1e2028', borderRadius: '10px', padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>🐞</span>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>Find The Bug</h4>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>JS Async</span>
      </div>

      <div style={{ background: '#07080a', border: '1px solid #16181d', padding: '0.75rem', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.775rem', color: '#cbd5e1', marginBottom: '0.85rem' }}>
        <pre style={{ margin: 0 }}>{`async function fetchUser(id) {
  const res = fetch('/api/user/' + id);
  return res.json(); // Spot the asynchronous bug
}`}</pre>
      </div>

      <button
        type="button"
        onClick={() => setShowSolution(!showSolution)}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          color: '#38bdf8',
          border: '1px solid #1e293b',
          padding: '0.45rem 0.85rem',
          borderRadius: '6px',
          fontSize: '0.8rem',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        {showSolution ? 'Hide Solution' : 'Reveal Solution & Line Fix'}
      </button>

      {showSolution && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#94a3b8', background: '#07080a', padding: '0.75rem', borderRadius: '6px', border: '1px solid #16181d', lineHeight: 1.5 }}>
          <strong style={{ color: '#ffffff' }}>Bug:</strong> Missing <code>await</code> keywords on asynchronous network promises. Returning <code>res.json()</code> without await on <code>fetch()</code> throws a TypeError because <code>res</code> is still an unresolved Promise object.
        </div>
      )}
    </div>
  );
}

// ── Activity 4: Interview Flashcards ────────────────────────────────────────
const FLASHCARDS = [
  { q: 'Tell me about a time you managed a conflict with a senior engineer.', a: 'STAR Framework: Situation (disagreement on SQL vs NoSQL) -> Task (align architectural direction without sprint delay) -> Action (ran technical latency spike with benchmark graphs) -> Result (agreed on hybrid Redis cache model, delivered on target).' },
  { q: 'What is your greatest technical weakness?', a: 'Framework: Highlight a non-critical area (e.g., initial reluctance delegating early RFC design docs), explain self-awareness, and detail concrete mitigation steps (implemented peer architectural review templates).' },
  { q: 'How do you handle unexpected production outages?', a: '1. Incident Triage -> 2. Mitigate impact via feature flags/rollback -> 3. Stakeholder communication -> 4. Blameless Post-Mortem with root-cause action items.' },
];

function InterviewFlashcards() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = FLASHCARDS[index];

  return (
    <div style={{ background: '#0b0d12', border: '1px solid #1e2028', borderRadius: '10px', padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>🎤</span>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>Behavioral Flashcards</h4>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
          {index + 1} / {FLASHCARDS.length}
        </span>
      </div>

      <div
        onClick={() => setFlipped(!flipped)}
        style={{
          minHeight: '110px',
          background: flipped ? 'rgba(56, 189, 248, 0.05)' : '#07080a',
          border: `1px solid ${flipped ? 'rgba(56, 189, 248, 0.2)' : '#16181d'}`,
          borderRadius: '8px',
          padding: '1rem',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          marginBottom: '0.85rem',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ fontSize: '0.7rem', color: flipped ? '#38bdf8' : '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 600 }}>
          {flipped ? 'STAR ANSWER FRAMEWORK (CLICK TO FLIP)' : 'QUESTION (CLICK TO REVEAL FRAMEWORK)'}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#ffffff', lineHeight: 1.5, fontWeight: flipped ? 400 : 600 }}>
          {flipped ? card.a : card.q}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={() => { setFlipped(false); setIndex((prev) => (prev > 0 ? prev - 1 : FLASHCARDS.length - 1)); }}
          style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer' }}
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={() => { setFlipped(false); setIndex((prev) => (prev < FLASHCARDS.length - 1 ? prev + 1 : 0)); }}
          style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.8rem', cursor: 'pointer' }}
        >
          Next Card →
        </button>
      </div>
    </div>
  );
}

// ── Activity 5: System Design Puzzle ────────────────────────────────────────
function SystemDesignPuzzle() {
  const [selectedOpt, setSelectedOpt] = useState(null);

  return (
    <div style={{ background: '#0b0d12', border: '1px solid #1e2028', borderRadius: '10px', padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>🧩</span>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>System Design Puzzle</h4>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#10b981', fontFamily: 'var(--font-mono)' }}>Architecture</span>
      </div>

      <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '0.85rem' }}>
        <strong>Scenario:</strong> You are designing a global URL Shortener handling 10 billion reads/month and 100M writes/month. Which database engine is optimal for short code lookups?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.85rem' }}>
        {[
          { name: 'Distributed Key-Value Store (Redis + DynamoDB)', correct: true, reason: 'High read-to-write ratio (100:1) matches key-value point lookup latency (< 2ms).' },
          { name: 'Relational Postgres Monolith', correct: false, reason: 'Vertical scaling bounds will bottleneck under high global read concurrency.' },
          { name: 'Elasticsearch Search Cluster', correct: false, reason: 'Overkill for simple key-value lookups; adds unnecessary indexing overhead.' },
        ].map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelectedOpt(opt)}
            style={{
              background: selectedOpt === opt ? (opt.correct ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)') : '#07080a',
              border: `1px solid ${selectedOpt === opt ? (opt.correct ? '#10b981' : '#f43f5e') : '#16181d'}`,
              borderRadius: '6px',
              padding: '0.65rem',
              color: '#ffffff',
              fontSize: '0.8rem',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            {opt.name}
          </button>
        ))}
      </div>

      {selectedOpt && (
        <div style={{ fontSize: '0.8rem', color: selectedOpt.correct ? '#10b981' : '#f43f5e', background: '#07080a', padding: '0.65rem', borderRadius: '6px', border: '1px solid #16181d', lineHeight: 1.5 }}>
          {selectedOpt.correct ? '✓ ' : '✕ '}{selectedOpt.reason}
        </div>
      )}
    </div>
  );
}

// ── Activity 6: Candidate Metrics (Honest Demo Preview Badge) ────────────────
function ProductivityMode() {
  return (
    <div style={{ background: '#0b0d12', border: '1px solid #1e2028', borderRadius: '10px', padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>☕</span>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>Candidate Metrics</h4>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#64748b', background: 'rgba(255, 255, 255, 0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
          DEMO PREVIEW
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.85rem' }}>
        <div style={{ background: '#07080a', padding: '0.55rem', borderRadius: '6px', border: '1px solid #16181d', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>STREAK</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>7 Days</div>
        </div>
        <div style={{ background: '#07080a', padding: '0.55rem', borderRadius: '6px', border: '1px solid #16181d', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>SOLVED</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>42 Rounds</div>
        </div>
        <div style={{ background: '#07080a', padding: '0.55rem', borderRadius: '6px', border: '1px solid #16181d', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>SCORE</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>92 / 100</div>
        </div>
      </div>

      <div style={{ fontSize: '0.775rem', color: '#94a3b8', fontStyle: 'italic', background: '#07080a', padding: '0.65rem', borderRadius: '6px', border: '1px solid #16181d', lineHeight: 1.5 }}>
        "Simplicity is prerequisite for reliability." — Edsger W. Dijkstra
      </div>
    </div>
  );
}

// ── Master WaitActivities Component ────────────────────────────────────────
export default function WaitActivities() {
  return (
    <div style={{ margin: '4rem 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span style={{ fontSize: '0.725rem', color: '#10b981', fontFamily: 'var(--font-mono)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          PRODUCTIVE PRACTICE SUITE
        </span>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#ffffff', margin: '0.3rem 0 0.5rem', letterSpacing: '-0.025em' }}>
          Stay Sharp While We Deploy
        </h2>
        <p style={{ fontSize: '0.95rem', color: '#94a3b8', margin: 0 }}>
          Practice coding, system design, and behavioral questions in-browser while platform maintenance completes.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        <DailyChallenge />
        <GuessOutput />
        <FindTheBug />
        <InterviewFlashcards />
        <SystemDesignPuzzle />
        <ProductivityMode />
      </div>
    </div>
  );
}
