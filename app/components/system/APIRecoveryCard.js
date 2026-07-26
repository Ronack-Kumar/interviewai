'use client';

import { classifyError } from '../../../lib/errorClassifier';

export default function APIRecoveryCard({
  error,
  status,
  onRetry,
  onFailover,
}) {
  const details = classifyError(error, status);

  return (
    <div
      style={{
        background: '#0b0d12',
        border: `1px solid ${details.badgeBorder}`,
        borderRadius: '10px',
        padding: '1.25rem',
        margin: '1rem 0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ width: 34, height: 34, borderRadius: '6px', background: details.badgeBg, border: `1px solid ${details.badgeBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
            {details.icon}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>{details.title}</h4>
            <span style={{ fontSize: '0.725rem', color: details.color, fontFamily: 'var(--font-mono)' }}>{details.type}</span>
          </div>
        </div>
        <span style={{ fontSize: '0.7rem', color: details.color, background: details.badgeBg, border: `1px solid ${details.badgeBorder}`, padding: '0.2rem 0.5rem', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
          Action Required
        </span>
      </div>

      <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.55, margin: '0 0 1rem' }}>
        {details.explanation}
      </p>

      <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
        {details.canRetry && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              background: '#f8fafc',
              color: '#090a0e',
              border: 'none',
              padding: '0.45rem 1rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {details.primaryAction}
          </button>
        )}
        {details.canFailover && onFailover && (
          <button
            type="button"
            onClick={onFailover}
            style={{
              background: 'rgba(56, 189, 248, 0.1)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              padding: '0.45rem 1rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Switch AI Provider Failover
          </button>
        )}
      </div>
    </div>
  );
}
