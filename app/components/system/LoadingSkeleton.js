'use client';

export default function LoadingSkeleton({ type = 'card', label = 'Loading MockPrep workspace...' }) {
  if (type === 'progress') {
    return (
      <div style={{ background: '#0b0d12', border: '1px solid #1e2028', borderRadius: '10px', padding: '2rem', textAlign: 'center', maxWidth: '480px', margin: '2rem auto' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #1e293b', borderTopColor: '#38bdf8', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', margin: '0 0 0.4rem' }}>{label}</h4>
        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Initializing speech-to-text audio pipeline &amp; AI evaluation router...</p>
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { 100% { transform: rotate(360deg); } }' }} />
      </div>
    );
  }

  return (
    <div style={{ background: '#0b0d12', border: '1px solid #1e2028', borderRadius: '10px', padding: '1.25rem', margin: '1rem 0' }}>
      <div style={{ height: '18px', width: '40%', background: '#16181d', borderRadius: '4px', marginBottom: '1rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: '14px', width: '85%', background: '#16181d', borderRadius: '4px', marginBottom: '0.6rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: '14px', width: '65%', background: '#16181d', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <style dangerouslySetInnerHTML={{ __html: '@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }' }} />
    </div>
  );
}
