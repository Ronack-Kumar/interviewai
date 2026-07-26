'use client';

import { motion } from 'framer-motion';

export default function CameraStatePill({ state = 'off', onClick }) {
  const isActive = state === 'active';
  const isDenied = state === 'denied';
  const isRequesting = state === 'requesting';

  const dotColor = isActive ? 'var(--success)' : isDenied ? 'var(--error)' : isRequesting ? 'var(--warning)' : 'var(--text-muted)';

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.35rem 0.8rem',
        borderRadius: '6px',
        background: isActive ? 'var(--success-muted)' : 'var(--bg-surface)',
        border: `1px solid ${isActive ? 'var(--success)' : 'var(--border-line)'}`,
        color: isActive ? 'var(--success)' : 'var(--text-primary)',
        fontSize: '0.775rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.18s ease',
      }}
    >
      <span style={{ fontSize: '0.85rem' }}>📷</span>
      <motion.span
        animate={isActive ? { opacity: [0.4, 1, 0.4] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor }}
      />
      <span style={{ fontFamily: 'var(--font-mono)' }}>
        {isActive ? 'Camera Active' : isDenied ? 'Camera Access Denied' : isRequesting ? 'Requesting Permission...' : 'Camera Off'}
      </span>
    </button>
  );
}
