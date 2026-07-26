'use client';

/**
 * app/components/interview/QuestionPanel.js
 *
 * Modular question display component supporting text interview questions
 * and coding practice problems with example cases, hints, and persona indicators.
 */

import React from 'react';

function personaFlavorText(personaId) {
  const flavors = {
    aggressive_faang: 'The interviewer looks unimpressed.',
    friendly_startup: 'The interviewer nods encouragingly.',
    silent_skeptical: 'The interviewer stares at you blankly.',
    strict_hr: 'The interviewer has a checklist ready.',
    tcs_infosys: 'The interviewer adjusts their formal tie.',
  };
  return flavors[personaId] || '';
}

export default function QuestionPanel({
  mode,
  questionIndex,
  totalQuestions,
  currentQuestionText,
  currentProblem,
  loadingQuestions,
  questionHint,
  hintLoading,
  onGetHint,
  interviewerPersona,
  progressPct,
}) {
  const isCoding = mode === 'coding';
  const flavor = personaFlavorText(interviewerPersona);

  const diffClass =
    currentProblem &&
    ({
      Easy: 'easy',
      Medium: 'medium',
      Hard: 'hard',
    }[currentProblem.difficulty] || 'medium');

  return (
    <div className="question-panel card" aria-label="Question panel">
      {/* Top Meta Bar */}
      <div className="q-meta-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span className="q-number" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>
          Question {String(questionIndex + 1).padStart(2, '0')} / {String(totalQuestions).padStart(2, '0')}
        </span>
        {isCoding && currentProblem?.difficulty ? (
          <span className={`diff-badge ${diffClass}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'capitalize' }}>
            {currentProblem.difficulty}
          </span>
        ) : null}
      </div>

      {/* Persona visual flavor hint */}
      {flavor ? (
        <p className="persona-flavor" style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--muted)', marginBottom: '0.75rem' }}>
          {flavor}
        </p>
      ) : null}

      {/* Progress Track */}
      <div className="q-progress-track" style={{ height: '4px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden', marginBottom: '1rem' }} aria-hidden>
        <div className="q-progress-fill" style={{ width: `${progressPct}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s ease' }} />
      </div>

      {/* Question / Problem Content */}
      {loadingQuestions ? (
        <div className="q-loading-state" style={{ padding: '1.5rem 0', color: 'var(--muted)', textAlign: 'center' }}>
          <span className="spinner" /> Loading problem statement…
        </div>
      ) : isCoding && currentProblem ? (
        <div className="problem-content">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            {currentProblem.title}
          </h2>
          <p className="problem-desc" style={{ fontSize: '0.925rem', lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: '1rem', whiteSpace: 'pre-line' }}>
            {currentProblem.description}
          </p>

          {currentProblem.constraints && currentProblem.constraints.length > 0 && (
            <div className="problem-constraints" style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.4rem' }}>
                Constraints
              </div>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {currentProblem.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {currentProblem.examples && currentProblem.examples.length > 0 && (
            <div className="problem-examples">
              <div style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.4rem' }}>
                Examples
              </div>
              {currentProblem.examples.map((ex, i) => (
                <div key={i} style={{ background: 'var(--bg-surface)', padding: '0.65rem 0.85rem', borderRadius: '6px', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', border: '1px solid var(--border-line)' }}>
                  <div><strong>Input:</strong> {ex.input}</div>
                  <div><strong>Output:</strong> {ex.output}</div>
                  {ex.explanation ? <div style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}><strong>Explanation:</strong> {ex.explanation}</div> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <h2 className="question-text" style={{ fontSize: '1.15rem', fontWeight: 500, lineHeight: 1.55, color: 'var(--text-primary)' }}>
          {currentQuestionText || 'Select a mode to start practicing.'}
        </h2>
      )}

      {/* Hint Box */}
      {questionHint ? (
        <div className="hint-box" style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--accent-muted)', borderLeft: '3px solid var(--accent)', borderRadius: '0 6px 6px 0', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
          <strong>💡 Hint:</strong> {questionHint}
        </div>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className="ui-btn ui-btn-ghost"
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
            disabled={hintLoading || loadingQuestions || (!currentQuestionText && !currentProblem)}
            onClick={onGetHint}
          >
            {hintLoading ? 'Generating hint…' : '💡 Need a hint?'}
          </button>
        </div>
      )}
    </div>
  );
}
