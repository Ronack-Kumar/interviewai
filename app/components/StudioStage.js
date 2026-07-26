'use client';

import { motion } from 'framer-motion';
import AnimatedQuestionContainer from './AnimatedQuestionContainer';
import CameraStatePill from './CameraStatePill';
import MicStatePill from './MicStatePill';
import { LANG_OPTIONS } from './CodeWorkspace';

function IconUser({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconLightbulb({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A6 6 0 1 0 7.5 11.5c.76.76 1.23 1.52 1.41 2.5" />
    </svg>
  );
}

export default function StudioStage({
  questionIndex = 0,
  totalQuestions = 8,
  submittedCount = 0,
  mode = 'technical',
  persona = 'standard',
  questionText = '',
  answerText = '',
  onAnswerChange,
  onSubmit,
  onHint,
  onNext,
  onPrev,
  recording = false,
  onMicToggle,
  cameraActive = false,
  onCameraToggle,
  submitting = false,
  isCoding = false,
  isSubmitted = false,
  currentProblem = null,
  loadingQuestions = false,
  codeLang = 'python',
  setCodeLang = () => {},
  onRunCode,
  codingCaseRows = [],
  children,
}) {
  const diffColors = { Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444' };
  const diffColor = currentProblem?.difficulty ? (diffColors[currentProblem.difficulty] || 'var(--accent)') : 'var(--accent)';

  return (
    <main
      style={{
        flex: 1,
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        padding: '1.5rem 2rem',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'background 0.2s ease',
      }}
    >
      {/* ── Studio Stage Header (Interviewer Persona + Camera/Mic State Pills) ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-line)',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          transition: 'background 0.2s ease, border-color 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <IconUser size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Interviewer Style ({persona.replace('_', ' ').toUpperCase()})
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Sub-800ms Groq &amp; Gemini Model Router Active
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <MicStatePill state={recording ? 'recording' : 'idle'} onClick={onMicToggle} />
          <CameraStatePill state={cameraActive ? 'active' : 'off'} onClick={onCameraToggle} />
        </div>
      </div>

      {/* ── Dynamic Layout Stage ── */}
      {isCoding && currentProblem ? (
        <div style={{ display: 'flex', flex: 1, gap: '1.25rem', overflow: 'hidden', marginBottom: '1rem' }}>
          
          {/* ── Left Panel: Problem Description ── */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div style={{ fontSize: '0.725rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600, textTransform: 'uppercase' }}>
                PROBLEM {String(questionIndex + 1).padStart(2, '0')} / {String(totalQuestions).padStart(2, '0')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {Math.min(100, Math.round((submittedCount / totalQuestions) * 100))}% Completed
              </div>
            </div>

            <div style={{ height: '4px', background: 'var(--border-line)', borderRadius: '2px', overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{ height: '100%', width: `${Math.min(100, Math.round((submittedCount / totalQuestions) * 100))}%`, background: 'var(--accent)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {currentProblem.title}
              </h2>
              {currentProblem.difficulty && (
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.55rem', borderRadius: '4px', background: `${diffColor}18`, color: diffColor, border: `1px solid ${diffColor}40`, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {currentProblem.difficulty}
                </span>
              )}
              {currentProblem.tags && currentProblem.tags.length > 0 && currentProblem.tags.map((tag, i) => (
                <span key={i} style={{ fontSize: '0.68rem', padding: '0.12rem 0.45rem', borderRadius: '3px', background: 'var(--bg-card)', border: '1px solid var(--border-line)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {tag}
                </span>
              ))}
            </div>

            <p style={{ fontSize: '0.925rem', lineHeight: 1.65, color: 'var(--text-primary)', marginBottom: '1rem', whiteSpace: 'pre-line' }}>
              {currentProblem.description}
            </p>

            {currentProblem.examples && currentProblem.examples.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>Examples</div>
                {currentProblem.examples.map((ex, i) => (
                  <div key={i} style={{ background: 'var(--bg-surface)', padding: '0.65rem 0.85rem', borderRadius: '6px', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', border: '1px solid var(--border-line)', lineHeight: 1.5 }}>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>Input:</strong> <span style={{ color: 'var(--text-primary)' }}>{ex.input}</span></div>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>Output:</strong> <span style={{ color: 'var(--text-primary)' }}>{ex.output}</span></div>
                    {ex.explanation && <div style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}><strong>Explanation:</strong> {ex.explanation}</div>}
                  </div>
                ))}
              </div>
            )}

            {currentProblem.constraints && currentProblem.constraints.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>Constraints</div>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {currentProblem.constraints.map((c, i) => (
                    <li key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {currentProblem.functionSignature && (
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)' }}>Function Signature</div>
                <code style={{ display: 'block', background: 'var(--bg-surface)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--accent)', border: '1px solid var(--border-line)' }}>
                  {currentProblem.functionSignature}
                </code>
              </div>
            )}

            {currentProblem.visibleTests && currentProblem.visibleTests.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', marginTop: '0.75rem', fontFamily: 'var(--font-mono)' }}>Visible Test Cases</div>
                {currentProblem.visibleTests.map((t, i) => (
                  <div key={i} style={{ background: 'var(--bg-surface)', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', border: '1px solid var(--border-line)', lineHeight: 1.5 }}>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>Input:</strong> <span style={{ color: 'var(--text-primary)' }}>{t.input}</span></div>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>Expected:</strong> <span style={{ color: 'var(--text-primary)' }}>{t.output}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right Panel: Editor & Output ── */}
          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', border: '1px solid var(--border-line)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 1rem', borderBottom: '1px solid var(--border-line)', background: 'var(--bg-card)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Editor</div>
                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                  {isCoding && (
                    <select
                      value={codeLang}
                      onChange={(e) => setCodeLang(e.target.value)}
                      disabled={isSubmitted || submitting}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-line)',
                        color: 'var(--text-primary)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-ui)',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      {LANG_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (onAnswerChange) onAnswerChange(currentProblem?.templates?.[codeLang] || '');
                    }}
                    disabled={submitting || isSubmitted}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-line)',
                      color: 'var(--text-secondary)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      cursor: submitting || isSubmitted ? 'not-allowed' : 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-surface)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(answerText)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-line)',
                      color: 'var(--text-secondary)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-surface)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    Copy
                  </button>
                </div>
              </div>
              {children}
            </div>
            {/* Run Code Output Console */}
            {codingCaseRows.length > 0 && (
              <div style={{ marginTop: '0.75rem', background: 'var(--bg-surface)', border: '1px solid var(--border-line)', borderRadius: '10px', padding: '0.75rem', maxHeight: '180px', overflowY: 'auto' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>Test Case Output</div>
                {codingCaseRows.map((row) => (
                  <div key={row.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.825rem' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{row.label}</div>
                    <div style={{ color: row.pass === true ? '#22c55e' : row.pass === false ? '#ef4444' : 'var(--text-muted)', fontWeight: 600 }}>
                      {row.pass === true ? 'Pass' : row.pass === false ? 'Fail' : row.detail}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ── Standard Text Question Mode ── */
        <>
          <AnimatedQuestionContainer
            questionIndex={questionIndex}
            totalQuestions={totalQuestions}
            submittedCount={submittedCount}
            mode={mode}
            persona={persona}
            questionText={questionText}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: '1rem' }}>
            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <textarea
                rows={6}
                value={answerText}
                onChange={(e) => onAnswerChange && onAnswerChange(e.target.value)}
                placeholder="Formulate your structured response (Situation → Task → Action → Result)..."
                disabled={submitting || isSubmitted}
                style={{
                  flex: 1,
                  width: '100%',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-line)',
                  borderRadius: '10px',
                  padding: '1rem',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.925rem',
                  lineHeight: 1.6,
                  outline: 'none',
                  resize: 'none',
                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.15)',
                  transition: 'border-color 0.18s ease, background 0.2s ease',
                }}
              />
              <div style={{ position: 'absolute', bottom: '12px', right: '14px', fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {answerText.length} / 2000 chars
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Persistent Bottom Toolbar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-line)', borderRadius: '10px', padding: '0.75rem 1.25rem', transition: 'background 0.2s ease' }}>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={onPrev}
            disabled={questionIndex === 0 || submitting}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-line)',
              color: questionIndex === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
              padding: '0.45rem 0.95rem',
              borderRadius: '6px',
              fontSize: '0.825rem',
              fontWeight: 500,
              cursor: questionIndex === 0 ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={questionIndex >= totalQuestions - 1 || submitting}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-line)',
              color: questionIndex >= totalQuestions - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
              padding: '0.45rem 0.95rem',
              borderRadius: '6px',
              fontSize: '0.825rem',
              fontWeight: 500,
              cursor: questionIndex >= totalQuestions - 1 ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            Next Question →
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>

          {onHint && (
            <button
              type="button"
              onClick={onHint}
              disabled={submitting || isSubmitted}
              style={{
                background: 'var(--accent-muted)',
                border: '1px solid var(--accent)',
                color: 'var(--accent)',
                padding: '0.45rem 1rem',
                borderRadius: '6px',
                fontSize: '0.825rem',
                fontWeight: 500,
                cursor: 'pointer',
                opacity: 0.85,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><IconLightbulb size={14} /> Get Hint</span>
            </button>
          )}

          {isCoding && (
            <button
              type="button"
              onClick={onRunCode}
              disabled={submitting || isSubmitted}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-line)',
                color: 'var(--text-primary)',
                padding: '0.45rem 1.15rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: submitting || isSubmitted ? 'not-allowed' : 'pointer',
              }}
            >
              Run Code
            </button>
          )}

          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onSubmit}
            disabled={submitting || isSubmitted}
            style={{
              background: isSubmitted ? 'var(--bg-surface)' : 'var(--accent)',
              color: isSubmitted ? 'var(--text-muted)' : 'var(--accent-text)',
              border: 'none',
              padding: '0.45rem 1.35rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: submitting || isSubmitted ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Evaluating...' : isSubmitted ? 'Submitted' : 'Submit Answer →'}
          </motion.button>
        </div>
      </div>
    </main>
  );
}
