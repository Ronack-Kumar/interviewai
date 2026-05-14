'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createClient } from '../../lib/supabase';

const ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Python Developer',
  'Data Scientist',
  'DevOps Engineer',
  'Mobile Developer (React Native / Flutter)',
  'System Design',
];

const MODES = [
  { id: 'technical', label: 'Technical' },
  { id: 'hr', label: 'HR / Behavioral' },
  { id: 'case', label: 'Case Study' },
  { id: 'stress', label: 'Stress Round' },
];

function supportsSpeechRecognition() {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function supportsSpeechSynthesis() {
  if (typeof window === 'undefined') return false;
  return !!window.speechSynthesis;
}

function stripForSpeech(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

/** At most two sentences for TTS reaction. */
function feedbackToShortReaction(feedback) {
  if (!feedback || typeof feedback !== 'string') return 'Good effort. Continue to the next question when you are ready.';
  const t = String(feedback).replace(/\s+/g, ' ').trim();
  const chunks = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  let out = '';
  let n = 0;
  for (const c of chunks) {
    out = out ? `${out} ${c}` : c;
    n++;
    if (n >= 2) break;
  }
  if (!out) out = t.slice(0, 240);
  return out.slice(0, 420);
}

export default function LiveInterviewClient() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [guestMode, setGuestMode] = useState(true);
  const [userId, setUserId] = useState('');

  const [selectedRole, setSelectedRole] = useState(ROLES[2]);
  const [mode, setMode] = useState('technical');
  const [activePack, setActivePack] = useState('general');
  const [resumeText, setResumeText] = useState('');

  const [phase, setPhase] = useState('setup');
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [setupError, setSetupError] = useState('');

  const [questionDelivery, setQuestionDelivery] = useState('text');
  const [answerInput, setAnswerInput] = useState('text');

  const [answerText, setAnswerText] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const questionStartedAtRef = useRef(null);

  const [reactionText, setReactionText] = useState('');
  const [reactionLoading, setReactionLoading] = useState(false);
  const activeSessionIdRef = useRef(null);

  const lastSpokenQuestionRef = useRef(-1);
  const advanceTimerRef = useRef(null);
  const qIndexRef = useRef(0);
  const questionsRef = useRef([]);

  const canSpeechIn = supportsSpeechRecognition();
  const canSpeechOut = supportsSpeechSynthesis();

  qIndexRef.current = qIndex;
  questionsRef.current = questions;

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      setGuestMode(!user);
      setUserId(user?.id ?? '');
      setAuthReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const stopSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    stopSilenceTimer();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setListening(false);
  }, [stopSilenceTimer]);

  const speak = useCallback((text) => {
    if (!canSpeechOut || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(stripForSpeech(text));
    u.rate = 0.95;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  }, [canSpeechOut]);

  useEffect(() => {
    return () => {
      stopRecognition();
      window.speechSynthesis?.cancel();
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [stopRecognition]);

  useEffect(() => {
    if (answerInput === 'text') stopRecognition();
  }, [answerInput, stopRecognition]);

  /** Read question aloud when entering a question (voice delivery). */
  useEffect(() => {
    if (phase !== 'running') return;
    if (questionDelivery !== 'voice') return;
    if (!canSpeechOut) return;
    const q = questions[qIndex];
    if (!q) return;
    if (lastSpokenQuestionRef.current === qIndex) return;
    lastSpokenQuestionRef.current = qIndex;
    const t = typeof q === 'string' ? q : String(q);
    speak(t);
  }, [phase, questionDelivery, canSpeechOut, questions, qIndex, speak]);

  const resetSilenceTimer = useCallback(() => {
    stopSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      silenceTimerRef.current = null;
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      setListening(false);
    }, 3000);
  }, [stopSilenceTimer]);

  const startListening = useCallback(() => {
    if (!canSpeechIn) return;
    stopRecognition();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    setLiveTranscript('');
    let buffer = answerText;

    rec.onresult = (e) => {
      resetSilenceTimer();
      let interim = '';
      let fin = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const piece = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += piece;
        else interim += piece;
      }
      if (fin) buffer = `${buffer}${fin} `;
      setAnswerText(buffer.trimStart());
      setLiveTranscript(interim);
    };

    rec.onerror = () => {
      stopSilenceTimer();
      setListening(false);
    };

    rec.onend = () => {
      stopSilenceTimer();
      setListening(false);
      setLiveTranscript('');
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    resetSilenceTimer();
  }, [answerText, canSpeechIn, resetSilenceTimer, stopRecognition]);

  const saveAnswerRemote = useCallback(
    async ({
      question,
      answer,
      score,
      accuracy,
      clarity,
      depth,
      feedback,
      ideal_answer,
      time_taken_seconds,
    }) => {
      if (!userId || guestMode) return null;
      const res = await fetch('/api/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          question,
          answer,
          score: score ?? null,
          accuracy: accuracy ?? null,
          clarity: clarity ?? null,
          depth: depth ?? null,
          feedback: feedback ?? null,
          user_id: userId,
          session_id: activeSessionIdRef.current ?? undefined,
          time_taken_seconds,
          ideal_answer: ideal_answer ?? '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      if (data.session_id) {
        activeSessionIdRef.current = data.session_id;
      }
      return data.session_id;
    },
    [guestMode, mode, userId]
  );

  const startInterview = useCallback(async () => {
    setSetupError('');
    setLoadingQuestions(true);
    try {
      const payload = {
        mode,
        pack: activePack,
        resumeText: resumeText.slice(0, 500),
        role: selectedRole,
      };
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'Failed to load questions');
      const qs = data.questions;
      if (!Array.isArray(qs) || qs.length === 0) throw new Error('Invalid questions response');
      const list = qs.slice(0, 8);
      setQuestions(list);
      setQIndex(0);
      setAnswerText('');
      setLiveTranscript('');
      setReactionText('');
      lastSpokenQuestionRef.current = -1;
      activeSessionIdRef.current = null;
      questionStartedAtRef.current = Date.now();
      setPhase('running');
    } catch (e) {
      setSetupError(e.message || 'Could not start');
    } finally {
      setLoadingQuestions(false);
    }
  }, [activePack, mode, resumeText, selectedRole]);

  const goNextOrFinish = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setReactionText('');
    setReactionLoading(false);
    setAnswerText('');
    setLiveTranscript('');

    const i = qIndexRef.current;
    const len = questionsRef.current.length;
    if (len > 0 && i >= len - 1) {
      setPhase('done');
      const sid = activeSessionIdRef.current;
      if (sid && userId && !guestMode) {
        router.push(`/report/${encodeURIComponent(sid)}`);
      } else {
        router.push('/');
      }
      return;
    }

    lastSpokenQuestionRef.current = -1;
    questionStartedAtRef.current = Date.now();
    setQIndex((x) => x + 1);
    setPhase('running');
  }, [guestMode, router, userId]);

  const submitCurrent = useCallback(async () => {
    const qText = typeof questions[qIndex] === 'string' ? questions[qIndex] : String(questions[qIndex]);
    const combined = `${answerText}${liveTranscript}`.trim();
    if (!combined) return;

    stopRecognition();
    window.speechSynthesis.cancel();

    const secs = Math.max(
      0,
      Math.floor(((Date.now() - (questionStartedAtRef.current || Date.now())) / 1000))
    );

    setReactionLoading(true);
    setPhase('reacting');

    let short = '';
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: qText,
          answer: combined,
          mode,
          role: selectedRole,
        }),
      });
      const raw = await res.json();
      if (!res.ok || raw.error) throw new Error(raw.error || raw.detail || 'Feedback failed');
      const fb = typeof raw.feedback === 'string' ? raw.feedback : '';
      short = feedbackToShortReaction(fb);
      setReactionText(short);

      if (userId && !guestMode) {
        await saveAnswerRemote({
          question: qText,
          answer: combined,
          score: raw.score ?? null,
          accuracy: raw.accuracy ?? null,
          clarity: raw.clarity ?? null,
          depth: raw.depth ?? null,
          feedback: fb || null,
          ideal_answer: raw.idealAnswer ?? '',
          time_taken_seconds: secs,
        });
      }

      speak(short);
    } catch (e) {
      const fallback = e.message || 'Could not load feedback.';
      setReactionText(fallback);
      speak(feedbackToShortReaction(fallback));
      if (userId && !guestMode) {
        try {
          await saveAnswerRemote({
            question: qText,
            answer: combined,
            score: null,
            accuracy: null,
            clarity: null,
            depth: null,
            feedback: null,
            ideal_answer: '',
            time_taken_seconds: secs,
          });
        } catch {
          /* ignore */
        }
      }
    } finally {
      setReactionLoading(false);
    }

    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      goNextOrFinish();
    }, 4000);
  }, [
    answerText,
    guestMode,
    goNextOrFinish,
    liveTranscript,
    mode,
    qIndex,
    questions,
    saveAnswerRemote,
    selectedRole,
    speak,
    stopRecognition,
    userId,
  ]);

  const skipQuestion = useCallback(async () => {
    stopRecognition();
    window.speechSynthesis.cancel();
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    const idx = qIndexRef.current;
    const qRow = questionsRef.current[idx];
    const qText = typeof qRow === 'string' ? qRow : String(qRow ?? '');
    const secs = Math.max(
      0,
      Math.floor(((Date.now() - (questionStartedAtRef.current || Date.now())) / 1000))
    );

    setReactionText('Question skipped.');
    setPhase('reacting');

    if (userId && !guestMode) {
      try {
        await saveAnswerRemote({
          question: qText,
          answer: '[Skipped]',
          score: null,
          accuracy: null,
          clarity: null,
          depth: null,
          feedback: null,
          ideal_answer: '',
          time_taken_seconds: secs,
        });
      } catch {
        /* ignore */
      }
    }

    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      goNextOrFinish();
    }, 800);
  }, [goNextOrFinish, guestMode, saveAnswerRemote, stopRecognition, userId]);

  const unsupportedBanner =
    !canSpeechIn || !canSpeechOut ? (
      <div
        style={{
          marginBottom: 16,
          padding: '12px 14px',
          borderRadius: 8,
          border: '1px solid var(--warning)',
          background: 'rgba(245, 158, 11, 0.08)',
          color: 'var(--text-secondary)',
          fontSize: 13,
        }}
      >
        {!canSpeechIn && !canSpeechOut
          ? 'This browser does not support Web Speech recognition or synthesis. Use Chrome or Edge for full voice features.'
          : !canSpeechIn
            ? 'Speech recognition is not available in this browser. Voice answer mode will be disabled — use Chrome or Edge, or choose Text for answers.'
            : 'Speech synthesis is not available in this browser. Voice question delivery and spoken reactions may not work.'}
      </div>
    ) : null;

  if (!authReady) {
    return (
      <div className="live-page" style={pageStyle}>
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    );
  }

  if (phase === 'setup') {
    return (
      <div className="live-page" style={pageStyle}>
        <div style={{ maxWidth: 520, width: '100%' }}>
          <Link href="/" className="live-back" style={{ color: 'var(--accent)', fontSize: 14 }}>
            ← Back to MockPrep
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '20px 0 8px' }}>Live AI Interview</h1>
          <p style={{ color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>
            Same modes and roles as the main practice flow. After each answer you get a short AI reaction (voice + text),
            then the next question.
          </p>
          {guestMode ? (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--border)',
                color: 'var(--muted)',
                fontSize: 13,
              }}
            >
              You are not signed in. You can try the flow, but answers will not be saved and you will not get a report
              link.{' '}
              <Link href="/auth" style={{ color: 'var(--accent)' }}>
                Sign in
              </Link>{' '}
              to save sessions.
            </div>
          ) : null}
          {unsupportedBanner}
          <label style={labelStyle}>Role</label>
          <select
            className="role-select"
            style={{ ...selectStyle, marginBottom: 16 }}
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Interview mode</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMode(m.id);
                  if (m.id !== 'technical') setActivePack('general');
                }}
                style={{
                  ...modeBtnStyle,
                  borderColor: mode === m.id ? 'var(--accent)' : 'var(--border)',
                  background: mode === m.id ? 'var(--accent-muted)' : 'var(--bg-card)',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === 'technical' ? (
            <>
              <label style={labelStyle}>Company pack</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {['general', 'tcs', 'infosys', 'wipro', 'faang'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setActivePack(p)}
                    style={{
                      ...chipStyle,
                      borderColor: activePack === p ? 'var(--accent)' : 'var(--border)',
                      background: activePack === p ? 'var(--accent-muted)' : 'var(--bg-surface)',
                    }}
                  >
                    {p === 'general' ? 'General' : p === 'faang' ? 'FAANG' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <label style={labelStyle}>Resume (optional)</label>
          <textarea
            style={textareaStyle}
            rows={4}
            placeholder="Paste a short resume snippet to tailor questions…"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />

          <label style={labelStyle}>Question delivery</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <ToggleChip active={questionDelivery === 'voice'} onClick={() => setQuestionDelivery('voice')} disabled={!canSpeechOut}>
              Voice
            </ToggleChip>
            <ToggleChip active={questionDelivery === 'text'} onClick={() => setQuestionDelivery('text')}>
              Text
            </ToggleChip>
          </div>

          <label style={labelStyle}>Your answer input</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <ToggleChip active={answerInput === 'voice'} onClick={() => setAnswerInput('voice')} disabled={!canSpeechIn}>
              Voice
            </ToggleChip>
            <ToggleChip active={answerInput === 'text'} onClick={() => setAnswerInput('text')}>
              Text
            </ToggleChip>
          </div>

          {setupError ? (
            <p style={{ color: 'var(--error)', marginBottom: 12, fontSize: 14 }}>{setupError}</p>
          ) : null}

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px 18px', fontSize: 16 }}
            disabled={loadingQuestions}
            onClick={startInterview}
          >
            {loadingQuestions ? 'Generating questions…' : 'Start live interview'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="live-page" style={pageStyle}>
        <p style={{ color: 'var(--muted)' }}>Wrapping up…</p>
      </div>
    );
  }

  const currentQuestion = questions[qIndex] ?? '';
  const qDisplay = typeof currentQuestion === 'string' ? currentQuestion : String(currentQuestion);
  const progressLabel = `Question ${qIndex + 1} of ${questions.length}`;
  const isReacting = phase === 'reacting';

  return (
    <div className="live-page" style={pageStyle}>
      <div style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Link href="/" style={{ color: 'var(--accent)', fontSize: 14 }}>
            ← Home
          </Link>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{progressLabel}</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>Question:</span>
          <ToggleChip small active={questionDelivery === 'voice'} onClick={() => setQuestionDelivery('voice')} disabled={!canSpeechOut || isReacting}>
            Voice
          </ToggleChip>
          <ToggleChip small active={questionDelivery === 'text'} onClick={() => setQuestionDelivery('text')} disabled={isReacting}>
            Text
          </ToggleChip>
          <span style={{ width: 16 }} />
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>Answer:</span>
          <ToggleChip small active={answerInput === 'voice'} onClick={() => setAnswerInput('voice')} disabled={!canSpeechIn || isReacting}>
            Voice
          </ToggleChip>
          <ToggleChip small active={answerInput === 'text'} onClick={() => setAnswerInput('text')} disabled={isReacting}>
            Text
          </ToggleChip>
        </div>

        <div
          style={{
            fontSize: 22,
            lineHeight: 1.45,
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: 28,
            color: 'var(--text-primary)',
            minHeight: 120,
          }}
        >
          {qDisplay}
        </div>
        {questionDelivery === 'voice' && !isReacting ? (
          <p style={{ textAlign: 'center', color: 'var(--muted)', marginTop: -16, marginBottom: 24, fontSize: 13 }}>
            Question is also read aloud.
          </p>
        ) : null}

        {!isReacting ? (
          <>
            {answerInput === 'text' ? (
              <textarea
                style={{ ...textareaStyle, minHeight: 160 }}
                placeholder="Type your answer…"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                disabled={listening}
              />
            ) : (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => (listening ? stopRecognition() : startListening())}
                    disabled={!canSpeechIn}
                    style={{
                      ...micBtnStyle,
                      background: listening ? 'var(--error)' : 'var(--bg-card)',
                      borderColor: listening ? 'var(--error)' : 'var(--border)',
                      color: listening ? '#fff' : 'var(--text-primary)',
                    }}
                    aria-pressed={listening}
                  >
                    {listening ? '● Stop' : '○ Mic'}
                  </button>
                  {listening ? (
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Listening…</span>
                  ) : (
                    <span style={{ color: 'var(--muted)', fontSize: 13 }}>Auto-stops after 3s silence</span>
                  )}
                </div>
                <div
                  style={{
                    marginTop: 12,
                    padding: 14,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                    minHeight: 100,
                    color: 'var(--text-secondary)',
                    fontSize: 15,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {(answerText + (liveTranscript ? ` ${liveTranscript}` : '')).trim() || (
                    <span style={{ color: 'var(--muted)' }}>Live transcript appears here…</span>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              <button type="button" className="btn btn-primary" onClick={submitCurrent} disabled={!`${answerText}${liveTranscript}`.trim()}>
                Submit answer
              </button>
              <button type="button" className="btn btn-ghost" onClick={skipQuestion}>
                Skip
              </button>
            </div>
          </>
        ) : null}

        {(reactionText || reactionLoading) && (
          <div
            style={{
              marginTop: 28,
              padding: 20,
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 8 }}>
              AI reaction
            </div>
            {reactionLoading ? (
              <p style={{ margin: 0, color: 'var(--muted)' }}>Thinking…</p>
            ) : (
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: 'var(--text-primary)' }}>{reactionText}</p>
            )}
            {isReacting && !reactionLoading ? (
              <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--muted)' }}>Next question in a few seconds…</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  padding: '24px 20px 48px',
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--muted)',
  marginBottom: 8,
};

const selectStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
};

const textareaStyle = {
  width: '100%',
  padding: 12,
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  resize: 'vertical',
  marginBottom: 16,
};

const modeBtnStyle = {
  textAlign: 'left',
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  cursor: 'pointer',
  color: 'var(--text-primary)',
};

const chipStyle = {
  padding: '8px 12px',
  borderRadius: 999,
  border: '1px solid var(--border)',
  cursor: 'pointer',
  fontSize: 13,
  color: 'var(--text-primary)',
};

const micBtnStyle = {
  width: 56,
  height: 56,
  borderRadius: '50%',
  border: '2px solid var(--border)',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 700,
};

function ToggleChip({ children, active, onClick, disabled, small }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? '6px 12px' : '8px 16px',
        borderRadius: 999,
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        background: active ? 'var(--accent-muted)' : 'var(--bg-surface)',
        color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: small ? 12 : 14,
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}
