'use client';

import Link from 'next/link';

const SUCCESS_PRESETS = {
  'interview-completed': {
    title: 'Interview Session Completed!',
    desc: 'Your responses have been evaluated against hiring committee standards. Your scorecard report is ready.',
    ctaText: 'View Evaluation Report',
    ctaHref: '/report',
  },
  'report-generated': {
    title: 'Scorecard Generated Successfully',
    desc: 'STAR component verification, accuracy metrics, and key growth areas have been calculated.',
    ctaText: 'View Scorecard',
    ctaHref: '/report',
  },
  'resume-uploaded': {
    title: 'Resume Parsed Successfully',
    desc: 'Your core skills and past experience have been extracted. Tailored questions are now available.',
    ctaText: 'Start Tailored Practice',
    ctaHref: '/app',
  },
};

export default function SuccessState({ preset, title, desc, ctaText, ctaHref }) {
  const data = preset ? SUCCESS_PRESETS[preset] : { title, desc, ctaText, ctaHref };

  return (
    <div
      style={{
        background: '#0b0d12',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '12px',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        maxWidth: '520px',
        margin: '2rem auto',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#10b981',
          fontSize: '1.5rem',
          margin: '0 auto 1.25rem',
        }}
      >
        ✓
      </div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
        {data.title || 'Action Completed'}
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
        {data.desc || 'Your request was processed successfully.'}
      </p>

      {data.ctaHref && (
        <Link
          href={data.ctaHref}
          style={{
            background: '#10b981',
            color: '#090a0e',
            border: 'none',
            padding: '0.6rem 1.35rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          {data.ctaText || 'Continue'}
        </Link>
      )}
    </div>
  );
}
