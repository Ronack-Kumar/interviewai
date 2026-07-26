'use client';

import { MAINTENANCE_CONFIG } from '../../../lib/maintenance.config';

export default function DeploymentCard() {
  const { currentVersion, targetVersion, startedAt, expectedReturnTime, status } = MAINTENANCE_CONFIG;

  const statusBadges = {
    SCHEDULED_MAINTENANCE: { label: 'Scheduled Maintenance', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.25)' },
    EMERGENCY_MAINTENANCE: { label: 'Emergency Maintenance', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)', border: 'rgba(244, 63, 94, 0.25)' },
    COMPLETED: { label: 'Deployment Complete', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)' },
  };

  const currentBadge = statusBadges[status] || statusBadges.SCHEDULED_MAINTENANCE;

  return (
    <div
      style={{
        background: '#0b0d12',
        border: '1px solid #1e2028',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <span
            style={{
              fontSize: '0.725rem',
              color: currentBadge.color,
              background: currentBadge.bg,
              border: `1px solid ${currentBadge.border}`,
              padding: '0.2rem 0.6rem',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              display: 'inline-block',
              marginBottom: '0.5rem',
            }}
          >
            ● {currentBadge.label}
          </span>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
            Upgrading {currentVersion} → {targetVersion}
          </h3>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', background: '#07080a', border: '1px solid #16181d', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.675rem', color: '#64748b', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>STARTED AT</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>{startedAt}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.675rem', color: '#64748b', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>EXPECTED RETURN</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>{expectedReturnTime}</div>
        </div>
      </div>
    </div>
  );
}
