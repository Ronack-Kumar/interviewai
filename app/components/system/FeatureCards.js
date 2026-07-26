'use client';

import { motion } from 'framer-motion';
import { MAINTENANCE_CONFIG } from '../../../lib/maintenance.config';

export default function FeatureCards() {
  const { targetVersion, releaseNotes } = MAINTENANCE_CONFIG;

  return (
    <div style={{ margin: '3.5rem 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span style={{ fontSize: '0.725rem', color: '#38bdf8', fontFamily: 'var(--font-mono)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          RELEASE HIGHLIGHTS
        </span>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffffff', margin: '0.3rem 0 0.5rem', letterSpacing: '-0.02em' }}>
          What's Coming in {targetVersion}
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {releaseNotes.map((f, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            style={{
              background: '#0b0d12',
              border: '1px solid #1e2028',
              borderRadius: '8px',
              padding: '1.15rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>✓</span>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>{f.title}</h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.825rem', color: '#94a3b8', lineHeight: 1.5 }}>{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
