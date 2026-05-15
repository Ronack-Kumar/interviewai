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

const ELEVENLABS_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

/**
 * ElevenLabs TTS. Resolves when playback ends.
 * @param {string} text
 * @param {{ current: HTMLAudioElement | null }} [playingRef]
 */
async function speakWithElevenLabs(text, playingRef) {
  const key = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  if (!key || typeof key !== 'string' || !String(key).trim()) {
    throw new Error('NEXT_PUBLIC_ELEVENLABS_API_KEY missing');
  }
  const bodyText = stripForSpeech(text);
  if (!bodyText) return;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': String(key).trim(),
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: bodyText,
      model_id: 'eleven_turbo_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `ElevenLabs HTTP ${res.status}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio();

  if (playingRef) {
    const prev = playingRef.current;
    if (prev && prev !== audio) {
      try {
        prev.pause();
        prev.src = '';
      } catch {
        /* ignore */
      }
    }
    playingRef.current = audio;
  }

  audio.src = url;

  await new Promise((resolve, reject) => {
    const cleanup = () => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
      if (playingRef && playingRef.current === audio) {
        playingRef.current = null;
      }
    };
    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error('Audio playback error'));
    };
    audio.play().catch((err) => {
      cleanup();
      reject(err);
    });
  });
}

const PARSE_FAIL_PHRASE = /could not be fully parsed/i;
const DEFAULT_REACTION = 'Good attempt! Moving to next question.';

function reactionFromFeedback(raw) {
  const fb = typeof raw?.feedback === 'string' ? raw.feedback.trim() : '';
  if (!fb || PARSE_FAIL_PHRASE.test(fb)) return DEFAULT_REACTION;
  return fb;
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
  const ttsAudioRef = useRef(null);

  const [reactionText, setReactionText] = useState('');
  const [reactionLoading, setReactionLoading] = useState(false);
  const [followupGenLoading, setFollowupGenLoading] = useState(false);
  const [followupPrompt, setFollowupPrompt] = useState('');
  const [hiringDecision, setHiringDecision] = useState(null);
  const [hiringDecisionLoading, setHiringDecisionLoading] = useState(false);
  const [hiringDecisionError, setHiringDecisionError] = useState('');
  const pendingSaveRef = useRef(null);
  const hiringLiveSeqRef = useRef(0);
  const activeSessionIdRef = useRef(null);

  const lastSpokenQuestionRef = useRef(-1);
  const advanceTimerRef = useRef(null);
  const qIndexRef = useRef(0);
  const questionsRef = useRef([]);
  const liveAnswersLogRef = useRef([]);

  const canSpeechIn = supportsSpeechRecognition();
  const canSpeechOut = supportsSpeechSynthesis();
  const hasElevenLabsKey =
    typeof process !== 'undefined' && !!String(process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '').trim();
  const canTtsOutput = hasElevenLabsKey || canSpeechOut;

  qIndexRef.current = qIndex;
  questionsRef.current = questions;

  useEffect(() => {
    if (phase !== 'hiring') return;
    const answers = liveAnswersLogRef.current;
    const seq = ++hiringLiveSeqRef.current;
    if (!answers.length) {
      setHiringDecisionError('No answers recorded for this session.');
      setHiringDecisionLoading(false);
      setHiringDecision(null);
      return;
    }
    setHiringDecisionLoading(true);
    setHiringDecisionError('');
    setHiringDecision(null);
    fetch('/api/hiring-decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, mode, role: selectedRole }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (seq !== hiringLiveSeqRef.current) return;
        if (!res.ok) throw new Error(data.error || 'Hiring decision failed');
        setHiringDecision(data);
      })
      .catch((e) => {
        if (seq !== hiringLiveSeqRef.current) return;
        setHiringDecisionError(e.message || 'Failed to load hiring decision');
      })
      .finally(() => {
        if (seq === hiringLiveSeqRef.current) setHiringDecisionLoading(false);
      });
  }, [phase, mode, selectedRole]);

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

  const stopAllTts = useCallback(() => {
    const a = ttsAudioRef.current;
    if (a) {
      try {
        a.pause();
        a.src = '';
      } catch {
        /* ignore */
      }
      ttsAudioRef.current = null;
    }
    window.speechSynthesis?.cancel();
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

  const speak = useCallback(
    async (text) => {
      if (!text) return;
      stopAllTts();
      if (hasElevenLabsKey) {
        try {
          await speakWithElevenLabs(text, ttsAudioRef);
          return;
        } catch {
          /* fall through to Web Speech */
        }
      }
      if (!canSpeechOut) return;
      const u = new SpeechSynthesisUtterance(stripForSpeech(text));
      u.rate = 0.85;
      u.pitch = 0.9;
      await new Promise((resolve) => {
        u.onend = resolve;
        u.onerror = resolve;
        window.speechSynthesis.speak(u);
      });
    },
    [canSpeechOut, hasElevenLabsKey, stopAllTts]
  );

  useEffect(() => {
    return () => {
      stopRecognition();
      stopAllTts();
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [stopAllTts, stopRecognition]);

  useEffect(() => {
    if (answerInput === 'text') stopRecognition();
  }, [answerInput, stopRecognition]);

  /** Read question aloud when entering a question (voice delivery). */
  useEffect(() => {
    if (phase !== 'running') return;
    if (questionDelivery !== 'voice') return;
    if (!canTtsOutput) return;
    const q = questions[qIndex];
    if (!q) return;
    if (lastSpokenQuestionRef.current === qIndex) return;
    lastSpokenQuestionRef.current = qIndex;
    const t = typeof q === 'string' ? q : String(q);
    void speak(t);
  }, [phase, questionDelivery, canTtsOutput, questions, qIndex, speak]);

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

  const savePendingInterviewRow = useCallback(
    async (followupAnswerOrNull) => {
      const stash = pendingSaveRef.current;
      if (!stash) return;
      const { qText, main, secs, raw, followupQ } = stash;
      const ans =
        followupAnswerOrNull != null &&
        String(followupAnswerOrNull).trim() &&
        followupQ
          ? `Answer: ${main}\n\nFollow-up: ${followupQ}\nFollow-up Answer: ${String(followupAnswerOrNull).trim()}`
          : main;
      liveAnswersLogRef.current.push({
        question: qText,
        answer: ans,
        score: typeof raw?.score === 'number' ? raw.score : null,
      });
      if (!userId || guestMode) return;
      await saveAnswerRemote({
        question: qText,
        answer: ans,
        score: raw?.score ?? null,
        accuracy: raw?.accuracy ?? null,
        clarity: raw?.clarity ?? null,
        depth: raw?.depth ?? null,
        feedback: typeof raw?.feedback === 'string' ? raw.feedback : null,
        ideal_answer: raw?.idealAnswer ?? '',
        time_taken_seconds: secs,
      });
    },
    [guestMode, saveAnswerRemote, userId]
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
      setFollowupGenLoading(false);
      setFollowupPrompt('');
      pendingSaveRef.current = null;
      liveAnswersLogRef.current = [];
      setHiringDecision(null);
      setHiringDecisionError('');
      setHiringDecisionLoading(false);
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
    stopAllTts();
    setReactionText('');
    setReactionLoading(false);
    setFollowupGenLoading(false);
    setFollowupPrompt('');
    pendingSaveRef.current = null;
    setAnswerText('');
    setLiveTranscript('');

    const i = qIndexRef.current;
    const len = questionsRef.current.length;
    if (len > 0 && i >= len - 1) {
      setPhase('hiring');
      return;
    }

    lastSpokenQuestionRef.current = -1;
    questionStartedAtRef.current = Date.now();
    setQIndex((x) => x + 1);
    setPhase('running');
  }, [stopAllTts]);

  const skipFollowupOnly = useCallback(async () => {
    if (phase !== 'followup') return;
    stopRecognition();
    stopAllTts();
    await savePendingInterviewRow(null);
    pendingSaveRef.current = null;
    setFollowupPrompt('');
    setAnswerText('');
    setLiveTranscript('');
    setPhase('reacting');
    setReactionText('Next question in a few seconds.');
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      goNextOrFinish();
    }, 4000);
  }, [phase, stopRecognition, stopAllTts, savePendingInterviewRow, goNextOrFinish]);

  const submitCurrent = useCallback(async () => {
    if (phase === 'followup') {
      const fu = `${answerText}${liveTranscript}`.trim();
      if (!fu) return;

      stopRecognition();
      stopAllTts();

      await savePendingInterviewRow(fu);
      pendingSaveRef.current = null;
      setFollowupPrompt('');
      setAnswerText('');
      setLiveTranscript('');
      setPhase('reacting');
      setReactionText('Nice work. Next question in a few seconds.');

      advanceTimerRef.current = setTimeout(() => {
        advanceTimerRef.current = null;
        goNextOrFinish();
      }, 4000);
      return;
    }

    const qText = typeof questions[qIndex] === 'string' ? questions[qIndex] : String(questions[qIndex]);
    const combined = `${answerText}${liveTranscript}`.trim();
    if (!combined) return;

    stopRecognition();
    stopAllTts();

    const secs = Math.max(
      0,
      Math.floor(((Date.now() - (questionStartedAtRef.current || Date.now())) / 1000))
    );

    setReactionLoading(true);
    setFollowupGenLoading(false);
    setPhase('reacting');

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
      const reaction = reactionFromFeedback(raw);
      setReactionText(reaction);

      pendingSaveRef.current = {
        qText,
        main: combined,
        secs,
        raw,
        followupQ: '',
      };

      await speak(reaction);

      setFollowupGenLoading(true);
      let fq = '';
      try {
        const fr = await fetch('/api/followup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: qText,
            answer: combined,
            mode,
            role: selectedRole,
          }),
        });
        const fd = await fr.json().catch(() => ({}));
        if (fr.ok && !fd.error && typeof fd.followup === 'string') {
          fq = fd.followup.trim();
        }
      } catch {
        fq = '';
      }
      setFollowupGenLoading(false);

      if (!fq) {
        await savePendingInterviewRow(null);
        pendingSaveRef.current = null;
        advanceTimerRef.current = setTimeout(() => {
          advanceTimerRef.current = null;
          goNextOrFinish();
        }, 4000);
        return;
      }

      pendingSaveRef.current = {
        qText,
        main: combined,
        secs,
        raw,
        followupQ: fq,
      };

      await speak(`Follow-up: ${fq}`);
      setFollowupPrompt(fq);
      setAnswerText('');
      setLiveTranscript('');
      setReactionText('');
      setPhase('followup');
    } catch (e) {
      pendingSaveRef.current = null;
      setFollowupGenLoading(false);
      setReactionText(DEFAULT_REACTION);
      await speak(DEFAULT_REACTION);
      liveAnswersLogRef.current.push({ question: qText, answer: combined, score: null });
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
      advanceTimerRef.current = setTimeout(() => {
        advanceTimerRef.current = null;
        goNextOrFinish();
      }, 4000);
    } finally {
      setReactionLoading(false);
    }
  }, [
    phase,
    answerText,
    guestMode,
    goNextOrFinish,
    liveTranscript,
    mode,
    qIndex,
    questions,
    saveAnswerRemote,
    savePendingInterviewRow,
    selectedRole,
    speak,
    stopRecognition,
    stopAllTts,
    userId,
  ]);

  const skipQuestion = useCallback(async () => {
    stopRecognition();
    stopAllTts();
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

    liveAnswersLogRef.current.push({ question: qText, answer: '[Skipped]', score: null });

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
  }, [goNextOrFinish, guestMode, saveAnswerRemote, stopAllTts, stopRecognition, userId]);

  const unsupportedBanner =
    !canSpeechIn || !canTtsOutput ? (
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
        {!canSpeechIn && !canTtsOutput
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
            <ToggleChip active={questionDelivery === 'voice'} onClick={() => setQuestionDelivery('voice')} disabled={!canTtsOutput}>
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

  if (phase === 'hiring') {
    const sid = activeSessionIdRef.current;
    const goReportOrHome = () => {
      if (sid && userId && !guestMode) {
        router.push(`/report/${encodeURIComponent(sid)}`);
      } else {
        router.push('/');
      }
    };

    return (
      <div className="live-page" style={pageStyle}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '8px 16px 48px' }}>
          <Link href="/" style={{ color: 'var(--accent)', fontSize: 14 }}>
            ← Home
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '20px 0 8px' }}>Session complete</h1>
          <p style={{ color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>
            AI hiring decision based on your interview answers.
          </p>
          <div
            style={{
              padding: 18,
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              minHeight: 120,
            }}
          >
            {hiringDecisionLoading ? (
              <p style={{ margin: 0, color: 'var(--muted)' }}>Analyzing your session…</p>
            ) : null}
            {hiringDecisionError ? (
              <p style={{ margin: 0, color: 'var(--error)' }}>{hiringDecisionError}</p>
            ) : null}
            {hiringDecision && !hiringDecisionLoading ? (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--muted)',
                    }}
                  >
                    Verdict
                  </span>
                  <span
                    style={(() => {
                      const v = hiringDecision.verdict;
                      const base = {
                        fontSize: 20,
                        borderRadius: 8,
                        padding: '6px 14px',
                        display: 'inline-block',
                        borderStyle: 'solid',
                        borderWidth: 2,
                      };
                      if (v === 'Strong Hire')
                        return { ...base, fontWeight: 800, color: '#15803d', borderColor: '#16a34a', backgroundColor: 'transparent' };
                      if (v === 'Hire')
                        return { ...base, fontWeight: 700, color: '#16a34a', borderColor: '#22c55e', backgroundColor: 'transparent' };
                      if (v === 'Borderline')
                        return { ...base, fontWeight: 700, color: '#c2410c', borderColor: '#f97316', backgroundColor: 'transparent' };
                      if (v === 'No Hire')
                        return { ...base, fontWeight: 700, color: '#dc2626', borderColor: '#ef4444', backgroundColor: 'transparent' };
                      if (v === 'Strong No Hire')
                        return {
                          ...base,
                          fontWeight: 700,
                          color: '#ffffff',
                          borderColor: '#7f1d1d',
                          backgroundColor: '#991b1b',
                        };
                      return { ...base, fontWeight: 700, color: '#c2410c', borderColor: '#f97316', backgroundColor: 'transparent' };
                    })()}
                  >
                    {hiringDecision.verdict}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--muted)' }}>
                    Overall {hiringDecision.overall_score}/10
                  </span>
                </div>
                <p style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  {hiringDecision.summary}
                </p>
                <div style={{ fontSize: 14 }}>
                  <strong>Communication</strong> — {hiringDecision.communication?.rating}
                  <div style={{ margin: '4px 0 10px', color: 'var(--muted)' }}>
                    {hiringDecision.communication?.comment}
                  </div>
                  <strong>Technical depth</strong> — {hiringDecision.technical_depth?.rating}
                  <div style={{ margin: '4px 0 10px', color: 'var(--muted)' }}>
                    {hiringDecision.technical_depth?.comment}
                  </div>
                  <strong>Confidence</strong> — {hiringDecision.confidence?.rating}
                  <div style={{ margin: '4px 0 0', color: 'var(--muted)' }}>{hiringDecision.confidence?.comment}</div>
                </div>
                {(hiringDecision.key_strength || hiringDecision.keyStrength) ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: '10px 12px',
                      borderRadius: 8,
                      backgroundColor: 'rgba(34, 197, 94, 0.22)',
                      border: '1px solid #22c55e',
                      color: '#166534',
                      fontSize: 13,
                      lineHeight: 1.45,
                    }}
                  >
                    ✅ Key strength: {hiringDecision.key_strength || hiringDecision.keyStrength}
                  </div>
                ) : null}
                {(hiringDecision.critical_weakness || hiringDecision.criticalWeakness) ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '10px 12px',
                      borderRadius: 8,
                      backgroundColor: 'rgba(239, 68, 68, 0.18)',
                      border: '1px solid #ef4444',
                      color: '#991b1b',
                      fontSize: 13,
                      lineHeight: 1.45,
                    }}
                  >
                    ❌ Critical weakness: {hiringDecision.critical_weakness || hiringDecision.criticalWeakness}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
            <button type="button" className="btn btn-primary" onClick={goReportOrHome}>
              {sid && userId && !guestMode ? 'View report' : 'Back to home'}
            </button>
            {sid && userId && !guestMode ? (
              <button type="button" className="btn btn-ghost" onClick={() => router.push('/')}>
                Home
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[qIndex] ?? '';
  const qDisplay = typeof currentQuestion === 'string' ? currentQuestion : String(currentQuestion);
  const progressLabel = `Question ${qIndex + 1} of ${questions.length}`;
  const isReacting = phase === 'reacting';
  const showAnswerPad = phase === 'running' || phase === 'followup';
  const togglesBusy = isReacting || followupGenLoading;

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
          <ToggleChip small active={questionDelivery === 'voice'} onClick={() => setQuestionDelivery('voice')} disabled={!canTtsOutput || togglesBusy}>
            Voice
          </ToggleChip>
          <ToggleChip small active={questionDelivery === 'text'} onClick={() => setQuestionDelivery('text')} disabled={togglesBusy}>
            Text
          </ToggleChip>
          <span style={{ width: 16 }} />
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>Answer:</span>
          <ToggleChip small active={answerInput === 'voice'} onClick={() => setAnswerInput('voice')} disabled={!canSpeechIn || togglesBusy}>
            Voice
          </ToggleChip>
          <ToggleChip small active={answerInput === 'text'} onClick={() => setAnswerInput('text')} disabled={togglesBusy}>
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
        {questionDelivery === 'voice' && showAnswerPad ? (
          <p style={{ textAlign: 'center', color: 'var(--muted)', marginTop: -16, marginBottom: 24, fontSize: 13 }}>
            Question is also read aloud.
          </p>
        ) : null}

        {showAnswerPad ? (
          <>
            {phase === 'followup' && followupPrompt ? (
              <div
                style={{
                  marginBottom: 16,
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: '1px solid rgba(129, 140, 248, 0.45)',
                  background: 'rgba(99, 102, 241, 0.12)',
                  textAlign: 'left',
                  maxWidth: 640,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    marginBottom: 8,
                  }}
                >
                  Follow-up:
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--text-primary)' }}>{followupPrompt}</div>
              </div>
            ) : null}

            {answerInput === 'text' ? (
              <textarea
                style={{ ...textareaStyle, minHeight: 160 }}
                placeholder={phase === 'followup' ? 'Type your follow-up answer…' : 'Type your answer…'}
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
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void submitCurrent()}
                disabled={!`${answerText}${liveTranscript}`.trim() || followupGenLoading}
              >
                {phase === 'followup' ? 'Submit follow-up' : 'Submit answer'}
              </button>
              {phase === 'followup' ? (
                <button type="button" className="btn btn-ghost" onClick={() => void skipFollowupOnly()}>
                  Skip follow-up
                </button>
              ) : (
                <button type="button" className="btn btn-ghost" onClick={skipQuestion}>
                  Skip
                </button>
              )}
            </div>
          </>
        ) : null}

        {isReacting && (reactionText || reactionLoading || followupGenLoading) ? (
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
            {followupGenLoading ? (
              <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--muted)' }}>Generating follow-up…</p>
            ) : null}
            {isReacting && !reactionLoading && !followupGenLoading && reactionText ? (
              <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--muted)' }}>Next question in a few seconds…</p>
            ) : null}
          </div>
        ) : null}
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
