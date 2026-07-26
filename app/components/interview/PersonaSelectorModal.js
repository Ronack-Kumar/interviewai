'use client';

/**
 * app/components/interview/PersonaSelectorModal.js
 *
 * Modal component allowing users to choose an interviewer persona
 * prior to or during an interview session.
 */

import React from 'react';

export const PERSONA_OPTIONS = [
  { id: 'standard', title: 'Standard', subtitle: 'Balanced, professional, standard bar' },
  {
    id: 'aggressive_faang',
    title: 'Aggressive FAANG',
    subtitle: 'Challenges every answer, asks hard follow-ups, penalizes vagueness',
  },
  {
    id: 'friendly_startup',
    title: 'Friendly Startup CTO',
    subtitle: 'Conversational, encouraging, asks about thought process & practical trade-offs',
  },
  {
    id: 'silent_skeptical',
    title: 'Silent & Skeptical',
    subtitle: 'Minimal reactions, terse questions, long pauses, tests confidence',
  },
  {
    id: 'strict_hr',
    title: 'Strict HR',
    subtitle: 'Focuses on behavior, STAR format, leadership, flags missing metrics',
  },
  {
    id: 'tcs_infosys',
    title: 'TCS / Infosys Style',
    subtitle: 'Formal, process-oriented, asks about core fundamentals & project details',
  },
];

export default function PersonaSelectorModal({
  isOpen,
  onClose,
  selectedPersona,
  onSelectPersona,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="modal-card ui-card"
        style={{
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-line)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.75rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Choose Interviewer Persona
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Select a persona style to simulate real-world interviewer dynamics.
            </p>
          </div>
          <button type="button" className="ui-btn ui-btn-ghost" onClick={onClose} style={{ fontSize: '1.1rem', padding: '0.2rem 0.5rem' }}>
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {PERSONA_OPTIONS.map((p) => {
            const isSelected = selectedPersona === p.id;
            return (
              <div
                key={p.id}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border-line)',
                  background: isSelected ? 'var(--accent-muted)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => {
                  onSelectPersona(p.id);
                  onClose();
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {p.title}
                  </span>
                  {isSelected && (
                    <span style={{ fontSize: '0.75rem', background: 'var(--accent)', color: '#fff', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                      Selected
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {p.subtitle}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
