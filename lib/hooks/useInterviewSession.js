'use client';

/**
 * lib/hooks/useInterviewSession.js
 *
 * Custom hook managing interview session parameters, question loading,
 * question index navigation, timer preset, and streak tracking.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const FALLBACK_QUESTIONS = {
  technical: [
    'Explain the difference between SQL and NoSQL databases.',
    'What is the time complexity of quicksort?',
    'How would you design a URL shortening service?',
    'What is the difference between a thread and a process?',
    'Explain REST vs GraphQL trade-offs.',
    'Describe CAP theorem.',
    'How does garbage collection work?',
    'What is idempotency in APIs?',
  ],
  hr: [
    'Tell me about a time you led a project under a tight deadline.',
    'Describe a situation where you disagreed with your manager.',
    'Give an example of a time you failed. What did you learn?',
    'Tell me about working with a difficult teammate.',
    'Describe your greatest professional achievement.',
    'Why do you want this role?',
    'How do you prioritize conflicting tasks?',
    'Describe a time you received critical feedback.',
  ],
  case: [
    "Your client's revenue dropped 20% last quarter. How do you diagnose this?",
    'A hospital wants to reduce patient wait times by 30%. Walk me through your approach.',
    'Estimate the market size for electric scooter rentals in your city.',
    'A food delivery startup has low driver retention. What would you investigate?',
    'How would you prioritize a product roadmap with 50 feature requests?',
    'How would you price a new SaaS product?',
    'A retailer has high cart abandonment — what metrics would you check?',
    'How would you measure success of a new feature launch?',
  ],
  stress: [
    'Why should we hire you over someone with 5 more years of experience?',
    'Your last answer was generic. Give me something more specific.',
    "That solution wouldn't scale. What would you do differently?",
    'If your entire approach was wrong, how would you pivot?',
    'Why have you changed jobs so frequently?',
    'Convince me you can handle pressure.',
    'What is your biggest weakness?',
    'Why should we believe you will stay long-term?',
  ],
};

export function useInterviewSession({ userId, guestMode, showToast }) {
  const [mode, setModeState] = useState('technical');
  const [selectedRole, setSelectedRole] = useState('Full Stack Developer');
  const [interviewerPersona, setInterviewerPersona] = useState('standard');
  const [activePack, setActivePack] = useState('general');
  const [difficulty, setDifficulty] = useState('All');
  const [questionIndex, setQuestionIndex] = useState(0);

  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [codingProblems, setCodingProblems] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [streak, setStreak] = useState(1);
  const [sessionCount, setSessionCount] = useState(0);
  const [timerPreset, setTimerPreset] = useState('none');
  const [sessionTimerEndAt, setSessionTimerEndAt] = useState(null);
  const [timerRemainingSec, setTimerRemainingSec] = useState(null);

  const activeSessionIdRef = useRef(null);

  const isCoding = mode === 'coding';
  const filteredProblems =
    difficulty === 'All'
      ? codingProblems
      : codingProblems.filter((p) => p.difficulty === difficulty);

  const totalQuestions = isCoding
    ? filteredProblems.length || 8
    : currentQuestions.length || 8;

  const currentTextQuestion = currentQuestions[questionIndex] || '';
  const currentProblem = filteredProblems[questionIndex] || null;

  // Streak logic
  const checkStreak = useCallback(() => {
    if (typeof window === 'undefined') return 1;
    const today = new Date().toDateString();
    const lastDay = localStorage.getItem('lastPracticeDay');
    let s = parseInt(localStorage.getItem('streak') || '0', 10);

    if (lastDay === today) {
      /* same day */
    } else if (lastDay === new Date(Date.now() - 86400000).toDateString()) {
      s++;
      localStorage.setItem('streak', String(s));
      localStorage.setItem('lastPracticeDay', today);
    } else {
      s = 1;
      localStorage.setItem('streak', String(s));
      localStorage.setItem('lastPracticeDay', today);
    }
    setStreak(s);
    return s;
  }, []);

  const bumpSessionCounter = useCallback(() => {
    if (typeof window === 'undefined') return;
    const n =
      parseInt(localStorage.getItem('mockprep_sessions_total') || '0', 10) + 1;
    localStorage.setItem('mockprep_sessions_total', String(n));
    setSessionCount(n);
  }, []);

  // Timer tick
  useEffect(() => {
    if (!sessionTimerEndAt) {
      setTimerRemainingSec(null);
      return undefined;
    }
    const tick = () => {
      const rem = Math.max(
        0,
        Math.floor((sessionTimerEndAt - Date.now()) / 1000)
      );
      setTimerRemainingSec(rem);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [sessionTimerEndAt]);

  const loadQuestions = useCallback(
    async (resumeText = '', rateLimitHandler = null) => {
      setLoadingQuestions(true);
      try {
        const payload = {
          mode,
          pack: activePack,
          resumeText: resumeText || '',
          role: selectedRole,
          persona: interviewerPersona,
          user_id: userId || undefined,
          ...(mode === 'coding' ? { difficulty: 'medium' } : {}),
        };

        const res = await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.status === 429 && data.error === 'rate_limited') {
          if (rateLimitHandler) rateLimitHandler(data);
          throw new Error(data.message || 'Daily limit reached');
        }

        if (!res.ok) throw new Error(data.error || 'Failed to load questions');

        if (mode === 'coding') {
          const list = (data.problems || []).slice(0, 8);
          setCodingProblems(list);
          setCurrentQuestions([]);
        } else {
          setCurrentQuestions((data.questions || []).slice(0, 8));
          setCodingProblems([]);
        }

        setQuestionIndex(0);
        activeSessionIdRef.current = null;
        bumpSessionCounter();

        if (timerPreset !== 'none') {
          const minsMap = { 15: 15, 30: 30, 45: 45 };
          const mins = minsMap[timerPreset];
          if (mins) setSessionTimerEndAt(Date.now() + mins * 60 * 1000);
        } else {
          setSessionTimerEndAt(null);
        }
      } catch (err) {
        console.warn('[useInterviewSession] Falling back to offline content:', err.message);
        if (mode !== 'coding') {
          setCurrentQuestions(FALLBACK_QUESTIONS[mode] || FALLBACK_QUESTIONS.technical);
          setCodingProblems([]);
        }
        setQuestionIndex(0);
        if (showToast) showToast('Using offline questions — check connection.', true);
      } finally {
        setLoadingQuestions(false);
      }
    },
    [
      mode,
      activePack,
      selectedRole,
      interviewerPersona,
      userId,
      timerPreset,
      bumpSessionCounter,
      showToast,
    ]
  );

  return {
    mode,
    setModeState,
    selectedRole,
    setSelectedRole,
    interviewerPersona,
    setInterviewerPersona,
    activePack,
    setActivePack,
    difficulty,
    setDifficulty,
    questionIndex,
    setQuestionIndex,
    currentQuestions,
    codingProblems,
    filteredProblems,
    currentTextQuestion,
    currentProblem,
    totalQuestions,
    loadingQuestions,
    streak,
    sessionCount,
    timerPreset,
    setTimerPreset,
    timerRemainingSec,
    activeSessionIdRef,
    checkStreak,
    loadQuestions,
    isCoding,
  };
}
