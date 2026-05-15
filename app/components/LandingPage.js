'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';

const MODES = [
  {
    id: 'technical',
    title: 'Technical',
    description: 'DSA, coding rounds, and problem-solving approach.',
    tags: ['Chat', 'Feedback'],
    popular: true,
    icon: 'code',
  },
  {
    id: 'behavioral',
    title: 'Behavioral',
    description: 'STAR method, HR questions, and culture fit.',
    tags: ['Chat', 'Voice'],
    popular: true,
    icon: 'users',
  },
  {
    id: 'system-design',
    title: 'System Design',
    description: 'Architecture, scalability, and trade-offs.',
    tags: ['Chat', 'Feedback'],
    icon: 'layers',
  },
  {
    id: 'case-study',
    title: 'Case Study',
    description: 'PM and consulting-style case rounds.',
    tags: ['Chat', 'Analysis'],
    icon: 'chart',
  },
  {
    id: 'resume-jd',
    title: 'Resume & JD',
    description: 'Questions tailored to your resume and job description.',
    tags: ['Upload', 'Tailored'],
    icon: 'file',
  },
  {
    id: 'stress',
    title: 'Stress Round',
    description: 'Rapid-fire and pressure scenarios.',
    tags: ['Chat', 'Timed'],
    icon: 'zap',
  },
];

const STEPS = [
  {
    num: 1,
    title: 'Choose your mode',
    text: 'Pick from technical, behavioral, system design, and more.',
  },
  {
    num: 2,
    title: 'Start the session',
    text: 'Chat or voice-based real-time interview simulation, no setup needed.',
  },
  {
    num: 3,
    title: 'Get feedback',
    text: 'Structured scoring with strengths, gaps, and improvement tips after every session.',
  },
];

const FEATURES = [
  {
    title: 'Free forever',
    text: 'Full access, always. No credit card, no upgrade prompts.',
    icon: 'gift',
  },
  {
    title: 'Instant start',
    text: 'Sign up and start your first session in under a minute.',
    icon: 'rocket',
  },
  {
    title: 'Structured feedback',
    text: 'JSON-scored responses with strengths and areas to improve.',
    icon: 'score',
  },
  {
    title: 'Session history',
    text: 'All your past sessions saved and tracked automatically.',
    icon: 'history',
  },
];

const STATS = [
  { value: '4', label: 'Interview modes' },
  { value: '50+', label: 'Practice questions' },
  { value: 'JSON', label: 'Structured scoring' },
  { value: '100%', label: 'Free' },
];

const FAQS = [
  {
    q: 'Is MockPrep really free?',
    a: 'Yes, fully free. No hidden tiers, no credit card required.',
  },
  {
    q: 'Do I need to sign up?',
    a: 'Yes, a free account lets us save your session history and track your progress.',
  },
  {
    q: 'What interview types are supported?',
    a: 'Technical, Behavioral, System Design, Case Study, Resume & JD, and Stress rounds.',
  },
  {
    q: 'How does the feedback work?',
    a: 'After each session you get a structured score with strengths, gaps, and tips to improve.',
  },
];

function ModeIcon({ name }) {
  const props = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'code':
      return (
        <svg {...props} aria-hidden>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case 'users':
      return (
        <svg {...props} aria-hidden>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'layers':
      return (
        <svg {...props} aria-hidden>
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...props} aria-hidden>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case 'file':
      return (
        <svg {...props} aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case 'zap':
      return (
        <svg {...props} aria-hidden>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    default:
      return null;
  }
}

function FeatureIcon({ name }) {
  const props = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'gift':
      return (
        <svg {...props} aria-hidden>
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
      );
    case 'rocket':
      return (
        <svg {...props} aria-hidden>
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
      );
    case 'score':
      return (
        <svg {...props} aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case 'history':
      return (
        <svg {...props} aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    default:
      return null;
  }
}

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const scrollTo = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="landing" data-theme="light">
      <header className="landing-nav">
        <div className="landing-nav__inner">
          <Link href="/" className="landing-logo">
            MockPrep
          </Link>
          <nav className="landing-nav__links" aria-label="Main">
            <button type="button" className="landing-nav__link" onClick={() => scrollTo('how-it-works')}>
              How it works
            </button>
            <button type="button" className="landing-nav__link" onClick={() => scrollTo('features')}>
              Features
            </button>
            <Link href="/login" className="landing-nav__login">
              Login
            </Link>
            <Link href="/signup" className="landing-btn landing-btn--primary landing-btn--sm">
              Start free
            </Link>
          </nav>
          <div className="landing-nav__mobile">
            <Link href="/signup" className="landing-btn landing-btn--primary landing-btn--sm">
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-container landing-hero__inner">
            <h1 className="landing-hero__title">Everything you need to ace your interviews.</h1>
            <p className="landing-hero__subtitle">
              Real-time AI feedback, unlimited practice.{' '}
              <strong>Free forever — no subscriptions, no paywalls.</strong>
            </p>
            <div className="landing-hero__actions">
              <Link href="/signup" className="landing-btn landing-btn--primary">
                Start practicing
              </Link>
              <button
                type="button"
                className="landing-btn landing-btn--outline"
                onClick={() => scrollTo('how-it-works')}
              >
                See how it works
              </button>
            </div>
            <p className="landing-hero__proof">Free forever · No credit card · Instant access</p>
          </div>
        </section>

        <section className="landing-section" aria-labelledby="modes-heading">
          <div className="landing-container">
            <h2 id="modes-heading" className="landing-section__title landing-section__title--center">
              Practice by interview type
            </h2>
            <p className="landing-section__lead landing-section__lead--center">
              Six modes built for the rounds you will actually face.
            </p>
            <div className="landing-modes-grid">
              {MODES.map((mode) => (
                <article key={mode.id} className="landing-mode-card">
                  {mode.popular ? <span className="landing-badge">Popular</span> : null}
                  <div className="landing-mode-card__icon">
                    <ModeIcon name={mode.icon} />
                  </div>
                  <h3 className="landing-mode-card__title">{mode.title}</h3>
                  <p className="landing-mode-card__desc">{mode.description}</p>
                  <div className="landing-tags">
                    {mode.tags.map((tag) => (
                      <span key={tag} className="landing-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="landing-section landing-section--muted">
          <div className="landing-container">
            <h2 className="landing-section__title landing-section__title--center">How it works</h2>
            <p className="landing-section__lead landing-section__lead--center">
              Three steps from practice to improvement.
            </p>
            <ol className="landing-steps">
              {STEPS.map((step) => (
                <li key={step.num} className="landing-step">
                  <span className="landing-step__num">{step.num}</span>
                  <h3 className="landing-step__title">{step.title}</h3>
                  <p className="landing-step__text">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="landing-container">
            <h2 className="landing-section__title landing-section__title--center">Why MockPrep</h2>
            <p className="landing-section__lead landing-section__lead--center">
              Built for serious prep — without the paywall.
            </p>
            <div className="landing-features-grid">
              {FEATURES.map((f) => (
                <article key={f.title} className="landing-feature-card">
                  <div className="landing-feature-card__icon">
                    <FeatureIcon name={f.icon} />
                  </div>
                  <h3 className="landing-feature-card__title">{f.title}</h3>
                  <p className="landing-feature-card__text">{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-stats" aria-label="Platform stats">
          <div className="landing-container landing-stats__inner">
            {STATS.map((s) => (
              <div key={s.label} className="landing-stat">
                <span className="landing-stat__value">{s.value}</span>
                <span className="landing-stat__label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="landing-section landing-section--muted">
          <div className="landing-container landing-faq-wrap">
            <h2 className="landing-section__title landing-section__title--center">FAQ</h2>
            <p className="landing-section__lead landing-section__lead--center">
              Common questions about MockPrep.
            </p>
            <div className="landing-faq">
              {FAQS.map((item, i) => {
                const open = openFaq === i;
                return (
                  <div key={item.q} className={`landing-faq__item ${open ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="landing-faq__trigger"
                      aria-expanded={open}
                      onClick={() => setOpenFaq(open ? null : i)}
                    >
                      <span>{item.q}</span>
                      <span className="landing-faq__chevron" aria-hidden>
                        {open ? '−' : '+'}
                      </span>
                    </button>
                    {open ? <div className="landing-faq__panel">{item.a}</div> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="landing-cta-banner">
          <div className="landing-container landing-cta-banner__inner">
            <h2 className="landing-cta-banner__title">Your next role is closer than you think.</h2>
            <p className="landing-cta-banner__text">Start practicing for free — no subscriptions, ever.</p>
            <Link href="/signup" className="landing-btn landing-btn--primary landing-btn--lg">
              Create free account
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer__inner">
          <div className="landing-footer__brand">
            <span className="landing-logo">MockPrep</span>
            <p className="landing-footer__tagline">AI-powered mock interviews. Free forever.</p>
          </div>
          <nav className="landing-footer__nav" aria-label="Footer">
            <button type="button" onClick={() => scrollTo('features')}>
              Features
            </button>
            <span className="landing-footer__dot" aria-hidden>
              ·
            </span>
            <button type="button" onClick={() => scrollTo('how-it-works')}>
              How it works
            </button>
            <span className="landing-footer__dot" aria-hidden>
              ·
            </span>
            <button type="button" onClick={() => scrollTo('faq')}>
              FAQ
            </button>
            <span className="landing-footer__dot" aria-hidden>
              ·
            </span>
            <Link href="/login">Login</Link>
            <span className="landing-footer__dot" aria-hidden>
              ·
            </span>
            <Link href="/signup">Sign up</Link>
          </nav>
          <p className="landing-footer__copy">© 2025 MockPrep. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
