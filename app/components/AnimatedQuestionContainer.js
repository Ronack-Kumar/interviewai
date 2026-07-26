'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function AnimatedQuestionContainer({
  questionIndex = 0,
  totalQuestions = 8,
  submittedCount = 0,
  mode = 'technical',
  persona = 'standard',
  questionText = '',
}) {
  const progressPct = Math.min(100, Math.round((submittedCount / totalQuestions) * 100));

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <div style={{ fontSize: '0.725rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600, textTransform: 'uppercase' }}>
          QUESTION 0{questionIndex + 1} / 0{totalQuestions} • {mode.toUpperCase()} MODE ({persona.replace('_', ' ').toUpperCase()} STYLE)
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {progressPct}% Completed
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ height: '4px', background: 'var(--border-line)', borderRadius: '2px', overflow: 'hidden', marginBottom: '1rem' }}>
        <motion.div
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ height: '100%', background: 'var(--accent)', borderRadius: '2px' }}
        />
      </div>

      {/* Question Text Crossfade */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-line)', borderRadius: '10px', padding: '1.25rem', minHeight: '90px', transition: 'background 0.2s ease, border-color 0.2s ease' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${questionIndex}-${questionText.slice(0, 15)}`}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}
          >
            {questionText || 'Loading practice question...'}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
