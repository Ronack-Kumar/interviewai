'use client';

/**
 * app/components/interview/TimerWidget.js
 *
 * Timer widget component displaying remaining session time with warning indicators.
 */

import React from 'react';

function formatTimer(sec) {
  if (sec == null) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TimerWidget({ remainingSec }) {
  if (remainingSec == null) return null;

  const isWarning = remainingSec < 300; // Under 5 mins

  return (
    <div
      className={`sidebar-timer ${isWarning ? 'sidebar-timer--warn' : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.35rem 0.7rem',
        borderRadius: 'var(--radius-md)',
        background: isWarning ? 'var(--error-muted)' : 'var(--bg-surface)',
        border: `1px solid ${isWarning ? 'var(--error)' : 'var(--border-line)'}`,
        color: isWarning ? 'var(--error)' : 'var(--text-primary)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.85rem',
        fontWeight: 600,
      }}
      title="Session Timer"
    >
      <span style={{ fontSize: '0.75rem' }}>⏱</span>
      <span>{formatTimer(remainingSec)}</span>
    </div>
  );
}
