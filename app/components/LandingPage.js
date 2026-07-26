'use client';

import Link from 'next/link';
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import './landing-v2.css';

// ── Minimal Monochrome SVG Icons (Lucide Style 1.5px Stroke) ────────────────

function IconTerminal({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function IconCpu({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="15" x2="23" y2="15" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="15" x2="4" y2="15" />
    </svg>
  );
}

function IconShield({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconZap({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconCheck({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconChevron({ open }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Micro-Interaction Components ────────────────────────────────────────────

/** Count-Up Number Animation */
function CountUp({ end, suffix = '', duration = 1.2 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const stepTime = Math.abs(Math.floor((duration * 1000) / end));
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      }
    }, Math.max(stepTime, 16));
    return () => clearInterval(timer);
  }, [inView, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/** Animated Continuous Voice Waveform */
function AnimatedWaveform() {
  const bars = [14, 28, 12, 32, 20, 24, 16, 30, 22, 14, 26, 18, 22, 10, 28, 16, 24, 18, 30, 14];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '22px' }}>
      {bars.map((h, i) => (
        <motion.div
          key={i}
          animate={{ height: [`${h}px`, `${Math.max(6, (h * (i % 2 === 0 ? 1.4 : 0.6)) % 32)}px`, `${h}px`] }}
          transition={{ duration: 1.2 + (i % 3) * 0.3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ flex: 1, background: '#38bdf8', borderRadius: '1px', opacity: 0.8 }}
        />
      ))}
    </div>
  );
}

/** Typewriter Transcript Animation */
function TypewriterText({ text, speed = 25 }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      "{displayedText}"
      <span className="v2-cursor" />
    </span>
  );
}

// ── Product Data ────────────────────────────────────────────────────────────

const SHOWCASE_ITEMS = [
  {
    id: 'system-design',
    category: 'System Design & Scalability',
    title: 'Distributed System Design Evaluation',
    subtitle: 'Real-time trade-off analysis covering latency, storage engine atomicity, and partition tolerance.',
    prompt: 'Design a distributed rate limiting pipeline handling 100k requests/sec across multi-region API gateways.',
    transcript:
      'I would implement a Sliding Window Counter algorithm backed by Redis clusters using local LRU memory fallback caches and Lua scripts for atomic counter updates...',
    score: 9.4,
    accuracy: 96,
    clarity: 92,
    depth: 94,
    critique:
      'Strong architectural callout of Redis Lua scripts for atomic increments. Excellent identification of local in-memory fallback caches to shield against hot key spikes.',
    ideal:
      '1. Implement Sliding Window Counter with Redis atomic Lua execution.\n2. Add local memory cache with 1s TTL for hot keys.\n3. Fail open to local gateway circuit breaker during Redis network partitions.',
  },
  {
    id: 'star-behavioral',
    category: 'STAR Method Behavioral',
    title: 'Behavioral Transcript & STAR Component Parsing',
    subtitle: 'Voice speech-to-text recognition with component detection across Situation, Task, Action, and Result.',
    prompt: 'Describe a situation where you had to push back against a feature request due to architectural debt.',
    transcript:
      'When product requested a new notification pipeline in week 3, our monolith auth server was at 85% CPU. I scheduled a spike, demonstrated latency impact with telemetry graphs, and proposed a decoupled event queue...',
    score: 8.9,
    accuracy: 88,
    clarity: 94,
    depth: 86,
    critique:
      'Clear Situation and Task framing. Excellent data-driven Action using telemetry graphs. Consider adding quantifiable business impact to the Result (+20% uptime).',
    ideal:
      'STAR Structure: Situation (Context) → Task (Objective) → Action (Data-backed mitigation) → Result (Quantifiable outcome).',
  },
  {
    id: 'live-coding',
    category: 'Algorithms & DSA',
    title: 'In-Browser Code Execution & Complexity Validation',
    subtitle: 'Monaco-style coding workspace with instant space/time complexity validation and test runner.',
    prompt: 'Two Sum II — Input Array Is Sorted (Optimal O(n) time, O(1) space complexity constraint)',
    codeSnippet:
      'def twoSum(numbers: list[int], target: int) -> list[int]:\n    left, right = 0, len(numbers) - 1\n    while left < right:\n        curr = numbers[left] + numbers[right]\n        if curr == target:\n            return [left + 1, right + 1]\n        elif curr < target:\n            left += 1\n        else:\n            right -= 1',
    score: 10.0,
    accuracy: 100,
    clarity: 100,
    depth: 100,
    critique:
      'Optimal linear time algorithm utilizing the two-pointer technique. Zero extra space allocated. All boundary edge cases handled.',
    ideal: 'Two-pointer greedy strategy operates in linear time by capitalizing on the sorted order constraint.',
  },
  {
    id: 'stress-round',
    category: 'Stress Interview',
    title: 'Aggressive Persona & Pushback Simulation',
    subtitle: 'Simulate pushback from tough interviewers to test composure and technical conviction under pressure.',
    prompt: 'Your previous answer assumed infinite Redis memory. What happens when key eviction triggers during a traffic peak?',
    transcript:
      'If maxmemory limit is reached under volatile-lru, Redis will evict rate limit keys prematurely. To prevent cascading database failure, I would enforce hard local fallback ratelimiting at the API gateway layer...',
    score: 9.1,
    accuracy: 90,
    clarity: 95,
    depth: 88,
    critique:
      'Handled pushback without defensiveness. Correctly identified key eviction risks under volatile-lru policy and provided proactive gateway circuit breaking.',
    ideal: 'Acknowledge eviction failure mode, detail volatile-lru behavior, and specify local gateway circuit breaker.',
  },
];

const MEGA_MENU_CATEGORIES = [
  {
    id: 'system-design',
    title: 'System Design & Scalability',
    desc: 'Architecture trade-offs, storage engines, latency & throughput bounds.',
    preview: 'Redis atomic counters, consistent hashing, load balancer health checks.',
  },
  {
    id: 'star-behavioral',
    title: 'STAR Method Behavioral',
    desc: 'Voice transcription with Situation/Task/Action/Result component parsing.',
    preview: 'Automated 4/4 STAR component verification & executive clarity score.',
  },
  {
    id: 'live-coding',
    title: 'DSA & Live Coding Studio',
    desc: 'In-browser code evaluation with time/space complexity runner.',
    preview: 'O(n) linear space/time verification, edge-case test case suite.',
  },
  {
    id: 'stress-round',
    title: 'Stress & Persona Pushback',
    desc: 'Simulate aggressive interviewers challenging architectural trade-offs.',
    preview: 'Aggressive FAANG persona testing composure under strict bounds.',
  },
  {
    id: 'resume-jd',
    title: 'Resume PDF & JD Matcher',
    desc: 'Upload resume PDF or JD to generate targeted role questions.',
    preview: 'In-browser PDF framework parser matching candidate past experience.',
  },
  {
    id: 'hiring-verdict',
    title: 'Hiring Committee Reports',
    desc: 'Structured scorecards with formal hiring manager decision verdicts.',
    preview: 'Strong Hire verdict with key strength & growth area callouts.',
  },
];

const FAQS = [
  {
    q: 'Is MockPrep 100% free with no paywalls or hidden fees?',
    a: 'Yes. All interview modes, speech-to-text voice recognition, coding IDEs, and structured feedback reports are accessible without credit cards or subscriptions.',
  },
  {
    q: 'How does the dual-LLM evaluation engine work?',
    a: 'MockPrep routes requests through a primary Groq Llama 3.3 70B inference engine for sub-second responses, backed by automatic failover to a Gemini Flash model chain for 99.9% availability.',
  },
  {
    q: 'Can I practice with questions tailored to my resume or job description?',
    a: 'Yes. Select the Resume & JD mode, paste your background or target job description, and the engine extracts your core framework stack to generate targeted, role-specific questions.',
  },
  {
    q: 'What interviewer personas are supported?',
    a: 'You can choose from 6 realistic interviewer personas: Standard Professional, Aggressive FAANG, Friendly Startup CTO, Silent & Skeptical, Strict HR, and TCS/Infosys Enterprise style.',
  },
  {
    q: 'How are session reports and scores stored?',
    a: 'Your session scores, STAR method ratings, and model answers are saved automatically to your private dashboard powered by Supabase cloud storage.',
  },
];

export default function LandingPage() {
  const [heroTab, setHeroTab] = useState('interview'); // 'interview' | 'scorecard' | 'verdict' | 'code'
  const [activeShowcase, setActiveShowcase] = useState(0);
  const [megaOpen, setMegaOpen] = useState(false);
  const [megaCategory, setMegaCategory] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  const scrollTo = useCallback((id) => {
    setMegaOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Header Scroll Shrink
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-Loop Hero Demo Sequence every 12 seconds
  useEffect(() => {
    const tabs = ['interview', 'scorecard', 'verdict', 'code'];
    const timer = setInterval(() => {
      setHeroTab((prev) => {
        const nextIdx = (tabs.indexOf(prev) + 1) % tabs.length;
        return tabs[nextIdx];
      });
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  const currentShowcase = SHOWCASE_ITEMS[activeShowcase];
  const activeMega = MEGA_MENU_CATEGORIES[megaCategory];

  return (
    <div className="v2-landing">
      {/* ── Hairline Header with Shrink on Scroll ───────────────────────── */}
      <motion.header
        className={`v2-header ${scrolled ? 'scrolled' : ''}`}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="v2-container v2-header__inner">
          <Link href="/" className="v2-logo">
            <div className="v2-logo-icon">
              <IconTerminal size={15} />
            </div>
            <span>MockPrep</span>
          </Link>

          {/* Navigation Links with Showcase Mega Menu Hover */}
          <nav className="v2-nav-links" style={{ position: 'relative' }}>
            <div
              onMouseEnter={() => setMegaOpen(true)}
              onMouseLeave={() => setMegaOpen(false)}
              style={{ position: 'relative', display: 'inline-block' }}
            >
              <button
                type="button"
                className="v2-nav-link"
                onClick={() => scrollTo('showcase')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                Showcase <IconChevron open={megaOpen} />
              </button>

              {/* Mega Menu Dropdown */}
              <AnimatePresence>
                {megaOpen && (
                  <motion.div
                    className="v2-mega-menu"
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="v2-mega-grid">
                      {/* Left Column: Categories */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {MEGA_MENU_CATEGORIES.map((cat, i) => (
                          <button
                            key={cat.id}
                            type="button"
                            className={`v2-mega-item ${megaCategory === i ? 'active' : ''}`}
                            onMouseEnter={() => setMegaCategory(i)}
                            onClick={() => scrollTo('showcase')}
                          >
                            <div className="v2-mega-title">{cat.title}</div>
                            <div className="v2-mega-desc">{cat.desc}</div>
                          </button>
                        ))}
                      </div>

                      {/* Right Column: Live Crossfade Preview */}
                      <div className="v2-mega-preview-box">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeMega.id}
                            initial={{ opacity: 0, x: 6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -6 }}
                            transition={{ duration: 0.15 }}
                          >
                            <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontFamily: 'var(--font-mono)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                              LIVE PREVIEW • {activeMega.title}
                            </div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
                              {activeMega.title}
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                              {activeMega.preview}
                            </p>
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button type="button" className="v2-nav-link" onClick={() => scrollTo('architecture')}>
              Architecture
            </button>
            <button type="button" className="v2-nav-link" onClick={() => scrollTo('comparison')}>
              Metrics
            </button>
            <button type="button" className="v2-nav-link" onClick={() => scrollTo('faq')}>
              FAQ
            </button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <Link href="/login" className="v2-nav-link">
              Sign in
            </Link>
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <Link href="/signup" className="v2-btn-pill v2-btn-primary">
                Launch Workspace →
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.header>

      <main>
        {/* ── Editorial Hero Section (Staggered Entrance Assembly) ───────── */}
        <section className="v2-hero">
          <div className="v2-container">
            <div className="v2-hero-grid">
              {/* Left Column: Terse Headline Assembly */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <div className="v2-badge-mono">
                  <IconCpu size={14} /> Sub-800ms Groq &amp; Gemini Ingestion Engine
                </div>

                <h1 className="v2-hero-title">
                  Practice interviews like a real engineering leader.
                </h1>

                <p className="v2-hero-sub">
                  Simulate System Design, STAR Behavioral, DSA Coding, and Stress Pushback. Evaluate trade-offs with structured hiring committee reports.
                </p>

                <div className="v2-hero-actions">
                  <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                    <Link href="/signup" className="v2-btn-pill v2-btn-primary">
                      Start Session →
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                    <button
                      type="button"
                      className="v2-btn-pill v2-btn-secondary"
                      onClick={() => scrollTo('showcase')}
                    >
                      Explore Product Showcase
                    </button>
                  </motion.div>
                </div>

                {/* Animated CountUp Metrics */}
                <div style={{ display: 'flex', gap: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #16181d' }}>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                      &lt; <CountUp end={800} suffix="ms" />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Evaluation Latency</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                      <CountUp end={6} suffix=" Modes" />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tech, HR, Design, Coding</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                      <CountUp end={100} suffix="% Free" />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>No Credit Card</div>
                  </div>
                </div>
              </motion.div>

              {/* Right Column: Hero Stage with Subtle Floating Drift */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }}
                transition={{
                  opacity: { duration: 0.5 },
                  scale: { duration: 0.5 },
                  y: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
                }}
              >
                <div className="v2-ui-window">
                  <div className="v2-ui-header">
                    <div className="v2-dots">
                      <div className="v2-dot v2-dot--red" />
                      <div className="v2-dot v2-dot--yellow" />
                      <div className="v2-dot v2-dot--green" />
                    </div>

                    <div className="v2-ui-tabs">
                      {['interview', 'scorecard', 'verdict', 'code'].map((tabKey) => {
                        const labels = { interview: 'Live Session', scorecard: 'AI Scorecard', verdict: 'Verdict', code: 'Live Coding' };
                        const isActive = heroTab === tabKey;
                        return (
                          <button
                            key={tabKey}
                            type="button"
                            className={`v2-ui-tab ${isActive ? 'active' : ''}`}
                            onClick={() => setHeroTab(tabKey)}
                          >
                            {labels[tabKey]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="v2-ui-body" style={{ minHeight: '220px' }}>
                    <AnimatePresence mode="wait">
                      {/* TAB 1: LIVE SESSION */}
                      {heroTab === 'interview' && (
                        <motion.div
                          key="interview"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div style={{ background: '#090a0e', padding: '0.85rem', borderRadius: '6px', border: '1px solid #16181d', marginBottom: '0.85rem' }}>
                            <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontFamily: 'var(--font-mono)', fontWeight: 500, marginBottom: '0.25rem' }}>
                              QUESTION 04 / 08 • AGGRESSIVE FAANG PERSONA
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#f8fafc', fontWeight: 500, lineHeight: 1.45 }}>
                              "Your design uses a single primary node for writes. What happens during a failover window if cross-region replication encounters lag?"
                            </div>
                          </div>

                          <div style={{ background: '#06070a', padding: '0.75rem', borderRadius: '6px', border: '1px solid #16181d', marginBottom: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#f43f5e', fontWeight: 500 }}>Voice Recording Active</span>
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>01:14</span>
                            </div>
                            <AnimatedWaveform />
                          </div>

                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', background: '#090a0e', padding: '0.65rem', borderRadius: '6px', border: '1px solid #16181d' }}>
                            <TypewriterText text="I would configure multi-region semi-synchronous replication with automated Sentinel quorum election..." />
                          </div>
                        </motion.div>
                      )}

                      {/* TAB 2: AI SCORECARD */}
                      {heroTab === 'scorecard' && (
                        <motion.div
                          key="scorecard"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', paddingBottom: '0.6rem', borderBottom: '1px solid #16181d' }}>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>Performance Evaluation Scorecard</div>
                              <div style={{ fontSize: '0.725rem', color: '#64748b' }}>System Design & Distributed Scalability</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>9.4</span>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}> / 10</span>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.85rem' }}>
                            <div style={{ background: '#090a0e', padding: '0.5rem', borderRadius: '4px', textAlign: 'center', border: '1px solid #16181d' }}>
                              <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Accuracy</div>
                              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                                <CountUp end={96} suffix="%" />
                              </div>
                            </div>
                            <div style={{ background: '#090a0e', padding: '0.5rem', borderRadius: '4px', textAlign: 'center', border: '1px solid #16181d' }}>
                              <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Clarity</div>
                              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                                <CountUp end={92} suffix="%" />
                              </div>
                            </div>
                            <div style={{ background: '#090a0e', padding: '0.5rem', borderRadius: '4px', textAlign: 'center', border: '1px solid #16181d' }}>
                              <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Depth</div>
                              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                                <CountUp end={94} suffix="%" />
                              </div>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.775rem', color: '#cbd5e1', lineHeight: 1.45, background: 'rgba(56, 189, 248, 0.04)', padding: '0.65rem', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
                            <strong>Critique:</strong> Strong callout of Sentinel quorum elections. Correctly identified replication lag trade-offs under eventual consistency.
                          </div>
                        </motion.div>
                      )}

                      {/* TAB 3: HIRING VERDICT */}
                      {heroTab === 'verdict' && (
                        <motion.div
                          key="verdict"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.85rem', borderRadius: '6px', marginBottom: '0.85rem' }}>
                            <div style={{ fontSize: '0.675rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>HIRING COMMITTEE VERDICT</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginTop: '0.2rem' }}>Strong Hire (9.2 / 10)</div>
                          </div>

                          <div style={{ fontSize: '0.775rem', color: '#94a3b8', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                            <strong style={{ color: '#10b981' }}>Key Strength:</strong> Demonstrated deep operational understanding of distributed consistency models.
                          </div>

                          <div style={{ fontSize: '0.775rem', color: '#94a3b8', lineHeight: 1.5 }}>
                            <strong style={{ color: '#f59e0b' }}>Growth Area:</strong> Explicitly specify database connection pooling thresholds during load spikes.
                          </div>
                        </motion.div>
                      )}

                      {/* TAB 4: LIVE CODE */}
                      {heroTab === 'code' && (
                        <motion.div
                          key="code"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="v2-code-box" style={{ marginBottom: '0.75rem' }}>
                            <pre style={{ margin: 0 }}>{`def twoSum(numbers: list[int], target: int) -> list[int]:
    left, right = 0, len(numbers) - 1
    while left < right:
        curr = numbers[left] + numbers[right]
        if curr == target: return [left + 1, right + 1]
        elif curr < target: left += 1
        else: right -= 1`}</pre>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.06)', padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                            <span>Passed 3/3 Sample Test Cases</span>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>Time: O(n) • Space: O(1)</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Section 2: Interactive Split Workflow Showcase ───────────────── */}
        <motion.section
          id="showcase"
          className="v2-showcase-section"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.4 }}
        >
          <div className="v2-container">
            <div className="v2-section-header">
              <h2 className="v2-section-title">Engineered for real technical rounds</h2>
              <p className="v2-section-lead">
                Explore interactive product previews across System Design, STAR Behavioral, Live Coding, and Stress Pushback.
              </p>
            </div>

            <div className="v2-showcase-grid">
              {/* Vertical Navigation Selector */}
              <div className="v2-showcase-list">
                {SHOWCASE_ITEMS.map((item, idx) => {
                  const isActive = activeShowcase === idx;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`v2-showcase-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveShowcase(idx)}
                    >
                      <div className="v2-showcase-cat">0{idx + 1} • {item.category}</div>
                      <div className="v2-showcase-head">{item.title}</div>
                      <div className="v2-showcase-sub">{item.subtitle}</div>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Live Inspector Window with Crossfade */}
              <div className="v2-ui-window">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', background: '#090a0e', borderBottom: '1px solid #16181d' }}>
                  <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                    {currentShowcase.category}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                    Score: {currentShowcase.score} / 10
                  </div>
                </div>

                <div style={{ padding: '1.25rem' }}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentShowcase.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.85rem', lineHeight: 1.45 }}>
                        {currentShowcase.prompt}
                      </div>

                      {currentShowcase.codeSnippet ? (
                        <div className="v2-code-box" style={{ marginBottom: '1rem' }}>
                          <pre style={{ margin: 0 }}>{currentShowcase.codeSnippet}</pre>
                        </div>
                      ) : (
                        <div style={{ background: '#090a0e', padding: '0.85rem', borderRadius: '6px', border: '1px solid #16181d', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1rem', lineHeight: 1.55 }}>
                          <strong style={{ color: '#64748b', display: 'block', fontSize: '0.725rem', marginBottom: '0.25rem' }}>Response Transcript:</strong>
                          "{currentShowcase.transcript}"
                        </div>
                      )}

                      <div style={{ background: 'rgba(56, 189, 248, 0.04)', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '6px', padding: '0.85rem', marginBottom: '0.85rem' }}>
                        <strong style={{ color: '#38bdf8', fontSize: '0.775rem', display: 'block', marginBottom: '0.25rem' }}>AI Critique &amp; Feedback:</strong>
                        <div style={{ fontSize: '0.825rem', color: '#e2e8f0', lineHeight: 1.55 }}>{currentShowcase.critique}</div>
                      </div>

                      <div style={{ background: '#090a0e', border: '1px solid #16181d', borderRadius: '6px', padding: '0.85rem', fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'pre-line' }}>
                        <strong style={{ color: '#ffffff' }}>Optimal Model Response:</strong>
                        <div style={{ marginTop: '0.35rem', color: '#cbd5e1' }}>{currentShowcase.ideal}</div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Section 3: Before vs After Transformation Comparison Visual ──── */}
        <motion.section
          id="comparison"
          className="v2-comp-section"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.4 }}
        >
          <div className="v2-container">
            <div className="v2-section-header">
              <h2 className="v2-section-title">The precision difference</h2>
              <p className="v2-section-lead">
                Contrast unstructured self-study against MockPrep's structured evaluation engine.
              </p>
            </div>

            <div className="v2-comp-grid">
              {/* Before Column */}
              <div className="v2-comp-col">
                <div style={{ fontSize: '0.725rem', color: '#f43f5e', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                  BEFORE • UNSTRUCTURED INTERVIEW PREP
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#ffffff', marginBottom: '1rem' }}>
                  Rambling responses with blind spots
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                  <li style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ color: '#f43f5e' }}>✕</span> Memorizing static solution code without understanding trade-offs
                  </li>
                  <li style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ color: '#f43f5e' }}>✕</span> Missing STAR structure components during behavioral HR rounds
                  </li>
                  <li style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ color: '#f43f5e' }}>✕</span> No quantitative feedback or score breakdown on system design answers
                  </li>
                </ul>
              </div>

              {/* After Column */}
              <div className="v2-comp-col v2-comp-col--after">
                <div style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                  AFTER • MOCKPREP EVALUATION ENGINE
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#ffffff', marginBottom: '1rem' }}>
                  Structured scoring &amp; actionable critiques
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#e2e8f0' }}>
                  <li style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ color: '#10b981' }}><IconCheck size={15} /></span> Sub-second feedback on time/space algorithmic complexity
                  </li>
                  <li style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ color: '#10b981' }}><IconCheck size={15} /></span> Automated STAR method component verification (Situation/Task/Action/Result)
                  </li>
                  <li style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ color: '#10b981' }}><IconCheck size={15} /></span> Formal hiring manager verdicts with key strength and growth area callouts
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Section 4: AI Engine Pipeline Architecture (Nodes) ───────────── */}
        <motion.section
          id="architecture"
          className="v2-pipeline-section"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.4 }}
        >
          <div className="v2-container">
            <div className="v2-section-header">
              <h2 className="v2-section-title">Sub-second AI pipeline architecture</h2>
              <p className="v2-section-lead">
                Built on a dual-LLM inference model designed for zero downtime and low-latency feedback.
              </p>
            </div>

            <div className="v2-pipeline-grid">
              <div className="v2-pipeline-box">
                <div className="v2-pipeline-tag">
                  <IconZap size={14} /> NODE 01 • PRIMARY INFERENCE
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
                  Groq Llama 3.3 70B
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                  Primary inference runs on Groq LPU hardware delivering &lt; 800ms evaluation latency for real-time question generation and feedback.
                </p>
              </div>

              <div className="v2-pipeline-box">
                <div className="v2-pipeline-tag">
                  <IconShield size={14} /> NODE 02 • FAILOVER CHAIN
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
                  Gemini Flash 2.0 Fallback
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                  If Groq hits a 429 rate limit or network disruption, the shared AI router seamlessly falls back to a Gemini model chain without interrupting user flow.
                </p>
              </div>

              <div className="v2-pipeline-box">
                <div className="v2-pipeline-tag">
                  <IconCpu size={14} /> NODE 03 • STATE &amp; RATE LIMITS
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
                  Supabase REST &amp; Daily Caps
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                  Enforces per-user daily limits (20 auth, 5 guest) using atomic REST upserts on `usage_daily` with fail-open safety for continuous availability.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Section 5: Feature Deep-Dives (Split Views) ────────────────── */}
        <motion.section
          style={{ padding: '6rem 0', borderTop: '1px solid #16181d' }}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.4 }}
        >
          <div className="v2-container">
            <div className="v2-section-header">
              <h2 className="v2-section-title">Built for technical candidates</h2>
              <p className="v2-section-lead">
                Purpose-built features designed to refine your interview skills.
              </p>
            </div>

            {/* Feature 1: Resume PDF Matching */}
            <div className="v2-feature-split">
              <div>
                <div style={{ fontSize: '0.725rem', color: '#38bdf8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                  Tailored Practice
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.85rem' }}>
                  Resume &amp; Job Description Matching
                </h3>
                <p style={{ fontSize: '0.925rem', color: '#94a3b8', lineHeight: 1.65, marginBottom: '1.25rem' }}>
                  Upload your resume PDF or paste a target job description. The engine extracts your core stack, projects, and achievements to ask role-specific questions.
                </p>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <li>Parses PDF resumes in-browser without sending raw file data</li>
                  <li>Extracts framework keywords (React, Go, Kafka, Kubernetes)</li>
                  <li>Generates targeted follow-up questions on candidate past projects</li>
                </ul>
              </div>

              <div className="v2-ui-window">
                <div style={{ fontSize: '0.725rem', color: '#64748b', fontFamily: 'var(--font-mono)', padding: '0.75rem 1rem', background: '#090a0e', borderBottom: '1px solid #16181d' }}>
                  resume_parser_output.json
                </div>
                <div className="v2-code-box">
                  <pre style={{ margin: 0 }}>{`{
  "candidate": "Software Engineer",
  "matched_skills": ["Python", "System Design", "Redis", "Kafka"],
  "tailored_prompt": "Explain how you managed Kafka partition offsets during the microservices migration mentioned in your experience at Tech Corp."
}`}</pre>
                </div>
              </div>
            </div>

            {/* Feature 2: Anti-Cheat Telemetry */}
            <div className="v2-feature-split" style={{ marginTop: '5rem' }}>
              <div>
                <div style={{ fontSize: '0.725rem', color: '#38bdf8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                  Integrity &amp; Security
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.85rem' }}>
                  Anti-Cheat Verification &amp; Violation Logging
                </h3>
                <p style={{ fontSize: '0.925rem', color: '#94a3b8', lineHeight: 1.65, marginBottom: '1.25rem' }}>
                  For peer practice and coding interviews, MockPrep logs unexpected paste events and tab switches to ensure honest self-assessment.
                </p>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <li>Detects bulk code pasting events during live coding problems</li>
                  <li>Logs violations silently to Supabase audit tables</li>
                  <li>Enforces real-time interview constraints</li>
                </ul>
              </div>

              <div className="v2-ui-window">
                <div style={{ fontSize: '0.725rem', color: '#64748b', fontFamily: 'var(--font-mono)', padding: '0.75rem 1rem', background: '#090a0e', borderBottom: '1px solid #16181d' }}>
                  security_violation_audit.log
                </div>
                <div className="v2-code-box">
                  <pre style={{ margin: 0 }}>{`[14:32:01] EVENT: paste_attempt
[14:32:01] DETAIL: Bulk paste detected (480 chars in < 50ms)
[14:32:01] ACTION: Logged to Supabase violations table
[14:32:01] STATUS: Flagged for candidate review`}</pre>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Section 6: FAQ Accordion (Unboxed Hairlines) ────────────────── */}
        <section id="faq" style={{ padding: '6rem 0', borderTop: '1px solid #16181d' }}>
          <div className="v2-container">
            <div className="v2-section-header">
              <h2 className="v2-section-title">Frequently Asked Questions</h2>
              <p className="v2-section-lead">Technical and operational details about MockPrep.</p>
            </div>

            <div className="v2-faq-wrap">
              {FAQS.map((item, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={index} className="v2-faq-row">
                    <button
                      type="button"
                      className="v2-faq-btn"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                    >
                      <span>{item.q}</span>
                      <IconChevron open={isOpen} />
                    </button>
                    {isOpen && <div className="v2-faq-ans">{item.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Section 7: Action Banner ────────────────────────────────────── */}
        <section className="v2-container">
          <div className="v2-action-box">
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 700, color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.03em' }}>
              Ready to launch your practice session?
            </h2>
            <p style={{ fontSize: '1rem', color: '#94a3b8', maxWidth: '500px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
              Experience sub-second evaluation, live coding, and persona pushback — 100% free with zero paywalls.
            </p>
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} style={{ display: 'inline-block' }}>
              <Link href="/signup" className="v2-btn-pill v2-btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}>
                Launch Practice Workspace →
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ── Minimal 4-Column Footer ───────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid #16181d', padding: '4rem 0 2rem', background: '#040405' }}>
        <div className="v2-container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2.5rem', marginBottom: '3rem' }}>
            <div>
              <Link href="/" className="v2-logo" style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>
                <div className="v2-logo-icon"><IconTerminal size={14} /></div>
                <span>MockPrep</span>
              </Link>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                Open mock interview platform engineered for software developers and product managers. Built with Next.js, Supabase, Groq, and Gemini.
              </p>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
                Interview Modes
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                <li>System Design &amp; Architecture</li>
                <li>STAR Method Behavioral</li>
                <li>DSA &amp; Live Coding Studio</li>
                <li>Case Study &amp; PM Rounds</li>
                <li>Stress &amp; Pushback Rounds</li>
              </ul>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
                Platform Links
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <li><button type="button" className="v2-nav-link" onClick={() => scrollTo('showcase')}>Showcase</button></li>
                <li><button type="button" className="v2-nav-link" onClick={() => scrollTo('architecture')}>Architecture</button></li>
                <li><button type="button" className="v2-nav-link" onClick={() => scrollTo('comparison')}>Metrics</button></li>
                <li><button type="button" className="v2-nav-link" onClick={() => scrollTo('faq')}>FAQ</button></li>
              </ul>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
                System Status
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)', width: 'fit-content' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                <span>All AI Systems Operational</span>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: '2rem', borderTop: '1px solid #16181d', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
            <div>© {new Date().getFullYear()} MockPrep. Open-source &amp; free forever.</div>
            <div>Engineered for software developers and tech leaders.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
