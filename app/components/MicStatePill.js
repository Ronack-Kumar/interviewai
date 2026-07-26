'use client';

import { motion } from 'framer-motion';

export default function MicStatePill({ state = 'idle', onClick }) {
  const isRecording = state === 'recording';
  const isDenied = state === 'denied';
  const isProcessing = state === 'processing';

  const dotColor = isRecording ? 'var(--error)' : isDenied ? 'var(--error)' : isProcessing ? 'var(--warning)' : 'var(--text-muted)';

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
        background: isRecording ? 'var(--error-muted)' : 'var(--bg-surface)',
        border: `1px solid ${isRecording ? 'var(--error)' : 'var(--border-line)'}`,
        color: isRecording ? 'var(--error)' : 'var(--text-primary)',
        fontSize: '0.775rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.18s ease',
      }}
    >
      <span style={{ fontSize: '0.85rem' }}>🎙️</span>
      {isRecording ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '14px' }}>
          {[10, 14, 8, 16, 12].map((h, i) => (
            <motion.span
              key={i}
              animate={{ height: [`${h}px`, `${Math.max(4, (h * 1.5) % 16)}px`, `${h}px`] }}
              transition={{ duration: 0.8 + i * 0.15, repeat: Infinity }}
              style={{ width: '2px', background: 'var(--error)', borderRadius: '1px' }}
            />
          ))}
        </div>
      ) : (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor }} />
      )}
      <span style={{ fontFamily: 'var(--font-mono)' }}>
        {isRecording ? 'Recording Voice...' : isDenied ? 'Mic Permission Denied' : isProcessing ? 'Processing STT...' : 'Voice Input Ready'}
      </span>
    </button>
  );
}
