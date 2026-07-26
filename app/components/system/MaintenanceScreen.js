'use client';

import { motion } from 'framer-motion';
import { MAINTENANCE_CONFIG } from '../../../lib/maintenance.config';
import DeploymentCard from './DeploymentCard';
import SystemStatus from './SystemStatus';
import DeploymentLogs from './DeploymentLogs';
import FeatureCards from './FeatureCards';
import WaitActivities from './WaitActivities';

function IconTerminal({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

export default function MaintenanceScreen({ children }) {
  const { enabled, reason, status } = MAINTENANCE_CONFIG;

  if (!enabled) {
    return <>{children}</>;
  }

  const isEmergency = status === 'EMERGENCY_MAINTENANCE';

  return (
    <div style={{ background: '#08090b', color: '#f1f5f9', minHeight: '100vh', fontFamily: 'var(--font-inter)', letterSpacing: '-0.015em', WebkitFontSmoothing: 'antialiased' }}>
      {/* Hairline Glass Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', background: 'rgba(8, 9, 11, 0.85)', borderBottom: '1px solid #16181d' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 1.5rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 600, fontSize: '1rem', color: '#ffffff' }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: '#1e293b', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <IconTerminal size={15} />
            </div>
            <span>MockPrep</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: isEmergency ? '#f43f5e' : '#f59e0b', background: isEmergency ? 'rgba(244, 63, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)', padding: '0.35rem 0.75rem', borderRadius: '4px', border: `1px solid ${isEmergency ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`, fontFamily: 'var(--font-mono)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isEmergency ? '#f43f5e' : '#f59e0b', boxShadow: `0 0 8px ${isEmergency ? '#f43f5e' : '#f59e0b'}` }} />
            <span>{isEmergency ? 'EMERGENCY MAINTENANCE' : 'SCHEDULED MAINTENANCE'}</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1160px', margin: '0 auto', padding: '3.5rem 1.5rem 6rem' }}>
        {/* Honest Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 3.5rem' }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid #1e293b', color: '#94a3b8', fontSize: '0.775rem', fontWeight: 500, marginBottom: '1.25rem', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: isEmergency ? '#f43f5e' : '#f59e0b' }}>●</span> SYSTEM UPGRADE IN PROGRESS
          </div>

          <h1 style={{ fontSize: 'clamp(2.25rem, 4vw, 3.25rem)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.035em', color: '#ffffff', margin: '0 0 1rem' }}>
            MockPrep is temporarily unavailable.
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
            {reason || "We're upgrading the platform to deliver a better interview experience."}
          </p>
        </motion.div>

        {/* Verifiable Deployment Details & System Health */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <DeploymentCard />
          <SystemStatus />
        </div>

        {/* Verifiable Deployment Summary */}
        <div style={{ marginBottom: '2.5rem' }}>
          <DeploymentLogs />
        </div>

        {/* Real Release Highlights */}
        <FeatureCards />

        {/* Functional Practice Activity Suite */}
        <WaitActivities />
      </main>

      {/* Minimal Footer */}
      <footer style={{ borderTop: '1px solid #16181d', padding: '2.5rem 0', background: '#040405', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 1.5rem' }}>
          © {new Date().getFullYear()} MockPrep. Verifiable Status Engine • All systems monitored.
        </div>
      </footer>
    </div>
  );
}
