'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ErrorPage({ error, reset }) {
  const [showTrace, setShowTrace] = useState(false);

  useEffect(() => {
    console.error('[MockPrep Root Error Page]:', error);
  }, [error]);

  return (
    <div style={{ background: '#08090b', color: '#f1f5f9', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-inter)' }}>
      <div style={{ background: '#0b0d12', border: '1px solid #1e2028', borderRadius: '12px', padding: '3rem 2rem', maxWidth: '520px', width: '100%', textAlign: 'center', boxShadow: '0 24px 48px rgba(0, 0, 0, 0.7)' }}>
        <div style={{ fontSize: '3rem', fontWeight: 800, color: '#f43f5e', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>
          500
        </div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
          Server &amp; Application Error
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 1.75rem' }}>
          An unexpected error occurred during page rendering. MockPrep's error recovery mechanism has trapped the exception.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{ background: '#f8fafc', color: '#090a0e', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Retry Request
          </button>
          <Link
            href="/app"
            style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#f8fafc', border: '1px solid #1e293b', padding: '0.6rem 1.25rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none' }}
          >
            Return to Workspace
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setShowTrace(!showTrace)}
          style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
        >
          {showTrace ? 'Hide Exception Details' : 'View Exception Details'}
        </button>

        {showTrace && error && (
          <div style={{ marginTop: '1rem', textAlign: 'left', background: '#07080a', border: '1px solid #16181d', borderRadius: '6px', padding: '0.85rem', fontSize: '0.75rem', color: '#f43f5e', fontFamily: 'var(--font-mono)', overflowX: 'auto' }}>
            {error.message || error.toString()}
          </div>
        )}
      </div>
    </div>
  );
}
