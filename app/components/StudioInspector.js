'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

function IconLightbulb({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A6 6 0 1 0 7.5 11.5c.76.76 1.23 1.52 1.41 2.5" />
    </svg>
  );
}

function IconChart({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="18" y="3" width="4" height="18" />
      <rect x="10" y="8" width="4" height="13" />
      <rect x="2" y="13" width="4" height="8" />
    </svg>
  );
}

export default function StudioInspector({
  feedbackData = null,
  feedbackLoading = false,
  feedbackError = null,
  sessionHistory = [],
  onSelectHistoryItem,
  onExportReport,
  questionHint = '',
  hintLoading = false,
  onViewReport,
}) {
  return (
    <aside
      style={{
        width: '340px',
        background: 'var(--bg-sidebar)',
        borderLeft: '1px solid var(--border-line)',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
          EVALUATION INSPECTOR
        </span>
        {sessionHistory.length > 0 && (
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {sessionHistory.length} Saved
          </span>
        )}
      </div>

      <div style={{ padding: '1.25rem', flex: 1 }}>
        {/* Loading State */}
        {feedbackLoading && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-line)', borderRadius: '8px', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border-line)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Evaluating Answer...</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Analyzing STAR structure &amp; complexity...</div>
            <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { 100% { transform: rotate(360deg); } }' }} />
          </div>
        )}

        {/* Error State */}
        {feedbackError && (
          <div style={{ background: 'var(--error-muted)', border: '1px solid var(--error)', borderRadius: '8px', padding: '1rem', fontSize: '0.8rem', color: 'var(--error)' }}>
            <strong>Evaluation Disruption:</strong> {feedbackError}
          </div>
        )}

        {/* Question Hint Drawer */}
        {hintLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-line)', borderRadius: '8px', padding: '0.85rem', fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '1rem' }}>
            <IconLightbulb size={14} /> Generating architectural hint...
          </div>
        )}
        {questionHint && !hintLoading && (
          <div style={{ background: 'var(--accent-muted)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconLightbulb size={12} /> ARCHITECTURAL HINT
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{questionHint}</div>
          </div>
        )}

        {/* Active Feedback Card */}
        {feedbackData && !feedbackLoading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-line)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-line)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Answer Scorecard</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                  {feedbackData.score != null ? feedbackData.score : '—'} / 10
                </span>
              </div>

              {/* STAR / Category breakdown */}
              {feedbackData.starScore && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'var(--accent-muted)', padding: '0.4rem 0.65rem', borderRadius: '4px', border: '1px solid var(--accent)', marginBottom: '0.85rem' }}>
                  ★ {feedbackData.starScore}
                </div>
              )}

              {/* Critique & Strengths */}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.85rem' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>Evaluation Feedback:</strong>
                {feedbackData.critique || feedbackData.feedback || 'Solid technical structure. Good callout of boundary edge cases.'}
              </div>

              {feedbackData.idealResponse && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-line)', borderRadius: '6px', padding: '0.75rem', fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>Optimal Answer Model:</strong>
                  {feedbackData.idealResponse}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Session History Timeline */}
        {sessionHistory.length > 0 && (
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
              SESSION TIMELINE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sessionHistory.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectHistoryItem && onSelectHistoryItem(item)}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-line)',
                    borderRadius: '6px',
                    padding: '0.65rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    <span>Q0{idx + 1}</span>
                    <span style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{item.score ?? '—'}/10</span>
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.question}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!feedbackData && !feedbackLoading && sessionHistory.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', opacity: 0.7 }}><IconChart size={24} /></div>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Evaluation Ready</div>
            <div style={{ fontSize: '0.775rem', lineHeight: 1.5 }}>
              Submit an answer to view instant STAR breakdowns, AI scorecards, and model responses.
            </div>
          </div>
        )}
      </div>

      {/* Export Report CTA */}
      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-line)', background: 'var(--bg-card)' }}>
        <button
          type="button"
          onClick={onViewReport}
          style={{
            display: 'block',
            width: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-line)',
            color: 'var(--text-primary)',
            textAlign: 'center',
            padding: '0.55rem',
            borderRadius: '6px',
            fontSize: '0.825rem',
            fontWeight: 500,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          View Full Scorecard Report →
        </button>
      </div>
    </aside>
  );
}
