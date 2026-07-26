'use client';

import React from 'react';
import Link from 'next/link';
import { classifyError } from '../../../lib/errorClassifier';

export default class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[GlobalErrorBoundary] Caught uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const details = classifyError(this.state.error);

      return (
        <div style={{ background: '#08090b', color: '#f1f5f9', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-inter)' }}>
          <div style={{ background: '#0b0d12', border: `1px solid ${details.badgeBorder}`, borderRadius: '12px', padding: '2.5rem', maxWidth: '540px', width: '100%', textAlign: 'center', boxShadow: '0 24px 48px rgba(0, 0, 0, 0.7)' }}>
            <div style={{ width: 44, height: 44, borderRadius: '10px', background: details.badgeBg, border: `1px solid ${details.badgeBorder}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: details.color, fontSize: '1.4rem', marginBottom: '1.25rem' }}>
              {details.icon}
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
              {details.title}
            </h2>

            <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              {details.explanation}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{ background: '#f8fafc', color: '#090a0e', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
              >
                {details.primaryAction}
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
              onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
            >
              {this.state.showDetails ? 'Hide Error Details' : 'Inspect Error Details'}
            </button>

            {this.state.showDetails && this.state.error && (
              <div style={{ marginTop: '1rem', textAlign: 'left', background: '#07080a', border: '1px solid #16181d', borderRadius: '6px', padding: '0.85rem', fontSize: '0.75rem', color: details.color, fontFamily: 'var(--font-mono)', overflowX: 'auto' }}>
                {this.state.error.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
