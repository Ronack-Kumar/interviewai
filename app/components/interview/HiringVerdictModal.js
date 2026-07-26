'use client';

/**
 * app/components/interview/HiringVerdictModal.js
 *
 * Modal component presented upon completing a mock interview session,
 * displaying a hiring verdict from an automated hiring committee perspective.
 */

import React from 'react';
import Link from 'next/link';

function getVerdictBadgeStyle(verdict) {
  switch (verdict) {
    case 'Strong Hire':
    case 'Hire':
      return { background: 'var(--success-muted)', color: 'var(--success)', border: '1px solid var(--success)' };
    case 'Borderline':
      return { background: 'var(--warning-muted)', color: 'var(--warning)', border: '1px solid var(--warning)' };
    case 'No Hire':
    case 'Strong No Hire':
      return { background: 'var(--error-muted)', color: 'var(--error)', border: '1px solid var(--error)' };
    default:
      return { background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid var(--accent)' };
  }
}

export default function HiringVerdictModal({
  isOpen,
  onClose,
  hiringDecision,
  loading,
  error,
  sessionId,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="modal-card ui-card"
        style={{
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-line)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.75rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Hiring Committee Verdict
          </h2>
          <button
            type="button"
            className="ui-btn ui-btn-ghost"
            style={{ fontSize: '1.1rem', padding: '0.2rem 0.5rem', lineHeight: 1 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--muted)' }}>
            <span className="spinner" /> Analyzing full session performance…
          </div>
        ) : error ? (
          <div style={{ padding: '1.25rem', background: 'var(--error-muted)', border: '1px solid var(--error)', borderRadius: 'var(--radius-md)', color: 'var(--error)', fontSize: '0.9rem' }}>
            {error}
          </div>
        ) : hiringDecision ? (
          <div>
            {/* Verdict Badge & Score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-line)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Verdict
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.35rem 0.85rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    ...getVerdictBadgeStyle(hiringDecision.verdict),
                  }}
                >
                  {hiringDecision.verdict}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Overall Score
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
                  {hiringDecision.overall_score}/10
                </div>
              </div>
            </div>

            {/* Category Dimension Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {['communication', 'technical_depth', 'confidence'].map((cat) => {
                const item = hiringDecision[cat];
                if (!item) return null;
                const label = cat.replace('_', ' ');
                return (
                  <div key={cat} style={{ background: 'var(--bg-card)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-line)', textTransform: 'capitalize' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {item.rating}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Strengths & Weaknesses */}
            {hiringDecision.key_strength ? (
              <div style={{ marginBottom: '0.75rem', padding: '0.75rem 1rem', background: 'var(--success-muted)', borderLeft: '3px solid var(--success)', borderRadius: '0 var(--radius-md) var(--radius-md) 0', fontSize: '0.85rem' }}>
                <strong style={{ color: 'var(--success)' }}>Key Strength:</strong> {hiringDecision.key_strength}
              </div>
            ) : null}

            {hiringDecision.critical_weakness ? (
              <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--error-muted)', borderLeft: '3px solid var(--error)', borderRadius: '0 var(--radius-md) var(--radius-md) 0', fontSize: '0.85rem' }}>
                <strong style={{ color: 'var(--error)' }}>Area for Growth:</strong> {hiringDecision.critical_weakness}
              </div>
            ) : null}

            {/* Committee Summary */}
            {hiringDecision.summary ? (
              <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-primary)', background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-line)' }}>
                <strong style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  Committee Summary
                </strong>
                {hiringDecision.summary}
              </div>
            ) : null}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>
                Close
              </button>
              {sessionId ? (
                <Link href={`/report?session_id=${encodeURIComponent(sessionId)}`} className="ui-btn ui-btn-primary" style={{ textDecoration: 'none' }}>
                  Full Session Report →
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
