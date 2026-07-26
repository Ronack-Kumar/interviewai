'use client';

import { MAINTENANCE_CONFIG } from '../../../lib/maintenance.config';

export default function SystemStatus() {
  const { systemStatus } = MAINTENANCE_CONFIG;
  const items = Object.values(systemStatus);

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
      <div style={{ fontSize: '0.725rem', color: '#38bdf8', fontFamily: 'var(--font-mono)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.04em' }}>
        INFRASTRUCTURE HEALTH
      </div>
      <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
        System Status
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {items.map((item, i) => {
          const isOperational = item.status === 'operational';
          const isMaintenance = item.status === 'maintenance';
          const dotColor = isOperational ? '#10b981' : isMaintenance ? '#f59e0b' : '#f43f5e';
          
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.55rem 0.85rem',
                background: '#07080a',
                borderRadius: '6px',
                border: '1px solid #16181d',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#e2e8f0', fontWeight: 500 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: dotColor,
                    display: 'inline-block',
                    boxShadow: `0 0 6px ${dotColor}`,
                  }}
                />
                <span>{item.name}</span>
              </div>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: dotColor }}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
