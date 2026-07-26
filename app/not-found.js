'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ background: '#08090b', color: '#f1f5f9', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-inter)' }}>
      <div style={{ background: '#0b0d12', border: '1px solid #1e2028', borderRadius: '12px', padding: '3rem 2rem', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 24px 48px rgba(0, 0, 0, 0.7)' }}>
        <div style={{ fontSize: '3rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>
          404
        </div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
          Page Not Found
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 1.75rem' }}>
          The interview route or report page you requested does not exist or has been moved.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <Link
            href="/app"
            style={{ background: '#f8fafc', color: '#090a0e', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}
          >
            Launch Practice Workspace
          </Link>
          <Link
            href="/"
            style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#f8fafc', border: '1px solid #1e293b', padding: '0.6rem 1.25rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none' }}
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
