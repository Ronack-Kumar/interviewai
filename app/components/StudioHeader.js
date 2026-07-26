'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import WorkspaceStateBadge from './WorkspaceStateBadge';

function IconTerminal({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function IconSettings({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function IconClock({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconMessage({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconMoon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconSun({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconX({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function StudioHeader({
  mode = 'technical',
  persona = 'standard',
  questionIndex = 0,
  totalQuestions = 8,
  timerRemainingSec = null,
  sessionState = 'idle',
  onThemeToggle,
  isDark = true,
  onOpenSetupModal,
  onOpenFeedbackModal,
}) {
  const modeLabels = {
    technical: 'Technical',
    hr: 'HR / Behavioral',
    case: 'Case Study',
    stress: 'Stress Round',
    coding: 'Coding Studio',
  };

  const personaTitles = {
    standard: 'Standard',
    aggressive_faang: 'Aggressive FAANG',
    friendly_startup: 'Startup CTO',
    silent_skeptical: 'Silent & Skeptical',
    strict_hr: 'Strict HR',
    tcs_infosys: 'TCS/Infosys',
  };

  const formattedTimer =
    timerRemainingSec != null
      ? `${String(Math.floor(timerRemainingSec / 60)).padStart(2, '0')}:${String(timerRemainingSec % 60).padStart(2, '0')}`
      : null;

  return (
    <header
      style={{
        height: '56px',
        background: 'var(--bg-sidebar)',
        borderBottom: '1px solid var(--border-line)',
        padding: '0 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Left Brand & Mode / Persona Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem' }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <IconTerminal size={14} />
          </div>
          <span>MockPrep</span>
        </Link>

        <div style={{ height: '16px', width: '1px', background: 'var(--border-line)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'var(--accent-muted)', border: '1px solid var(--accent)', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600, opacity: 0.9 }}>
            {modeLabels[mode] || 'Technical'}
          </span>
          <button
            type="button"
            onClick={onOpenSetupModal}
            title="Click to configure interviewer persona & settings"
            style={{
              fontSize: '0.75rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '4px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-line)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'border-color 0.15s ease',
            }}
          >
            <span>{personaTitles[persona] || 'Standard'}</span>
            <span style={{ opacity: 0.6, display: 'flex', alignItems: 'center' }}><IconSettings size={13} /></span>
          </button>
        </div>
      </div>

      {/* Center Live Session State */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <WorkspaceStateBadge state={sessionState} />

        {formattedTimer && (
          <div style={{ fontSize: '0.775rem', fontFamily: 'var(--font-mono)', color: timerRemainingSec < 300 ? 'var(--error)' : 'var(--accent)', background: 'var(--bg-surface)', border: '1px solid var(--border-line)', padding: '0.25rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconClock size={14} /> {formattedTimer}
          </div>
        )}
      </div>

      {/* Right Navigation & Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link
          href="/rooms"
          style={{
            fontSize: '0.775rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-line)',
          }}
          title="Peer practice rooms with Supabase Realtime"
        >
          Peer Rooms
        </Link>

        <Link
          href="/live-interview"
          style={{
            fontSize: '0.775rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-line)',
          }}
          title="Voice & text live mock interview"
        >
          Live Interview
        </Link>

        <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          Q <strong style={{ color: 'var(--text-primary)' }}>{questionIndex + 1}</strong> / {totalQuestions}
        </div>

        {onOpenFeedbackModal && (
          <button
            type="button"
            onClick={onOpenFeedbackModal}
            title="Send feedback or report a bug"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-line)',
              color: 'var(--text-secondary)',
              padding: '0.25rem 0.55rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconMessage size={15} />
          </button>
        )}

        <button
          type="button"
          onClick={onThemeToggle}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-line)',
            color: 'var(--text-secondary)',
            padding: '0.25rem 0.6rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {isDark ? <><IconMoon size={14} /> Dark</> : <><IconSun size={14} /> Light</>}
        </button>

        <Link
          href="/"
          style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          Exit Studio <IconX size={14} />
        </Link>
      </div>
    </header>
  );
}
