'use client';

import { MAINTENANCE_CONFIG } from '../../../lib/maintenance.config';

export default function DeploymentLogs() {
  const { deploymentSummary } = MAINTENANCE_CONFIG;

  return (
    <div
      style={{
        background: '#07080a',
        border: '1px solid #1e2028',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 1rem',
          background: '#0a0c10',
          borderBottom: '1px solid #16181d',
          fontSize: '0.75rem',
          color: '#64748b',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f43f5e' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
        </div>
        <span>deployment_summary.log</span>
      </div>

      <div
        style={{
          padding: '1rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          lineHeight: 1.6,
          color: '#cbd5e1',
        }}
      >
        {deploymentSummary.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.4rem', alignItems: 'flex-start' }}>
            <span style={{ color: '#64748b', fontSize: '0.75rem', minWidth: '70px' }}>[{item.time}]</span>
            <span style={{ color: item.done ? '#10b981' : item.active ? '#38bdf8' : '#64748b', fontWeight: 600 }}>
              {item.done ? '✓' : item.active ? '●' : '○'}
            </span>
            <span style={{ color: item.active ? '#ffffff' : '#cbd5e1' }}>{item.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
