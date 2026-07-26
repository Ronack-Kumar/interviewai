'use client';

import { motion } from 'framer-motion';

const STATES = {
  idle: { label: 'Ready to Practice', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.08)', border: 'rgba(56, 189, 248, 0.2)' },
  preparing: { label: 'Initializing Session Parameters...', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)' },
  generating_question: { label: 'Groq/Gemini Ingestion Engine Ingesting...', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.08)', border: 'rgba(56, 189, 248, 0.2)' },
  user_speaking: { label: 'Listening to Candidate Voice Input...', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)' },
  ai_thinking: { label: 'AI Interviewer Analyzing Answer...', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.08)', border: 'rgba(129, 140, 248, 0.2)' },
  evaluating: { label: 'Calculating Accuracy & STAR Breakdown...', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)' },
  completed: { label: 'Session Completed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)' },
};

export default function WorkspaceStateBadge({ state = 'idle' }) {
  const current = STATES[state] || STATES.idle;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.3rem 0.75rem',
        borderRadius: '6px',
        background: current.bg,
        border: `1px solid ${current.border}`,
        fontSize: '0.75rem',
        fontWeight: 600,
        color: current.color,
        fontFamily: 'var(--font-mono)',
      }}
    >
      <motion.span
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: current.color,
          boxShadow: `0 0 8px ${current.color}`,
        }}
      />
      <span>{current.label}</span>
    </motion.div>
  );
}
