'use client';

/**
 * app/components/interview/FeedbackPanel.js
 *
 * Modular feedback card component displaying scores, dimension breakdown,
 * STAR method score, detailed critique, and ideal model answers.
 */

import React, { useState } from 'react';

function getScoreColor(score) {
  if (score >= 8) return 'var(--success)';
  if (score >= 6) return 'var(--accent)';
  if (score >= 4) return 'var(--warning)';
  return 'var(--error)';
}

export default function FeedbackPanel({ feedbackData, loading, error }) {
  const [showIdeal, setShowIdeal] = useState(false);

  if (loading) {
    return (
      <div className="feedback-panel card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)' }}>
        <span className="spinner" /> Evaluating your response with AI…
      </div>
    );
  }

  if (error) {
    return (
      <div className="feedback-panel card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--error)', background: 'var(--error-muted)' }}>
        <h4 style={{ margin: '0 0 0.5rem', color: 'var(--error)', fontSize: '0.95rem' }}>Evaluation Error</h4>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{error}</p>
      </div>
    );
  }

  if (!feedbackData) return null;

  const { score, accuracy, clarity, depth, star_score, feedback, scoreReason, idealAnswer } = feedbackData;
  const scoreColor = getScoreColor(score ?? 5);

  return (
    <div className="feedback-panel card" style={{ marginTop: '1.25rem', padding: '1.5rem', border: '1px solid var(--border-line)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)' }}>
      {/* Top Header Row with Score Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-line)' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>AI Performance Evaluation</h3>
          {scoreReason ? (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{scoreReason}</p>
          ) : null}
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
            {score ?? '—'}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>/10</span>
        </div>
      </div>

      {/* Dimension Breakdown Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {accuracy != null && (
          <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-line)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Accuracy</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{accuracy}%</div>
          </div>
        )}
        {clarity != null && (
          <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-line)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Clarity</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{clarity}%</div>
          </div>
        )}
        {depth != null && (
          <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-line)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Depth</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{depth}%</div>
          </div>
        )}
        {star_score != null && (
          <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-line)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>STAR Framework</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent)', marginTop: '0.2rem' }}>{star_score}/4</div>
          </div>
        )}
      </div>

      {/* Feedback Critique Text */}
      {feedback ? (
        <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          <strong>Feedback:</strong> {feedback}
        </div>
      ) : null}

      {/* Ideal Answer Toggle */}
      {idealAnswer ? (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-line)' }}>
          <button
            type="button"
            className="ui-btn ui-btn-ghost"
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
            onClick={() => setShowIdeal((prev) => !prev)}
          >
            {showIdeal ? 'Hide Ideal Model Answer ▲' : 'Show Ideal Model Answer ▼'}
          </button>
          {showIdeal ? (
            <div style={{ marginTop: '0.6rem', padding: '0.85rem', background: 'var(--bg-surface)', border: '1px solid var(--border-line)', borderRadius: '6px', fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
              <strong style={{ color: 'var(--accent)' }}>Model Answer:</strong>
              <div style={{ marginTop: '0.4rem' }}>{idealAnswer}</div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
