'use client';

import Link from 'next/link';

const PRESETS = {
  'no-interviews': {
    icon: '🎙️',
    title: 'No Mock Interviews Yet',
    desc: 'You haven’t completed any interview practice rounds. Start a session to receive structured AI feedback.',
    ctaText: 'Start First Practice Session',
    ctaHref: '/app',
  },
  'no-reports': {
    icon: '📊',
    title: 'No Evaluation Reports Found',
    desc: 'Your performance evaluation scorecards and hiring committee reports will appear here after your first round.',
    ctaText: 'Launch Practice Session',
    ctaHref: '/app',
  },
  'no-resume': {
    icon: '📄',
    title: 'No Resume Uploaded',
    desc: 'Upload your resume PDF or paste a target job description to generate tailored role-specific questions.',
    ctaText: 'Upload Resume PDF',
    ctaHref: '/app',
  },
  'no-history': {
    icon: '⏳',
    title: 'No Session History Recorded',
    desc: 'All past transcript scores, STAR method component breakdowns, and hiring verdicts will be saved automatically.',
    ctaText: 'Start Interview',
    ctaHref: '/app',
  },
};

export default function EmptyState({ preset, icon, title, desc, ctaText, ctaHref, onAction }) {
  const data = preset ? PRESETS[preset] : { icon, title, desc, ctaText, ctaHref };

  return (
    <div
      style={{
        background: '#0b0d12',
        border: '1px solid #1e2028',
        borderRadius: '12px',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        maxWidth: '520px',
        margin: '2rem auto',
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '0.85rem' }}>{data.icon || '📌'}</div>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#ffffff', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
        {data.title || 'No Items Found'}
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
        {data.desc || 'There is no data to display in this view yet.'}
      </p>

      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          style={{ background: '#f8fafc', color: '#090a0e', border: 'none', padding: '0.55rem 1.25rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
        >
          {data.ctaText || 'Get Started'}
        </button>
      ) : data.ctaHref ? (
        <Link
          href={data.ctaHref}
          style={{ background: '#f8fafc', color: '#090a0e', border: 'none', padding: '0.55rem 1.25rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}
        >
          {data.ctaText || 'Get Started'}
        </Link>
      ) : null}
    </div>
  );
}
