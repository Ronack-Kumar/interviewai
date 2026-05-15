'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createClient } from '../lib/supabase';
import { applyTheme } from './components/ThemeInit';

const CodeWorkspace = dynamic(() => import('./components/CodeWorkspace'), {
  ssr: false,
});

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

const INTERVIEWER_PERSONA_OPTIONS = [
  { id: 'standard', badge: '🎯 Standard', title: 'Standard', subtitle: 'Balanced, professional' },
  {
    id: 'aggressive_faang',
    badge: '😤 Aggressive FAANG',
    title: 'Aggressive FAANG',
    subtitle: 'Challenges every answer, asks hard follow-ups, interrupts weak answers',
  },
  {
    id: 'friendly_startup',
    badge: '🤝 Friendly Startup CTO',
    title: 'Friendly Startup CTO',
    subtitle: 'Conversational, encouraging, asks about thought process',
  },
  {
    id: 'silent_skeptical',
    badge: '😶 Silent & Skeptical',
    title: 'Silent & Skeptical',
    subtitle: 'Minimal reactions, long pauses, makes candidate uncomfortable',
  },
  {
    id: 'strict_hr',
    badge: '📋 Strict HR',
    title: 'Strict HR',
    subtitle: 'Focuses on behavior, structure, STAR format, flags vague answers',
  },
  {
    id: 'tcs_infosys',
    badge: '🇮🇳 TCS/Infosys Style',
    title: 'TCS/Infosys Style',
    subtitle: 'Formal, process-oriented, asks about projects and basics',
  },
];

function interviewerPersonaFlavor(personaId) {
  const flavors = {
    aggressive_faang: 'The interviewer looks unimpressed.',
    friendly_startup: 'The interviewer nods encouragingly.',
    silent_skeptical: 'The interviewer stares at you blankly.',
    strict_hr: 'The interviewer has a checklist ready.',
    tcs_infosys: 'The interviewer adjusts their formal tie.',
  };
  return flavors[personaId] || '';
}

function interviewerPersonaBadge(personaId) {
  return INTERVIEWER_PERSONA_OPTIONS.find((p) => p.id === personaId)?.badge ?? '🎯 Standard';
}

const FALLBACK = {
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

const STUB_TEMPLATES = {
  python: 'def solution(nums):\n    """Write your solution here."""\n    pass\n',
  javascript: 'function solution(nums) {\n  // Write your solution here\n}\n',
  java: 'class Solution {\n    public int[] solution(int[] nums) {\n        return nums;\n    }\n}\n',
  cpp: '#include <vector>\nusing namespace std;\nvector<int> solution(vector<int>& nums) {\n    return nums;\n}\n',
  c: '#include <stdio.h>\nvoid solution() {\n    /* Write your solution here */\n}\n',
  go: 'package main\nfunc solution(nums []int) []int {\n    return nums\n}\n',
  rust: 'fn solution(nums: Vec<i32>) -> Vec<i32> {\n    nums\n}\n',
  typescript: 'function solution(nums: number[]): number[] {\n  return nums;\n}\n',
  csharp: 'public class Solution {\n    public int[] Solution(int[] nums) => nums;\n}\n',
  ruby: 'def solution(nums)\n  nums\nend\n',
  kotlin: 'fun solution(nums: IntArray): IntArray = nums\n',
  swift: 'func solution(_ nums: [Int]) -> [Int] { nums }\n',
};

function normTestOut(s) {
  if (s == null) return '';
  return String(s).replace(/\s/g, '');
}
/** Parse inputs like "[2,7,11,15], 9" for in-browser Run (JavaScript only). */
function parseTwoSumStyleInput(inputStr) {
  const m = String(inputStr).match(/\[([\d,\s-]+)\]\s*,\s*(-?\d+)/);
  if (!m) return null;
  const nums = m[1].split(',').map((x) => parseInt(x.trim(), 10));
  const target = parseInt(m[2], 10);
  if (nums.some((n) => Number.isNaN(n)) || Number.isNaN(target)) return null;
  return { nums, target };
}

function runUserSolutionJs(code, nums, target) {
  const wrapped = `
    "use strict";
    ${code}
    if (typeof solution !== 'function') throw new Error('Define function solution(nums, target)');
    return solution(nums, target);
  `;
  const fn = new Function('nums', 'target', wrapped);
  return fn(nums, target);
}

function runCodingSampleCases(problem, codeBody, codeLang) {
  const tests = problem?.visibleTests || [];
  const results = [];
  const lang = codeLang || 'javascript';
  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    const parsed = parseTwoSumStyleInput(t.input);
    if (!parsed) {
      results.push({
        key: `v-${i}`,
        label: `Sample ${i + 1}`,
        pass: false,
        detail: 'Input format not supported for quick run',
      });
      continue;
    }
    if (lang !== 'javascript') {
      results.push({
        key: `v-${i}`,
        label: `Sample ${i + 1}`,
        pass: false,
        detail: 'Quick run supports JavaScript only — switch language or use Submit',
      });
      continue;
    }
    try {
      const out = runUserSolutionJs(codeBody, parsed.nums, parsed.target);
      const actual = JSON.stringify(out);
      const pass = normTestOut(actual) === normTestOut(t.output);
      results.push({
        key: `v-${i}`,
        label: `Sample ${i + 1}`,
        pass,
        detail: pass ? 'Output matches expected.' : `Expected ${t.output}, got ${actual}`,
      });
    } catch (e) {
      results.push({
        key: `v-${i}`,
        label: `Sample ${i + 1}`,
        pass: false,
        detail: e?.message || String(e),
      });
    }
  }
  return results;
}

function buildStubProblems() {
  return Array.from({ length: 8 }, (_, i) => ({
    title: `Offline practice problem ${i + 1}`,
    difficulty: i < 2 ? 'Easy' : i < 6 ? 'Medium' : 'Hard',
    description:
      'Given an array of integers, return indices of two numbers such that they add up to a target. You may assume exactly one solution exists.',
    constraints: ['2 ≤ nums.length ≤ 10^4', '-10^9 ≤ nums[i] ≤ 10^9', '-10^9 ≤ target ≤ 10^9'],
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9.',
      },
    ],
    visibleTests: [
      { input: '[2,7,11,15], 9', output: '[0,1]' },
      { input: '[3,2,4], 6', output: '[1,2]' },
      { input: '[3,3], 6', output: '[0,1]' },
    ],
    hiddenTests: [
      { input: '(large case)', output: '(verified server-side)' },
      { input: '(edge case)', output: '(verified server-side)' },
    ],
    templates: { ...STUB_TEMPLATES },
  }));
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function problemToFeedbackQuestion(p) {
  if (!p) return '';
  const payload = {
    title: p.title,
    description: p.description,
    constraints: p.constraints,
    examples: p.examples,
    visibleTests: p.visibleTests,
  };
  const s = JSON.stringify(payload);
  return s.length > 12000 ? s.slice(0, 12000) : s;
}

function formatHistoryDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function emptyAnswerSlot() {
  return {
    text: '',
    code: '',
    lang: 'python',
    feedback: null,
    err: null,
    hint: '',
    submitted: false,
  };
}

function IconShuffle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 7h3l2-3h4M17 7h4M3 17h3l2 3h4M17 17h4" />
      <path d="M18 4l2 3-2 3M6 14l-2 3 2 3" />
    </svg>
  );
}

function IconSpeaker() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 010 7.07M17.66 6.34a8 8 0 010 11.32" />
    </svg>
  );
}

function IconStop() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}

function IconHint() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 18h.01M9.09 9a3 3 0 115.82 1c0 2-3 2.5-3 4.5" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
      <path d="M19 11a7 7 0 01-14 0M12 18v3M8 22h8" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export default function Page() {
  const router = useRouter();
  const [mode, setModeState] = useState('technical');
  const [selectedRole, setSelectedRole] = useState('Full Stack Developer');
  const [interviewerPersona, setInterviewerPersona] = useState('standard');
  const [activePack, setActivePack] = useState('general');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [codingProblems, setCodingProblems] = useState([]);
  const [codeLang, setCodeLang] = useState('python');
  const [codeBody, setCodeBody] = useState('');
  const [answerSlots, setAnswerSlots] = useState(() =>
    Array.from({ length: 8 }, emptyAnswerSlot)
  );
  const [sessionHistory, setSessionHistory] = useState([]);
  const [sessionCount, setSessionCount] = useState(0);

  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [controlsDisabled, setControlsDisabled] = useState(false);

  const [activeTab, setActiveTab] = useState('video');
  const [resumeExpanded, setResumeExpanded] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [resumeConfirm, setResumeConfirm] = useState('');
  const resumeConfirmTimerRef = useRef(null);

  const [answer, setAnswer] = useState('');
  const [speechInterim, setSpeechInterim] = useState('');
  const [captionOn, setCaptionOn] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [readAloudOn, setReadAloudOn] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  const [recording, setRecording] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraLost, setCameraLost] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const [guestLimitModalOpen, setGuestLimitModalOpen] = useState(false);
  const [guestSubmitLocked, setGuestSubmitLocked] = useState(false);
  const [userId, setUserId] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [cameraHeight, setCameraHeight] = useState(320);

  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const [feedbackData, setFeedbackData] = useState(null);

  const [questionHint, setQuestionHint] = useState('');
  const [hintLoading, setHintLoading] = useState(false);

  const [historyVisible, setHistoryVisible] = useState(false);
  const [historySessionItems, setHistorySessionItems] = useState([]);
  const [pastSessionRows, setPastSessionRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(null);

  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [hiringDecision, setHiringDecision] = useState(null);
  const [hiringDecisionLoading, setHiringDecisionLoading] = useState(false);
  const [hiringDecisionError, setHiringDecisionError] = useState('');
  const hiringModalSeqRef = useRef(0);
  const [setupModalOpen, setSetupModalOpen] = useState(true);
  const [selfPaced, setSelfPaced] = useState(false);
  const [timeUpModalOpen, setTimeUpModalOpen] = useState(false);
  const [timerPreset, setTimerPreset] = useState('none');
  const [timerRemainingSec, setTimerRemainingSec] = useState(null);
  const [reconnectingCamera, setReconnectingCamera] = useState(false);
  const [faceLookToast, setFaceLookToast] = useState(false);
  const [sessionTimerEndAt, setSessionTimerEndAt] = useState(null);
  const [themeMode, setThemeMode] = useState('dark');
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('Bug Report');
  const [feedbackDesc, setFeedbackDesc] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const [toast, setToast] = useState({ msg: '', show: false, err: false });
  const [streak, setStreak] = useState(1);
  const [difficulty, setDifficulty] = useState('All');

  const [answerSavedFlash, setAnswerSavedFlash] = useState(false);
  /** Text interview only: idle → loading follow-up → awaiting follow-up answer */
  const [followupPhase, setFollowupPhase] = useState('idle');
  const [followupQuestionText, setFollowupQuestionText] = useState('');
  const [stashedMainAnswer, setStashedMainAnswer] = useState('');
  const followupAbortRef = useRef(null);
  const skipFollowupHandledRef = useRef(false);
  const [codingOutputOpen, setCodingOutputOpen] = useState(false);
  const [codingCaseRows, setCodingCaseRows] = useState([]);

  const [audioLevels, setAudioLevels] = useState([4, 8, 12, 16, 10]);

  const [ttsSpeaking, setTtsSpeaking] = useState(false);

  const recognitionRef = useRef(null);
  const videoRef = useRef(null);
  const videoStreamRef = useRef(null);
  const videoTrackRef = useRef(null);
  const reconnectIntervalRef = useRef(null);
  const cameraEnabledRef = useRef(false);
  const activeSessionIdRef = useRef(null);
  const lastSessionIdRef = useRef(null);
  const questionStartedAtRef = useRef(Date.now());
  const sessionCompleteShownRef = useRef(false);
  const consecutiveNoFaceRef = useRef(0);
  const cameraRecoveringRef = useRef(false);
  const toastTimerRef = useRef(null);
  const initDone = useRef(false);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const rafAudioRef = useRef(null);
  const utterRef = useRef(null);

  const submitAnswerRef = useRef(null);
  const goNextRef = useRef(null);
  const goPrevRef = useRef(null);
  const toggleRecordRef = useRef(null);
  const resumeFileInputRef = useRef(null);
  const lastResumeSyncedRef = useRef('');
  const answerFlashTimerRef = useRef(null);
  const cameraHeightRef = useRef(200);

  useEffect(() => {
    cameraEnabledRef.current = cameraEnabled;
  }, [cameraEnabled]);

  const isCoding = mode === 'coding';
  const filteredProblems = difficulty === 'All'
    ? codingProblems
    : codingProblems.filter(p => p.difficulty === difficulty);
  const questions = currentQuestions;
  const currentTextQuestion = currentQuestions[questionIndex] || '';
  const currentProblem = filteredProblems[questionIndex] || null;
  const totalQ = isCoding ? filteredProblems.length || 8 : currentQuestions.length || 8;
  const charCount = (answer + speechInterim).length;
  const submittedCount = answerSlots.filter((s) => s.submitted).length;
  const progressPct =
    totalQ > 0 ? Math.min(100, (submittedCount / totalQ) * 100) : 0;
  const navProgressPct = totalQ > 0 ? Math.min(100, ((questionIndex + 1) / totalQ) * 100) : 0;
  const qOrdinal = String(questionIndex + 1).padStart(2, '0');
  const qTotal = String(Math.max(totalQ, 1)).padStart(2, '0');

  const scoreList = answerSlots.map((s) => s.feedback?.score).filter((x) => x != null);
  const avgScore =
    scoreList.length > 0
      ? (scoreList.reduce((a, b) => a + b, 0) / scoreList.length).toFixed(1)
      : '—';
  const bestScore = scoreList.length > 0 ? Math.max(...scoreList) : null;

  const showToast = useCallback((msg, isError = false, ms = isError ? 4000 : 3200) => {
    setToast({ msg, show: true, err: isError });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, ms);
  }, []);

  const checkStreak = useCallback(() => {
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
    const n = parseInt(localStorage.getItem('mockprep_sessions_total') || '0', 10) + 1;
    localStorage.setItem('mockprep_sessions_total', String(n));
    setSessionCount(n);
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!userId || guestMode) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `/api/get-history?user_id=${encodeURIComponent(userId)}&sessions=1&limit=10`
      );
      if (!res.ok) throw new Error('History request failed');
      const data = await res.json();
      if (data && Array.isArray(data.sessions)) setPastSessionRows(data.sessions);
      else setPastSessionRows([]);
    } catch (e) {
      showToast(e.message || 'Could not load history', true);
    } finally {
      setHistoryLoading(false);
    }
  }, [userId, guestMode, showToast]);

  const clearFeedback = useCallback(() => {
    setFeedbackData(null);
    setFeedbackError(null);
    setFeedbackLoading(false);
  }, []);

  /** Loads questions; coding uses POST /api/questions (mode: coding, difficulty: medium). */
  const loadQuestions = useCallback(
    async (resumeOverride) => {
      const rt = resumeOverride !== undefined ? resumeOverride : resumeText;
      setLoadingQuestions(true);
      setControlsDisabled(true);
      clearFeedback();
      setQuestionHint('');
      try {
        if (!mode) {
          console.warn('[MockPrep] Skipping /api/questions call: mode is undefined');
          throw new Error('Mode is not set');
        }
        const payload =
          mode === 'coding'
            ? {
              mode,
              pack: activePack,
              resumeText: rt || '',
              role: selectedRole,
              persona: interviewerPersona,
              difficulty: 'medium',
            }
            : {
              mode,
              pack: activePack,
              resumeText: rt || '',
              role: selectedRole,
              persona: interviewerPersona,
            };
        console.log('[MockPrep] POST /api/questions payload:', {
          mode: payload.mode,
          role: payload.role,
          pack: payload.pack,
          resumeText: payload.resumeText,
        });
        const res = await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');

        if (mode === 'coding') {
          const probs = data.problems;
          if (!probs || !Array.isArray(probs)) throw new Error('Invalid coding response');
          const list = probs.slice(0, 8);
          setCodingProblems(list);
          setCurrentQuestions([]);
          const first = list[0];
          const tpl = first?.templates || {};
          const starter = tpl[codeLang] || tpl.python || Object.values(tpl)[0] || STUB_TEMPLATES.python;
          setCodeBody(starter);
        } else {
          const qs = data.questions;
          if (!qs || !Array.isArray(qs)) throw new Error('Invalid response');
          setCurrentQuestions(qs.slice(0, 8));
          setCodingProblems([]);
        }
        setQuestionIndex(0);
        setAnswerSlots(Array.from({ length: 8 }, emptyAnswerSlot));
        setSessionHistory([]);
        setHistorySessionItems([]);
        activeSessionIdRef.current = null;
        sessionCompleteShownRef.current = false;
        setHiringDecision(null);
        setHiringDecisionError('');
        setHiringDecisionLoading(false);
        setAnswer('');
        setSpeechInterim('');
        bumpSessionCounter();
        if (timerPreset !== 'none') {
          const minsMap = { '15': 15, '30': 30, '45': 45 };
          const mins = minsMap[timerPreset];
          if (mins) setSessionTimerEndAt(Date.now() + mins * 60 * 1000);
        } else {
          setSessionTimerEndAt(null);
        }
      } catch (err) {
        console.error(err);
        if (mode === 'coding') {
          const stub = buildStubProblems();
          setCodingProblems(stub);
          setCurrentQuestions([]);
          setCodeBody(stub[0]?.templates?.[codeLang] || STUB_TEMPLATES.python);
        } else {
          setCurrentQuestions(FALLBACK[mode] || FALLBACK.technical);
          setCodingProblems([]);
        }
        setQuestionIndex(0);
        setAnswerSlots(Array.from({ length: 8 }, emptyAnswerSlot));
        setSessionHistory([]);
        setHistorySessionItems([]);
        activeSessionIdRef.current = null;
        sessionCompleteShownRef.current = false;
        setHiringDecision(null);
        setHiringDecisionError('');
        setHiringDecisionLoading(false);
        showToast('Using offline content — check API connection.', true);
        if (timerPreset !== 'none') {
          const minsMap = { '15': 15, '30': 30, '45': 45 };
          const mins = minsMap[timerPreset];
          if (mins) setSessionTimerEndAt(Date.now() + mins * 60 * 1000);
        } else {
          setSessionTimerEndAt(null);
        }
      } finally {
        setLoadingQuestions(false);
        setControlsDisabled(false);
      }
    },
    [mode, activePack, resumeText, selectedRole, interviewerPersona, clearFeedback, showToast, bumpSessionCounter, timerPreset]
  );

  const setMode = useCallback((m) => {
    setModeState(m);
    setActivePack('general');
  }, []);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth');
    router.refresh();
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function sync() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        setGuestMode(true);
        setAuthUser(null);
        setUserId('');
      } else {
        setGuestMode(false);
        localStorage.removeItem('guestCount');
        localStorage.removeItem('guestSubmitLocked');
        setUserId(user.id);
        setAuthUser(user);
      }
      setAuthReady(true);
    }

    sync();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setAuthUser(u);
      setUserId(u?.id ?? '');
      setGuestMode(!u);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setThemeMode(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  }, []);

  useEffect(() => {
    if (!authReady || (!userId && !guestMode)) return;
    if (!initDone.current) {
      initDone.current = true;
      setSessionCount(parseInt(localStorage.getItem('mockprep_sessions_total') || '0', 10));
      checkStreak();
      setModeState('technical');
      setActivePack('general');
      try {
        const tp = localStorage.getItem('timerPref') || localStorage.getItem('timerPreset');
        if (tp === '15' || tp === '30' || tp === '45' || tp === 'none') setTimerPreset(tp);
        const gc = parseInt(localStorage.getItem('guestCount') || '0', 10);
        if (!Number.isNaN(gc)) {
          setGuestCount(gc);
          setGuestSubmitLocked(gc >= 3);
        }
      } catch {
        /* ignore */
      }
    }
  }, [authReady, userId, guestMode, checkStreak]);

  useEffect(() => {
    questionStartedAtRef.current = Date.now();
  }, [questionIndex, loadingQuestions]);

  useEffect(() => {
    if (!sessionTimerEndAt) {
      setTimerRemainingSec(null);
      return undefined;
    }
    const tick = () => {
      const rem = Math.max(0, Math.floor((sessionTimerEndAt - Date.now()) / 1000));
      setTimerRemainingSec(rem);
      if (rem <= 0) {
        setSessionTimerEndAt(null);
        setTimeUpModalOpen(true);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [sessionTimerEndAt]);

  useEffect(() => {
    if (loadingQuestions || totalQ < 1) return;
    if (submittedCount >= totalQ && !sessionCompleteShownRef.current) {
      sessionCompleteShownRef.current = true;
      setSessionModalOpen(true);
    }
  }, [submittedCount, totalQ, loadingQuestions]);

  useEffect(() => {
    if (!sessionModalOpen || loadingQuestions) return;
    if (submittedCount < totalQ || totalQ < 1) return;

    const seq = ++hiringModalSeqRef.current;
    const probs =
      difficulty === 'All' ? codingProblems : codingProblems.filter((p) => p.difficulty === difficulty);

    const answersPayload = [];
    for (let i = 0; i < totalQ; i++) {
      const s = answerSlots[i];
      if (!s?.submitted) continue;
      let qLabel;
      if (isCoding) {
        qLabel = probs[i]?.title || codingProblems[i]?.title || `Problem ${i + 1}`;
      } else {
        qLabel = currentQuestions[i] || `Question ${i + 1}`;
      }
      const answer = isCoding ? String(s.code || '').trim() : String(s.text || '').trim();
      answersPayload.push({
        question: String(qLabel).slice(0, 12000),
        answer: answer.slice(0, 50000),
        score: typeof s.feedback?.score === 'number' ? s.feedback.score : null,
      });
    }

    if (answersPayload.length === 0) return;

    setHiringDecisionLoading(true);
    setHiringDecisionError('');
    setHiringDecision(null);

    fetch('/api/hiring-decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: answersPayload,
        mode,
        role: selectedRole,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (seq !== hiringModalSeqRef.current) return;
        if (!res.ok) throw new Error(data.error || 'Hiring decision failed');
        setHiringDecision(data);
      })
      .catch((e) => {
        if (seq !== hiringModalSeqRef.current) return;
        setHiringDecisionError(e.message || 'Failed to load hiring decision');
      })
      .finally(() => {
        if (seq === hiringModalSeqRef.current) setHiringDecisionLoading(false);
      });
  }, [
    sessionModalOpen,
    submittedCount,
    totalQ,
    loadingQuestions,
    answerSlots,
    mode,
    selectedRole,
    isCoding,
    currentQuestions,
    codingProblems,
    difficulty,
  ]);

  const logViolation = useCallback(
    async (detail, vType = 'paste_attempt') => {
      if (!userId) return;
      try {
        await fetch('/api/log-violation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, type: vType, detail }),
        });
      } catch {
        /* ignore */
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!authReady || (!userId && !guestMode)) return;
    if (setupModalOpen) return;
    loadQuestions();
  }, [mode, activePack, selectedRole, timerPreset, loadQuestions, authReady, userId, guestMode, setupModalOpen, interviewerPersona]);

  useEffect(() => {
    document.body.classList.toggle('high-contrast', highContrast);
  }, [highContrast]);

  useEffect(() => {
    document.body.classList.toggle('large-text', largeText);
  }, [largeText]);

  useEffect(() => {
    return () => {
      if (resumeConfirmTimerRef.current) clearTimeout(resumeConfirmTimerRef.current);
      if (answerFlashTimerRef.current) clearTimeout(answerFlashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSessionModalOpen(false);
        setSettingsOpen(false);
        setTimeUpModalOpen(false);
      }
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        submitAnswerRef.current?.();
      }
      if (e.ctrlKey && e.key === 'ArrowRight') {
        e.preventDefault();
        goNextRef.current?.();
      }
      if (e.ctrlKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrevRef.current?.();
      }
      if (e.ctrlKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        toggleRecordRef.current?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const getReadAloudText = useCallback(() => {
    if (isCoding && currentProblem) {
      return `${currentProblem.title}. ${currentProblem.description}`;
    }
    return currentTextQuestion;
  }, [isCoding, currentProblem, currentTextQuestion]);

  const runSpeech = useCallback((text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.92;
    utt.lang = 'en-IN';
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      const v =
        voices.find((x) => x.lang === 'en-IN') ||
        voices.find((x) => x.lang && x.lang.startsWith('en-IN')) ||
        voices.find((x) => x.lang && x.lang.startsWith('en'));
      if (v) utt.voice = v;
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
    utt.onend = () => setTtsSpeaking(false);
    utt.onerror = () => setTtsSpeaking(false);
    utterRef.current = utt;
    window.speechSynthesis.speak(utt);
    setTtsSpeaking(true);
  }, []);

  const toggleReadAloudManual = useCallback(() => {
    if (ttsSpeaking) {
      window.speechSynthesis.cancel();
      setTtsSpeaking(false);
      return;
    }
    const text = getReadAloudText();
    runSpeech(text);
  }, [ttsSpeaking, getReadAloudText, runSpeech]);

  useEffect(() => {
    if (loadingQuestions) return;
    if (!readAloudOn && activeTab !== 'audio') return;
    const text = getReadAloudText();
    if (!text) return;
    runSpeech(text);
  }, [readAloudOn, activeTab, questionIndex, loadingQuestions, getReadAloudText, runSpeech]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('FaceDetector' in window) || !window.FaceDetector) {
      setFaceLookToast(false);
      consecutiveNoFaceRef.current = 0;
      return undefined;
    }
    if (!videoActive || activeTab !== 'video' || !videoRef.current) {
      setFaceLookToast(false);
      consecutiveNoFaceRef.current = 0;
      return undefined;
    }
    let detector;
    try {
      detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    } catch {
      return undefined;
    }
    let cancelled = false;
    consecutiveNoFaceRef.current = 0;
    const id = setInterval(async () => {
      if (cancelled || !videoRef.current) return;
      const video = videoRef.current;
      if (!video.videoWidth) return;
      let bmp;
      try {
        bmp = await createImageBitmap(video);
        const faces = await detector.detect(bmp);
        if (faces.length > 0) {
          consecutiveNoFaceRef.current = 0;
          setFaceLookToast(false);
        } else {
          consecutiveNoFaceRef.current += 1;
          if (consecutiveNoFaceRef.current >= 3) setFaceLookToast(true);
        }
      } catch {
        /* silent */
      } finally {
        if (bmp && typeof bmp.close === 'function') {
          try {
            bmp.close();
          } catch {
            /* ignore */
          }
        }
      }
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [videoActive, activeTab]);

  const stopAudioViz = () => {
    if (rafAudioRef.current) cancelAnimationFrame(rafAudioRef.current);
    rafAudioRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    setAudioLevels([4, 8, 12, 16, 10]);
  };

  const startAudioViz = async () => {
    stopAudioViz();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.65;
      src.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const bins = 5;
        const step = Math.floor(data.length / bins);
        const levels = [];
        for (let i = 0; i < bins; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += data[i * step + j] || 0;
          const avg = sum / step;
          levels.push(Math.max(4, (avg / 255) * 40));
        }
        setAudioLevels(levels);
        rafAudioRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      /* mic visualizer optional */
    }
  };

  const stopReconnectLoop = useCallback(() => {
    if (reconnectIntervalRef.current) {
      clearInterval(reconnectIntervalRef.current);
      reconnectIntervalRef.current = null;
    }
    cameraRecoveringRef.current = false;
  }, []);

  const detachTrackListeners = useCallback(() => {
    const track = videoTrackRef.current;
    if (!track) return;
    track.onended = null;
    track.onmute = null;
    track.onunmute = null;
    videoTrackRef.current = null;
  }, []);

  const handleCameraRestored = useCallback(() => {
    stopReconnectLoop();
    setCameraLost(false);
    setReconnectingCamera(false);
    setVideoActive(true);
  }, [stopReconnectLoop]);

  const attachTrackListeners = useCallback(
    (stream) => {
      if (!stream || typeof stream.getVideoTracks !== 'function') return;
      detachTrackListeners();
      const track = stream.getVideoTracks()[0];
      if (!track) return;
      videoTrackRef.current = track;
      track.onended = () => {
        if (cameraEnabledRef.current) {
          setCameraLost(true);
          setReconnectingCamera(true);
        }
      };
      track.onmute = () => {
        if (cameraEnabledRef.current) {
          setCameraLost(true);
          setReconnectingCamera(true);
        }
      };
      track.onunmute = () => {
        handleCameraRestored();
      };
    },
    [detachTrackListeners, handleCameraRestored]
  );

  const attemptCameraReconnect = useCallback(async () => {
    if (!cameraEnabledRef.current || cameraRecoveringRef.current) return;
    cameraRecoveringRef.current = true;
    try {
      const next = await navigator.mediaDevices.getUserMedia({ video: true });
      const prev = videoStreamRef.current;
      if (prev && typeof prev.getTracks === 'function') {
        prev.getTracks().forEach((t) => t.stop());
      }
      videoStreamRef.current = next;
      if (videoRef.current) {
        videoRef.current.srcObject = next;
      }
      attachTrackListeners(next);
      handleCameraRestored();
    } catch {
      setCameraLost(true);
      setReconnectingCamera(true);
      setVideoActive(false);
      cameraRecoveringRef.current = false;
    }
  }, [attachTrackListeners, handleCameraRestored]);

  const handleCameraLost = useCallback(() => {
    if (!cameraEnabledRef.current) return;
    setCameraLost(true);
    setReconnectingCamera(true);
    setVideoActive(false);
    if (reconnectIntervalRef.current) return;
    reconnectIntervalRef.current = setInterval(() => {
      attemptCameraReconnect();
    }, 2000);
  }, [attemptCameraReconnect]);

  const startCamera = async () => {
    if (selfPaced) return;
    setCameraEnabled(true);
    cameraEnabledRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoStreamRef.current = stream;
      attachTrackListeners(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
      handleCameraRestored();
      showToast('Camera enabled');
    } catch {
      setCameraEnabled(false);
      cameraEnabledRef.current = false;
      setCameraLost(false);
      setReconnectingCamera(false);
      showToast('Camera access denied', true);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const id = window.setInterval(() => {
      if (!cameraEnabledRef.current) return;
      const video = videoRef.current;
      if (!video) return;
      const unhealthy =
        video.readyState === 0 ||
        video.videoWidth === 0 ||
        (video.srcObject &&
          typeof video.srcObject.getVideoTracks === 'function' &&
          video.srcObject.getVideoTracks()[0] &&
          (video.srcObject.getVideoTracks()[0].readyState === 'ended' ||
            video.srcObject.getVideoTracks()[0].muted));
      if (unhealthy) {
        handleCameraLost();
      }
    }, 1500);
    return () => {
      window.clearInterval(id);
      stopReconnectLoop();
      detachTrackListeners();
      const stream = videoStreamRef.current;
      if (stream && typeof stream.getTracks === 'function') {
        stream.getTracks().forEach((t) => t.stop());
      }
      videoStreamRef.current = null;
    };
  }, [detachTrackListeners, handleCameraLost, stopReconnectLoop]);

  const toggleRecord = useCallback(async () => {
    if (selfPaced) return;
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      showToast('Speech recognition not supported in this browser', true);
      return;
    }
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      stopAudioViz();
      setSpeechInterim('');
      return;
    }
    await startAudioViz();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (final) {
        setAnswer((prev) => prev + final + ' ');
      }
      setSpeechInterim(interim);
      if (captionOn) {
        setCaptionText(interim || final || '');
      }
    };
    rec.onerror = () => showToast('Mic error — check permissions', true);
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  }, [recording, captionOn, showToast]);

  toggleRecordRef.current = toggleRecord;

  const saveSessionRemote = async (payload) => {
    console.log('[MockPrep] saveSessionRemote called, userId:', userId, 'guestMode:', guestMode);
    if (!userId || typeof userId !== 'string' || userId.trim() === '' || guestMode) return;
    try {
      const res = await fetch('/api/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: payload.mode,
          question: payload.question,
          answer: payload.answer,
          score: payload.score,
          accuracy: payload.accuracy,
          clarity: payload.clarity,
          depth: payload.depth,
          feedback: payload.feedback,
          user_id: userId,
          session_id: payload.session_id ?? activeSessionIdRef.current ?? undefined,
          time_taken_seconds: payload.time_taken_seconds,
          ideal_answer: payload.ideal_answer,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      if (data.session_id) {
        activeSessionIdRef.current = data.session_id;
        lastSessionIdRef.current = data.session_id;
      }
    } catch (e) {
      showToast(e.message || 'Could not save session', true);
    }
  };

  const commitAnswer = useCallback(async () => {
    if (answerSlots[questionIndex]?.submitted) return;
    if (guestSubmitLocked) {
      setGuestLimitModalOpen(true);
      return;
    }

    const textAnswer = (answer + speechInterim).trim();
    const codeAns = (codeBody || '').trim();

    if (isCoding) {
      if (!codeAns) {
        showToast('Write some code first', true);
        return;
      }
    } else if (!textAnswer) {
      showToast('Please enter or record an answer first', true);
      return;
    }

    if (!isCoding && textAnswer.length > 2000) {
      showToast(`Answer too long (${textAnswer.length}/2000 chars).`, true);
      return;
    }

    const textSnap = isCoding ? '' : textAnswer;
    const codeSnap = isCoding ? codeAns : '';

    setAnswerSlots((prev) => {
      const n = [...prev];
      n[questionIndex] = {
        ...n[questionIndex],
        text: textSnap,
        code: codeSnap,
        lang: codeLang,
        submitted: true,
      };
      return n;
    });
    await saveSessionRemote({
      mode,
      question: isCoding ? (currentProblem?.title || 'Coding Problem') : currentTextQuestion,
      answer: isCoding ? codeBody : textAnswer,
      score: null,
      accuracy: null,
      clarity: null,
      depth: null,
      feedback: null,
      session_id: activeSessionIdRef.current,
      time_taken_seconds: Math.max(0, Math.floor((Date.now() - questionStartedAtRef.current) / 1000)),
      ideal_answer: '',
    });

    if (isCoding && questionIndex >= totalQ - 1) {
      showToast('Answer saved.');
    }

    if (!isCoding) {
      setAnswerSavedFlash(true);
      if (answerFlashTimerRef.current) clearTimeout(answerFlashTimerRef.current);
      answerFlashTimerRef.current = setTimeout(() => {
        setAnswerSavedFlash(false);
        answerFlashTimerRef.current = null;
      }, 2000);
      if (guestMode) {
        const nextGuestCount = guestCount + 1;
        setGuestCount(nextGuestCount);
        localStorage.setItem('guestCount', String(nextGuestCount));
        if (nextGuestCount >= 3) {
          setGuestLimitModalOpen(true);
          setGuestSubmitLocked(true);
        }
      }
    }
  }, [
    answer,
    speechInterim,
    codeBody,
    codeLang,
    isCoding,
    questionIndex,
    totalQ,
    showToast,
    answerSlots,
    mode,
    currentProblem,
    currentTextQuestion,
    saveSessionRemote,
    guestMode,
    guestCount,
    guestSubmitLocked,
  ]);

  const resetFollowupState = useCallback(() => {
    followupAbortRef.current = null;
    setFollowupPhase('idle');
    setFollowupQuestionText('');
    setStashedMainAnswer('');
    skipFollowupHandledRef.current = false;
  }, []);

  const completeTextQuestionSave = useCallback(
    async (mainText, followupQ, followupAns) => {
      if (answerSlots[questionIndex]?.submitted) return;
      if (guestSubmitLocked) {
        setGuestLimitModalOpen(true);
        return;
      }

      const main = String(mainText || '').trim();
      const stored =
        followupQ && typeof followupAns === 'string' && followupAns.trim()
          ? `Answer: ${main}\n\nFollow-up: ${String(followupQ).trim()}\nFollow-up Answer: ${followupAns.trim()}`
          : main;

      if (!stored) {
        showToast('Please enter or record an answer first', true);
        return;
      }

      setAnswerSlots((prev) => {
        const n = [...prev];
        n[questionIndex] = {
          ...n[questionIndex],
          text: stored,
          code: '',
          lang: codeLang,
          submitted: true,
        };
        return n;
      });

      await saveSessionRemote({
        mode,
        question: currentTextQuestion,
        answer: stored,
        score: null,
        accuracy: null,
        clarity: null,
        depth: null,
        feedback: null,
        session_id: activeSessionIdRef.current,
        time_taken_seconds: Math.max(0, Math.floor((Date.now() - questionStartedAtRef.current) / 1000)),
        ideal_answer: '',
      });

      setAnswerSavedFlash(true);
      if (answerFlashTimerRef.current) clearTimeout(answerFlashTimerRef.current);
      answerFlashTimerRef.current = setTimeout(() => {
        setAnswerSavedFlash(false);
        answerFlashTimerRef.current = null;
      }, 2000);
      if (guestMode) {
        const nextGuestCount = guestCount + 1;
        setGuestCount(nextGuestCount);
        localStorage.setItem('guestCount', String(nextGuestCount));
        if (nextGuestCount >= 3) {
          setGuestLimitModalOpen(true);
          setGuestSubmitLocked(true);
        }
      }
    },
    [
      answerSlots,
      questionIndex,
      guestSubmitLocked,
      guestMode,
      guestCount,
      showToast,
      mode,
      currentTextQuestion,
      codeLang,
      saveSessionRemote,
    ]
  );

  const fetchAiFeedback = useCallback(async () => {
    const s = answerSlots[questionIndex];

    let textAnswer = isCoding ? '' : (s?.text || '').trim();
    let codeAns = isCoding ? (s?.code || '').trim() : '';

    if (isCoding) {
      if (!s?.submitted) {
        codeAns = (codeBody || '').trim();
      }
      if (!codeAns) {
        showToast('No code to analyse', true);
        return;
      }
    } else {
      if (!s?.submitted) {
        textAnswer = (answer + speechInterim).trim();
      }
      if (!textAnswer) {
        showToast('No answer to analyse', true);
        return;
      }
    }

    const qStr = isCoding
      ? problemToFeedbackQuestion(currentProblem)
      : currentTextQuestion;
    const aStr = isCoding ? codeAns : textAnswer;

    setFeedbackLoading(true);
    setFeedbackError(null);
    setFeedbackData(null);
    if (isCoding) {
      setCodingOutputOpen(true);
    }

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: qStr,
          answer: aStr,
          mode,
          role: selectedRole,
          persona: interviewerPersona,
        }),
      });
      const parsed = await res.json();
      if (!res.ok || parsed.error) throw new Error(parsed.error || 'Feedback failed');

      setFeedbackData(parsed);

      const labelQ = isCoding ? currentProblem?.title || 'Coding' : currentTextQuestion;
      setAnswerSlots((prev) => {
        const n = [...prev];
        n[questionIndex] = {
          ...n[questionIndex],
          feedback: parsed,
          err: null,
          hint: questionHint,
        };
        return n;
      });
      setSessionHistory((prev) => [
        ...prev,
        { q: labelQ, score: parsed.score, feedback: parsed.feedback },
      ]);
      setHistorySessionItems((prev) => [
        {
          score: parsed.score,
          q: labelQ,
          key: `${Date.now()}-${prev.length}`,
        },
        ...prev,
      ]);

      const timeTaken = Math.max(
        0,
        Math.floor((Date.now() - questionStartedAtRef.current) / 1000)
      );
      await saveSessionRemote({
        mode,
        question: qStr.slice(0, 12000),
        answer: aStr.slice(0, 50000),
        score: parsed.score,
        accuracy: parsed.accuracy,
        clarity: parsed.clarity,
        depth: parsed.depth,
        feedback: parsed.feedback,
        session_id: activeSessionIdRef.current,
        time_taken_seconds: timeTaken,
        ideal_answer: typeof parsed.idealAnswer === 'string' ? parsed.idealAnswer : '',
      });
    } catch (e) {
      const msg = e.message || 'Failed to get feedback';
      setFeedbackError(msg);
      showToast(msg, true);
      setAnswerSlots((prev) => {
        const n = [...prev];
        n[questionIndex] = {
          ...n[questionIndex],
          err: msg,
        };
        return n;
      });
    } finally {
      setFeedbackLoading(false);
    }
  }, [
    answerSlots,
    questionIndex,
    isCoding,
    answer,
    speechInterim,
    currentTextQuestion,
    currentProblem,
    mode,
    questionHint,
    selectedRole,
    interviewerPersona,
    showToast,
    userId,
    codeBody,
  ]);

  const runCodingOutputCases = useCallback(
    (includeHiddenPlaceholders) => {
      const p = codingProblems[questionIndex];
      if (!p) return;
      setCodingOutputOpen(true);
      const vis = runCodingSampleCases(p, codeBody, codeLang);
      if (!includeHiddenPlaceholders) {
        setCodingCaseRows(vis);
        return;
      }
      const hidden = (p.hiddenTests || [{}, {}]).slice(0, 2).map((_, idx) => ({
        key: `h-${idx}`,
        label: `Hidden ${idx + 1}`,
        pass: null,
        detail: '+ 2 hidden test cases',
      }));
      setCodingCaseRows([...vis, ...hidden]);
    },
    [codingProblems, questionIndex, codeBody, codeLang]
  );

  const handleCodingRunClick = useCallback(() => {
    runCodingOutputCases(false);
  }, [runCodingOutputCases]);

  const handleCodingSubmitAllClick = useCallback(async () => {
    if (!codingProblems[questionIndex]) return;
    const codeAns = (codeBody || '').trim();
    if (!codeAns) {
      showToast('Write some code first', true);
      return;
    }
    runCodingOutputCases(true);
    await new Promise((r) => requestAnimationFrame(() => r()));
    await commitAnswer();
    setTimeout(() => goNextRef.current?.(), 300);
  }, [
    runCodingOutputCases,
    codingProblems,
    questionIndex,
    commitAnswer,
    codeBody,
    showToast,
  ]);

  const goNext = useCallback(() => {
    if (questionIndex < totalQ - 1) setQuestionIndex((i) => i + 1);
  }, [questionIndex, totalQ]);

  const handleNext = useCallback(() => {
    goNext();
  }, [goNext]);

  const handleSkipFollowup = useCallback(async () => {
    if (isCoding) return;
    if (followupPhase === 'idle') return;

    skipFollowupHandledRef.current = true;
    if (followupPhase === 'loading') {
      followupAbortRef.current?.abort();
    }

    const main = stashedMainAnswer.trim();
    if (!main) {
      resetFollowupState();
      return;
    }

    await completeTextQuestionSave(main, null, null);
    resetFollowupState();
    setAnswer('');
    setSpeechInterim('');
    if (captionOn) setCaptionText('');
    goNext();
  }, [
    isCoding,
    followupPhase,
    stashedMainAnswer,
    completeTextQuestionSave,
    resetFollowupState,
    goNext,
    captionOn,
  ]);

  const handleSubmit = useCallback(async () => {
    if (isCoding) {
      await commitAnswer();
      await new Promise((r) => setTimeout(r, 500));
      goNext();
      return;
    }

    if (followupPhase === 'loading') return;

    if (followupPhase === 'awaiting') {
      const fu = (answer + speechInterim).trim();
      if (!fu) {
        showToast('Please enter a follow-up answer or use Skip follow-up', true);
        return;
      }
      if (fu.length > 2000) {
        showToast(`Answer too long (${fu.length}/2000 chars).`, true);
        return;
      }
      if (guestSubmitLocked) {
        setGuestLimitModalOpen(true);
        return;
      }
      await completeTextQuestionSave(stashedMainAnswer, followupQuestionText, fu);
      resetFollowupState();
      setAnswer('');
      setSpeechInterim('');
      if (captionOn) setCaptionText('');
      goNext();
      return;
    }

    const textAnswer = (answer + speechInterim).trim();
    if (!textAnswer) {
      showToast('Please enter or record an answer first', true);
      return;
    }
    if (textAnswer.length > 2000) {
      showToast(`Answer too long (${textAnswer.length}/2000 chars).`, true);
      return;
    }
    if (guestSubmitLocked) {
      setGuestLimitModalOpen(true);
      return;
    }

    setStashedMainAnswer(textAnswer);
    setFollowupPhase('loading');
    skipFollowupHandledRef.current = false;

    const ac = new AbortController();
    followupAbortRef.current = ac;

    try {
      const res = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentTextQuestion,
          answer: textAnswer,
          mode,
          role: selectedRole,
          persona: interviewerPersona,
        }),
        signal: ac.signal,
      });
      const data = await res.json().catch(() => ({}));

      if (skipFollowupHandledRef.current) return;

      if (!res.ok || data.error) {
        showToast(data.error || 'Could not generate follow-up', true);
        await completeTextQuestionSave(textAnswer, null, null);
        resetFollowupState();
        setAnswer('');
        setSpeechInterim('');
        goNext();
        return;
      }

      const fq = typeof data.followup === 'string' ? data.followup.trim() : '';
      if (!fq) {
        showToast('Empty follow-up — saving your answer.', true);
        await completeTextQuestionSave(textAnswer, null, null);
        resetFollowupState();
        setAnswer('');
        setSpeechInterim('');
        goNext();
        return;
      }

      setFollowupQuestionText(fq);
      setFollowupPhase('awaiting');
      setAnswer('');
      setSpeechInterim('');
      if (captionOn) setCaptionText('');
    } catch (e) {
      if (e?.name === 'AbortError') return;
      if (skipFollowupHandledRef.current) return;
      showToast(e.message || 'Could not generate follow-up', true);
      await completeTextQuestionSave(textAnswer, null, null);
      resetFollowupState();
      setAnswer('');
      setSpeechInterim('');
      goNext();
    } finally {
      followupAbortRef.current = null;
    }
  }, [
    isCoding,
    followupPhase,
    answer,
    speechInterim,
    captionOn,
    guestSubmitLocked,
    showToast,
    mode,
    selectedRole,
    interviewerPersona,
    currentTextQuestion,
    stashedMainAnswer,
    followupQuestionText,
    completeTextQuestionSave,
    resetFollowupState,
    goNext,
    commitAnswer,
  ]);

  useEffect(() => {
    submitAnswerRef.current = () => {
      void handleSubmit();
    };
  }, [handleSubmit]);

  const goPrev = useCallback(() => {
    if (questionIndex > 0) setQuestionIndex((i) => i - 1);
  }, [questionIndex]);

  useEffect(() => {
    goNextRef.current = goNext;
  }, [goNext]);

  useEffect(() => {
    followupAbortRef.current?.abort();
    followupAbortRef.current = null;
    setFollowupPhase('idle');
    setFollowupQuestionText('');
    setStashedMainAnswer('');
    skipFollowupHandledRef.current = false;
  }, [questionIndex]);

  useEffect(() => {
    goPrevRef.current = goPrev;
  }, [goPrev]);

  useEffect(() => {
    cameraHeightRef.current = cameraHeight;
  }, [cameraHeight]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('cameraHeight');
      if (raw == null) return;
      const h = parseInt(raw, 10);
      if (!Number.isNaN(h) && h >= 120 && h <= 500) {
        setCameraHeight(h);
        cameraHeightRef.current = h;
      }
    } catch {
      /* ignore */
    }
  }, []);

  const onCameraResizeStart = useCallback((e) => {
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const startX = clientX;
    const startH = cameraHeightRef.current;

    const move = (ev) => {
      if (ev.touches) ev.preventDefault();
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const next = Math.min(500, Math.max(120, startH + (cx - startX)));
      cameraHeightRef.current = next;
      setCameraHeight(next);
    };

    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
      window.removeEventListener('touchcancel', up);
      try {
        localStorage.setItem('cameraHeight', String(cameraHeightRef.current));
      } catch {
        /* ignore */
      }
    };

    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    window.addEventListener('touchcancel', up);
  }, []);

  useEffect(() => {
    if (loadingQuestions) return;
    const s = answerSlots[questionIndex];
    if (!s) return;
    if (!isCoding && s.submitted) {
      setAnswer('');
    } else {
      setAnswer(s.text || '');
    }
    setSpeechInterim('');
    setCaptionText('');
    setFeedbackData(s.feedback);
    setFeedbackError(s.err);
    setQuestionHint(s.hint || '');
    if (!isCoding) return;
    const p = codingProblems[questionIndex];
    const tpl = p?.templates || {};
    if (s.code) {
      setCodeBody(s.code);
    } else if (p) {
      setCodeBody(tpl[codeLang] || tpl.python || STUB_TEMPLATES.python);
    }
  }, [questionIndex, loadingQuestions, isCoding, codingProblems, answerSlots, codeLang]);

  useEffect(() => {
    if (loadingQuestions || !isCoding) return;
    const s = answerSlots[questionIndex];
    if (s?.code) return;
    const p = codingProblems[questionIndex];
    const tpl = p?.templates || {};
    if (tpl[codeLang]) setCodeBody(tpl[codeLang]);
  }, [codeLang, questionIndex, isCoding, codingProblems, loadingQuestions, answerSlots]);

  useEffect(() => {
    if (loadingQuestions || !isCoding) return;
    const s = answerSlots[questionIndex];
    if (s?.feedback && s.lang) setCodeLang(s.lang);
  }, [questionIndex, loadingQuestions, isCoding, answerSlots]);

  useEffect(() => {
    if (!isCoding) return;
    setCodingOutputOpen(false);
    setCodingCaseRows([]);
  }, [questionIndex, isCoding]);

  useEffect(() => {
    setAnswerSavedFlash(false);
  }, [questionIndex]);

  const closeReport = useCallback(() => {
    setSessionModalOpen(false);
    setTimeout(() => {
      setActivePack('general');
      loadQuestions();
    }, 300);
  }, [loadQuestions]);

  const copyResults = useCallback(() => {
    if (scoreList.length === 0) {
      showToast('No results to copy.', true);
      return;
    }
    const avg = (scoreList.reduce((a, b) => a + b, 0) / scoreList.length).toFixed(1);
    const best = Math.max(...scoreList);
    const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
    const lines = [
      'MockPrep Session Report',
      `Mode: ${modeLabel} · Role: ${selectedRole}`,
      `Questions answered: ${scoreList.length}`,
      `Average score: ${avg}/10`,
      `Best score: ${best}/10`,
      '',
      'Question Breakdown:',
      ...sessionHistory.map(
        (item, i) => `  Q${i + 1}. [${item.score}/10] ${(item.q || '').substring(0, 70)}`
      ),
    ];
    navigator.clipboard
      .writeText(lines.join('\n'))
      .then(() => showToast('📋 Results copied to clipboard!'))
      .catch(() => showToast('Could not access clipboard.', true));
  }, [scoreList, mode, sessionHistory, selectedRole, showToast]);

  const shuffleOrder = () => {
    if (isCoding) {
      setCodingProblems((prev) => {
        const next = shuffleArray(prev);
        const p0 = next[0];
        const tpl = p0?.templates || {};
        setCodeBody(tpl[codeLang] || tpl.python || STUB_TEMPLATES.python);
        return next;
      });
    } else {
      setCurrentQuestions((prev) => shuffleArray(prev));
    }
    setQuestionIndex(0);
    setAnswer('');
    setSpeechInterim('');
    clearFeedback();
    setQuestionHint('');
    setAnswerSlots(Array.from({ length: 8 }, emptyAnswerSlot));
  };

  const getHint = async () => {
    const qPayload = isCoding
      ? problemToFeedbackQuestion(currentProblem)
      : currentTextQuestion;
    if (!qPayload) return;
    setHintLoading(true);
    setQuestionHint('');
    try {
      const res = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: qPayload,
          mode,
          role: selectedRole,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Hint failed');
      const hintText = data.hint || '';
      setQuestionHint(hintText);
      setAnswerSlots((prev) => {
        const n = [...prev];
        n[questionIndex] = { ...n[questionIndex], hint: hintText };
        return n;
      });
    } catch (e) {
      showToast(e.message || 'Hint failed', true);
    } finally {
      setHintLoading(false);
    }
  };

  async function loadPdfJs() {
    if (typeof window === 'undefined') return null;
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      return window.pdfjsLib;
    }
    if (!document.querySelector('script[data-pdfjs]')) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        s.dataset.pdfjs = '1';
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });
    } else {
      await new Promise((r) => setTimeout(r, 100));
    }
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) return null;
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    return pdfjsLib;
  }

  const flashResumeConfirm = useCallback(() => {
    setResumeConfirm('✓ Resume loaded');
    if (resumeConfirmTimerRef.current) clearTimeout(resumeConfirmTimerRef.current);
    resumeConfirmTimerRef.current = setTimeout(() => {
      setResumeConfirm('');
      setResumeExpanded(false);
      resumeConfirmTimerRef.current = null;
    }, 3000);
  }, []);

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let text = '';
      const isPdf =
        file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
      if (isPdf) {
        const pdfjsLib = await loadPdfJs();
        if (!pdfjsLib) throw new Error('PDF library failed to load');
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((it) => it.str).join(' ') + '\n';
        }
        text = text.trim();
        if (text.length < 40) {
          showToast('PDF text extraction limited — add more text below if needed.', true);
        }
      } else {
        text = (await file.text()).trim();
      }
      const trimmed = text.substring(0, 3000);
      setResumeText(trimmed);
      setResumeFileName(file.name);
      lastResumeSyncedRef.current = trimmed;
      flashResumeConfirm();
      loadQuestions(trimmed);
    } catch (err) {
      showToast('Could not read file', true);
      console.error(err);
    }
    e.target.value = '';
  };

  const handleResumeTextBlur = () => {
    const trimmed = resumeText.trim().substring(0, 3000);
    if (trimmed === lastResumeSyncedRef.current) return;
    lastResumeSyncedRef.current = trimmed;
    loadQuestions(trimmed);
  };

  const clearResume = () => {
    setResumeText('');
    setResumeFileName('');
    setResumeConfirm('');
    lastResumeSyncedRef.current = '';
    loadQuestions('');
  };

  const sessionAvg = avgScore;
  const sessionBest = bestScore !== null ? bestScore.toFixed(1) : '—';
  const weakOnes = [0, 1, 2, 3, 4, 5, 6, 7]
    .map((i) => {
      const fb = answerSlots[i]?.feedback;
      if (!fb || fb.score >= 6) return null;
      const qLabel = isCoding ? codingProblems[i]?.title : currentQuestions[i];
      return { q: qLabel || `Q${i + 1}`, score: fb.score, tip: fb.feedback };
    })
    .filter(Boolean);

  const avgNumParsed = parseFloat(avgScore);
  const sessionGrade =
    !Number.isNaN(avgNumParsed) && scoreList.length > 0
      ? avgNumParsed >= 8
        ? 'A'
        : avgNumParsed >= 6
          ? 'B'
          : avgNumParsed >= 4
            ? 'C'
            : 'D'
      : '—';

  const improvementTips = weakOnes.map((w) => w.tip).filter(Boolean).slice(0, 5);

  const openHistoryPanel = () => {
    const next = !historyVisible;
    setHistoryVisible(next);
    if (next) fetchHistory();
  };

  const diffClass =
    currentProblem &&
    ({
      Easy: 'easy',
      Medium: 'medium',
      Hard: 'hard',
    }[currentProblem.difficulty] || 'medium');

  const currentSlot = answerSlots[questionIndex] ?? emptyAnswerSlot();
  const currentQuestionSubmitted = !!answerSlots[questionIndex]?.submitted;
  const readOnly = currentQuestionSubmitted;

  const userDisplayName = guestMode
    ? 'Guest mode'
    : authUser?.email || authUser?.user_metadata?.full_name || 'Signed in';

  if (!authReady) {
    return (
      <div className="app-shell app-shell--auth-loading">
        <p className="auth-loading-msg">Loading…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div
        className={`sidebar-backdrop ${mobileSidebarOpen ? 'open' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden
      />

      <aside
        className={`sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}
        aria-label="Interview modes and statistics"
      >
        <div className="sidebar__brand">MockPrep</div>

        <div className="sidebar__section-label">Role</div>
        <select
          className="role-select"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <div className="sidebar__section-label">Mode</div>
        <div className="mode-list" role="list">
          {[
            { id: 'technical', label: 'Technical' },
            { id: 'hr', label: 'HR / Behavioral' },
            { id: 'case', label: 'Case Study' },
            { id: 'stress', label: 'Stress Round' },
            { id: 'coding', label: 'Coding Round' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              role="listitem"
              className={`mode-item ${mode === m.id ? 'active' : ''}`}
              aria-pressed={mode === m.id}
              data-tip={m.label}
              onClick={() => {
                setMode(m.id);
                setMobileSidebarOpen(false);
                setMobilePanel(null);
              }}
            >
              {mode === m.id ? (
                <span className="mode-mark" aria-hidden>
                  ▎{' '}
                </span>
              ) : null}
              <span className="mode-item__icon" aria-hidden>
                {m.id === 'technical'
                  ? '⚙'
                  : m.id === 'hr'
                    ? '💬'
                    : m.id === 'case'
                      ? '📊'
                      : m.id === 'stress'
                        ? '⚡'
                        : '💻'}
              </span>
              <span className="mode-item__label">{m.label}</span>
            </button>
          ))}
        </div>



        {mode === 'technical' && (
          <>
            <div className="sidebar__section-label">Company pack</div>
            <div className="pack-row">
              {['general', 'tcs', 'infosys', 'wipro', 'faang'].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`pack-chip ${activePack === p ? 'active' : ''}`}
                  onClick={() => {
                    setActivePack(p);
                    setMobileSidebarOpen(false);
                  }}
                >
                  {p === 'general'
                    ? 'General'
                    : p === 'faang'
                      ? 'FAANG'
                      : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </>
        )}

        {mode === 'coding' && (
          <div className="sidebar-section">
            <div className="sidebar-section-label">DIFFICULTY</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['All', 'Easy', 'Medium', 'Hard'].map(d => (
                <button
                  key={d}
                  className={`pack-btn${difficulty === d ? ' active' : ''}`}
                  onClick={() => setDifficulty(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="sidebar__section-label">Session</div>
        <div className="stats-stack">
          <div className="stat-line">
            <span className="stat-line__val">{String(submittedCount).padStart(2, '0')}</span>
            <span className="stat-line__lbl">Answered</span>
          </div>
          <div className="stat-line">
            <span className="stat-line__val">{avgScore}</span>
            <span className="stat-line__lbl">Avg score</span>
          </div>
          <div className="stat-line">
            <span className="stat-line__val">
              {bestScore !== null ? bestScore.toFixed(1) : '—'}
            </span>
            <span className="stat-line__lbl">Best</span>
          </div>
          <div className="stat-line">
            <span className="stat-line__val">{String(streak).padStart(2, '0')}</span>
            <span className="stat-line__lbl">Day streak</span>
          </div>
          <div className="stat-line">
            <span className="stat-line__val">{sessionCount}</span>
            <span className="stat-line__lbl">Sessions</span>
          </div>
          {timerRemainingSec != null ? (
            <div
              className={`sidebar-timer ${timerRemainingSec < 300 ? 'sidebar-timer--warn' : ''}`}
              aria-live="polite"
            >
              {`${String(Math.floor(timerRemainingSec / 60)).padStart(2, '0')}:${String(
                timerRemainingSec % 60
              ).padStart(2, '0')}`}{' '}
              remaining
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="toggle-btn"
          style={{ width: '100%', marginTop: 8 }}
          aria-expanded={resumeExpanded}
          onClick={() => setResumeExpanded((x) => !x)}
        >
          <span>📄 Resume</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
            {resumeExpanded ? '−' : '+'}
          </span>
        </button>

        <div className="sidebar__user">
          <div className="sidebar__user-name" title={authUser?.email || ''}>
            {userDisplayName}
          </div>
          {guestMode ? (
            <button
              type="button"
              className="sidebar__sign-out"
              onClick={() => router.push('/auth?tab=signup')}
            >
              Sign up free
            </button>
          ) : (
            <button type="button" className="sidebar__sign-out" onClick={handleSignOut}>
              Sign out
            </button>
          )}
          <div className="sidebar-social">
            <a href="https://github.com/Raunack" target="_blank" rel="noopener noreferrer" title="GitHub">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/ronack-kumar-4bb92125b"
              target="_blank"
              rel="noopener noreferrer"
              title="LinkedIn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a href="mailto:raunackbhardwaj@gmail.com" title="Email">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
            </a>
          </div>
        </div>

        <div className="sidebar__footer">
          <button
            type="button"
            className="toggle-btn"
            aria-pressed={historyVisible}
            disabled={guestMode}
            onClick={openHistoryPanel}
          >
            <span>History</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
              {historyVisible ? '−' : '+'}
            </span>
          </button>
          {guestMode ? (
            <div className="history-row" style={{ color: 'var(--muted)' }}>
              Sign in to view history and reports.
            </div>
          ) : null}
          <div className={`history-panel ${historyVisible ? 'visible' : ''}`}>
            {historyLoading && <div className="history-row">Loading…</div>}
            {historySessionItems.map((h) => (
              <div key={h.key} className="history-row">
                <div
                  className="history-row__score"
                  style={{
                    color:
                      h.score >= 7
                        ? 'var(--success)'
                        : h.score >= 5
                          ? 'var(--warning)'
                          : 'var(--error)',
                  }}
                >
                  {h.score}/10
                </div>
                <div className="history-row__q">{h.q.substring(0, 72)}…</div>
              </div>
            ))}
            {pastSessionRows.length > 0 && <div className="history-divider">Past sessions</div>}
            {pastSessionRows.map((row) => {
              const sc = row.avg_score;
              return (
                <button
                  key={row.session_id}
                  type="button"
                  className="history-row history-row--click"
                  onClick={() => router.push(`/report?session_id=${encodeURIComponent(row.session_id)}`)}
                >
                  <span className="history-badge">{row.mode || '—'}</span>
                  <div
                    className="history-row__score"
                    style={{
                      color:
                        sc == null
                          ? 'var(--muted)'
                          : sc >= 7
                            ? 'var(--success)'
                            : sc >= 5
                              ? 'var(--warning)'
                              : 'var(--error)',
                    }}
                  >
                    {sc != null ? `${sc}/10` : '—'}
                  </div>
                  <div className="history-date">{formatHistoryDate(row.created_at)}</div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="main__top">
          <div className="main__top-left">
            <button
              type="button"
              className="menu-btn"
              aria-label="Open navigation"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <span className="menu-btn__glyph" aria-hidden>
                ☰
              </span>
            </button>
            <p className="top-title">{isCoding ? 'Coding workspace' : 'Interview workspace'}</p>
            {guestMode ? (
              <span className="cam-pill warn" style={{ marginLeft: 12 }}>
                Guest mode: {Math.max(0, 3 - guestCount)} free submits left
              </span>
            ) : null}
          </div>
          <div className="main__top-actions">
            <Link
              href="/rooms"
              className="btn btn-primary"
              style={{ textDecoration: 'none', fontSize: 13, padding: '8px 14px', marginRight: 4 }}
              title="Peer practice rooms with Supabase Realtime"
            >
              Peer Rooms
            </Link>
            <Link
              href="/live-interview"
              className="btn btn-primary"
              style={{ textDecoration: 'none', fontSize: 13, padding: '8px 14px', marginRight: 4 }}
              title="Voice & text live mock interview"
            >
              Live Interview
            </Link>
            <button
              type="button"
              className="theme-toggle-btn"
              aria-label="Send feedback"
              title="Send feedback or report a bug"
              onClick={() => setFeedbackModalOpen(true)}
            >
              💬
            </button>
            <button
              type="button"
              className="theme-toggle-btn"
              aria-label="Toggle theme"
              title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => {
                const next = themeMode === 'dark' ? 'light' : 'dark';
                applyTheme(next);
                setThemeMode(next);
              }}
            >
              {themeMode === 'light' ? '🌙' : '☀️'}
            </button>
            <button
              type="button"
              className="settings-btn"
              aria-label="Open settings"
              aria-expanded={settingsOpen}
              title="Settings"
              onClick={() => setSettingsOpen(true)}
            >
              <IconGear />
            </button>
          </div>
        </div>

        <div
          className={`settings-backdrop ${settingsOpen ? 'open' : ''}`}
          onClick={() => setSettingsOpen(false)}
          aria-hidden
        />
        <div
          className={`settings-panel ${settingsOpen ? 'open' : ''}`}
          role="dialog"
          aria-label="Settings"
        >
          <div className="settings-close-row">
            <button type="button" className="btn btn-ghost" onClick={() => setSettingsOpen(false)}>
              Close
            </button>
          </div>
          <h2>Settings</h2>
          <div className="settings-timer-label">Theme</div>
          <div className="timer-pill-row">
            <button
              type="button"
              className={`timer-pill ${themeMode === 'dark' ? 'active' : ''}`}
              onClick={() => {
                applyTheme('dark');
                setThemeMode('dark');
              }}
            >
              Dark
            </button>
            <button
              type="button"
              className={`timer-pill ${themeMode === 'light' ? 'active' : ''}`}
              onClick={() => {
                applyTheme('light');
                setThemeMode('light');
              }}
            >
              Light
            </button>
          </div>
          <div className="settings-timer-label">Session timer</div>
          <div className="timer-pill-row">
            {[
              { id: '15', label: '15 min' },
              { id: '30', label: '30 min' },
              { id: '45', label: '45 min' },
              { id: 'none', label: 'No limit' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                className={`timer-pill ${timerPreset === t.id ? 'active' : ''}`}
                onClick={() => {
                  setTimerPreset(t.id);
                  try {
                    localStorage.setItem('timerPref', t.id);
                    localStorage.setItem('timerPreset', t.id);
                  } catch {
                    /* ignore */
                  }
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="settings-row">
            <label>Display</label>
            <button
              type="button"
              className="a11y-chip"
              aria-pressed={captionOn}
              onClick={() => setCaptionOn((c) => !c)}
            >
              Live captions
            </button>
            <button
              type="button"
              className="a11y-chip"
              aria-pressed={readAloudOn}
              onClick={() => setReadAloudOn((r) => !r)}
            >
              Read aloud
            </button>
            <button
              type="button"
              className="a11y-chip"
              aria-pressed={highContrast}
              onClick={() => setHighContrast((h) => !h)}
            >
              High contrast
            </button>
            <button
              type="button"
              className="a11y-chip"
              aria-pressed={largeText}
              onClick={() => setLargeText((x) => !x)}
            >
              Large text
            </button>
          </div>
        </div>

        <div className="main__scroll">
          {isCoding ? (
            <div className="coding-layout coding-layout--leetcode">
              <div className="coding-lc-panels">
                <div className="coding-lc-left problem-panel">
                  <div className="problem-head">
                    <h2 className="problem-title">
                      {loadingQuestions ? (
                        <span className="q-loading">
                          <span className="spinner" /> Loading…
                        </span>
                      ) : (
                        currentProblem?.title || 'Problem'
                      )}
                    </h2>
                    {currentProblem && (
                      <span className={`diff-badge ${diffClass}`}>{currentProblem.difficulty}</span>
                    )}
                  </div>
                  {interviewerPersonaFlavor(interviewerPersona) ? (
                    <p
                      style={{
                        margin: '6px 0 10px',
                        fontSize: 13,
                        fontStyle: 'italic',
                        color: 'var(--muted)',
                        opacity: 0.95,
                      }}
                    >
                      {interviewerPersonaFlavor(interviewerPersona)}
                    </p>
                  ) : null}
                  <hr className="problem-divider" />
                  <div className="q-progress-track" aria-hidden>
                    <div className="q-progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                  {loadingQuestions ? (
                    <div className="coding-skeleton" aria-hidden>
                      <div className="coding-skeleton__title" />
                      <div className="coding-skeleton__desc" />
                      <div className="coding-skeleton__ex" />
                      <div className="coding-skeleton__ex" />
                    </div>
                  ) : null}
                  <p className="problem-desc">
                    {loadingQuestions ? (
                      <span className="q-loading">
                        <span className="spinner" /> Loading problem…
                      </span>
                    ) : (
                      currentProblem?.description
                    )}
                  </p>
                  {currentProblem?.examples && currentProblem.examples.length > 0 && (
                    <>
                      <div className="problem-section-title">Examples</div>
                      {currentProblem.examples.map((ex, i) => (
                        <div key={i} className="example-block">
                          <div className="problem-section-title" style={{ margin: '0 0 6px' }}>
                            Example {i + 1}
                          </div>
                          <div className="example-io">
                            <strong>Input:</strong> {ex.input}
                          </div>
                          <div className="example-io">
                            <strong>Output:</strong> {ex.output}
                          </div>
                          {ex.explanation ? (
                            <div className="example-io">
                              <strong>Explanation:</strong> {ex.explanation}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </>
                  )}
                  {currentProblem?.constraints && (
                    <>
                      <div className="problem-section-title">Constraints</div>
                      <ul className="problem-list">
                        {currentProblem.constraints.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {currentProblem?.visibleTests && (
                    <>
                      <div className="problem-section-title">Sample test cases</div>
                      <div className="tests-grid">
                        {currentProblem.visibleTests.map((t, i) => (
                          <div key={i} className="test-row">
                            <span>In: {t.input}</span>
                            <span>Out: {t.output}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="problem-section-title">Hidden test cases</div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px' }}>
                    + 2 hidden test cases
                  </p>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ marginTop: 8 }}
                    onClick={getHint}
                    disabled={hintLoading || controlsDisabled}
                  >
                    Get Hint 💡
                  </button>
                </div>
                <div className="coding-lc-right">
                  {loadingQuestions ? (
                    <div className="coding-loading-note">
                      <span className="spinner" /> Loading problem...
                    </div>
                  ) : null}
                  <CodeWorkspace
                    value={codeBody}
                    onChange={setCodeBody}
                    language={codeLang}
                    onLanguageChange={setCodeLang}
                    templates={currentProblem?.templates || {}}
                    readOnly={readOnly}
                    hideOutput
                    leetcodeFill
                    editorTheme={themeMode === 'light' ? 'vs' : 'vs-dark'}
                    onPasteBlocked={() => {
                      showToast('Pasting is disabled in the coding interview editor.', true);
                      logViolation('monaco_paste_blocked', 'coding_paste');
                    }}
                  />
                  <div className="coding-run-bar">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handleCodingRunClick}
                      disabled={controlsDisabled || readOnly || !currentProblem}
                    >
                      Run ▶
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleCodingSubmitAllClick}
                      disabled={controlsDisabled || !currentProblem || readOnly}
                    >
                      Submit ✓
                    </button>
                  </div>
                  <div className="coding-output-panel" hidden={!codingOutputOpen}>
                    <div className="coding-output-panel__head">Output</div>
                    {codingCaseRows.length === 0 ? (
                      <div className="coding-case-row" style={{ color: 'var(--muted)' }}>
                        Run or Submit to see test results here.
                      </div>
                    ) : null}
                    {codingCaseRows.map((row) => (
                      <div key={row.key} className="coding-case-row">
                        <span>
                          {row.pass === true ? '✅' : row.pass === false ? '❌' : '—'} {row.label}
                        </span>
                        <span style={{ color: 'var(--muted)', flex: 1 }}>{row.detail}</span>
                      </div>
                    ))}
                    {false && (feedbackLoading || feedbackData || feedbackError) && (
                      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
                        <div className="feedback-head" style={{ marginBottom: 8 }}>
                          AI feedback
                        </div>
                        {feedbackLoading && (
                          <p className="feedback-placeholder">
                            <span className="loading-dots">Analysing your solution</span>
                          </p>
                        )}
                        {feedbackError && !feedbackLoading && (
                          <p className="err-text">{feedbackError}</p>
                        )}
                        {feedbackData && !feedbackLoading && (
                          <>
                            <div className="score-display">
                              <span className="score-display__main">
                                {Number(feedbackData.score).toFixed(1)}
                              </span>
                              <span className="score-display__sub">/10</span>
                            </div>
                            <div className="metric-block">
                              <div className="metric-top">
                                <span>Accuracy</span>
                                <span>{feedbackData.accuracy}%</span>
                              </div>
                              <div className="metric-track">
                                <div
                                  className="metric-fill acc"
                                  style={{ width: `${feedbackData.accuracy}%` }}
                                />
                              </div>
                            </div>
                            <div className="metric-block">
                              <div className="metric-top">
                                <span>Clarity</span>
                                <span>{feedbackData.clarity}%</span>
                              </div>
                              <div className="metric-track">
                                <div
                                  className="metric-fill clar"
                                  style={{ width: `${feedbackData.clarity}%` }}
                                />
                              </div>
                            </div>
                            <div className="metric-block">
                              <div className="metric-top">
                                <span>Depth</span>
                                <span>{feedbackData.depth}%</span>
                              </div>
                              <div className="metric-track">
                                <div
                                  className="metric-fill depth"
                                  style={{ width: `${feedbackData.depth}%` }}
                                />
                              </div>
                            </div>
                            {feedbackData.scoreReason && (
                              <p className="score-reason-muted">{feedbackData.scoreReason}</p>
                            )}
                            <div className="feedback-inset">
                              <p style={{ marginBottom: 0 }}>{feedbackData.feedback}</p>
                            </div>
                            {feedbackData.idealAnswer && (
                              <details className="model-toggle">
                                <summary>
                                  <span aria-hidden>▸</span> Model answer
                                </summary>
                                <div className="model-body">{feedbackData.idealAnswer}</div>
                              </details>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="hint-below" hidden={!questionHint && !hintLoading}>
                {hintLoading ? 'Getting hint…' : `💡 ${questionHint}`}
              </div>

              <div className="coding-bottom-strip">
                <div className="q-block coding-workspace-actions" style={{ padding: '10px 1.5rem 0' }}>
                  <div className="q-block__head q-block__head--nav">
                    <div
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.02em',
                          padding: '4px 10px',
                          borderRadius: 999,
                          border: '1px solid var(--border)',
                          background: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          maxWidth: '100%',
                        }}
                      >
                        {interviewerPersonaBadge(interviewerPersona)}
                      </span>
                    </div>
                    <div className="q-nav-row" role="navigation" aria-label="Question navigation">
                      <button
                        type="button"
                        className="q-nav-btn"
                        disabled={loadingQuestions || questionIndex === 0 || controlsDisabled}
                        onClick={goPrev}
                      >
                        ← Previous
                      </button>
                      <div className="q-num" aria-live="polite">
                        {loadingQuestions ? '…' : `${qOrdinal} / ${qTotal}`}
                      </div>
                      <button
                        type="button"
                        className="q-nav-btn"
                        disabled={loadingQuestions || questionIndex >= totalQ - 1 || controlsDisabled}
                        onClick={goNext}
                      >
                        Next →
                      </button>
                    </div>
                    <div className="q-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Shuffle order"
                        aria-label="Shuffle order"
                        onClick={shuffleOrder}
                        disabled={controlsDisabled}
                      >
                        <IconShuffle />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        title={ttsSpeaking ? 'Stop' : 'Read aloud'}
                        aria-label={ttsSpeaking ? 'Stop speech' : 'Read aloud'}
                        onClick={toggleReadAloudManual}
                      >
                        {ttsSpeaking ? <IconStop /> : <IconSpeaker />}
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        title="Hint"
                        aria-label="Hint"
                        onClick={getHint}
                        disabled={controlsDisabled || hintLoading || readOnly}
                      >
                        <IconHint />
                      </button>
                    </div>
                  </div>

                  {submittedCount >= totalQ && totalQ > 0 ? (
                    <div className="session-report-prompt" style={{ padding: '0 1.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setSessionModalOpen(true)}
                      >
                        View session report
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="interview-layout" style={{ ['--camera-col-w']: `${cameraHeight}px` }}>
              {!selfPaced && (
                <div className="interview-layout__left">
                  <div className="tab-strip" role="tablist">
                    {[
                      { id: 'video', label: 'Video' },
                      { id: 'audio', label: 'Audio' },
                      { id: 'text', label: 'Text' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        role="tab"
                        className={`tab ${activeTab === t.id ? 'active' : ''}`}
                        aria-selected={activeTab === t.id}
                        onClick={() => setActiveTab(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="media-row interview-layout__media" hidden={activeTab === 'text'}>
                    <div
                      className={`video-wrap ${videoActive ? 'video-wrap--live' : ''}`}
                      style={{ display: activeTab === 'audio' ? 'none' : 'block' }}
                    >
                      {!videoActive && (
                        <div className="video-placeholder">
                          <span>Camera off</span>
                          <button type="button" className="allow-cam" onClick={startCamera}>
                            Allow access
                          </button>
                        </div>
                      )}
                      <video
                        ref={videoRef}
                        className="video-feed"
                        autoPlay
                        muted
                        playsInline
                        onEmptied={handleCameraLost}
                        style={{
                          display: videoActive ? 'block' : 'none',
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          background: '#000',
                        }}
                      />
                      <div className={`live-dot ${videoActive ? 'on' : ''}`}>● Live</div>
                      <div className={`camera-reconnect-overlay ${cameraLost ? 'open' : ''}`}>
                        <div className="camera-reconnect-msg">
                          Camera disconnected — reconnecting...
                        </div>
                      </div>
                      <div
                        className="face-look-toast"
                        hidden={
                          !faceLookToast ||
                          (typeof window !== 'undefined' &&
                            (!('FaceDetector' in window) || !window.FaceDetector))
                        }
                        role="status"
                        style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)' }}
                      >
                        ⚠️ Please look at the camera
                      </div>
                      {videoActive && (
                        <div className="video-badges">
                          <span className={`cam-pill ${recording ? 'warn' : ''}`}>
                            {recording ? '🎤 Mic on' : '🎤 Mic off'}
                          </span>
                          <span className="cam-pill ok">📷 Camera on</span>
                        </div>
                      )}
                      <button
                        type="button"
                        className="video-resize-handle video-resize-handle--right"
                        aria-label="Resize camera panel width"
                        onMouseDown={onCameraResizeStart}
                        onTouchStart={onCameraResizeStart}
                      />
                    </div>

                    <div className={`audio-tab-panel ${activeTab === 'audio' ? 'is-visible' : ''}`}>
                      <button
                        type="button"
                        className={`record-fab ${recording ? 'recording' : ''}`}
                        aria-label={recording ? 'Stop recording' : 'Record answer'}
                        aria-pressed={recording}
                        onClick={toggleRecord}
                        disabled={controlsDisabled || readOnly}
                      >
                        <IconMic />
                      </button>
                      {recording ? (
                        <div className="audio-tab-panel__viz" aria-hidden>
                          {audioLevels.map((h, i) => (
                            <div key={i} className="audio-bar" style={{ height: h }} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              <div className="interview-layout__right">
                <div className="interview-layout__right-inner">
                  <div className="q-block__head q-block__head--nav q-block__head--tools-only">
                    <div
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.02em',
                          padding: '4px 10px',
                          borderRadius: 999,
                          border: '1px solid var(--border)',
                          background: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          maxWidth: '100%',
                        }}
                      >
                        {interviewerPersonaBadge(interviewerPersona)}
                      </span>
                    </div>
                    <div className="q-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Shuffle order"
                        aria-label="Shuffle order"
                        onClick={shuffleOrder}
                        disabled={controlsDisabled}
                      >
                        <IconShuffle />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        title={ttsSpeaking ? 'Stop' : 'Read aloud'}
                        aria-label={ttsSpeaking ? 'Stop speech' : 'Read aloud'}
                        onClick={toggleReadAloudManual}
                      >
                        {ttsSpeaking ? <IconStop /> : <IconSpeaker />}
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        title="Hint"
                        aria-label="Hint"
                        onClick={getHint}
                        disabled={controlsDisabled || hintLoading || readOnly}
                      >
                        <IconHint />
                      </button>
                    </div>
                  </div>

                  <div className="question-counter-plain" aria-live="polite">
                    {loadingQuestions ? '…' : `${qOrdinal} / ${qTotal}`}
                    {!isCoding && followupPhase !== 'idle' ? (
                      <span
                        style={{
                          marginLeft: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'rgba(99, 102, 241, 0.25)',
                          color: 'var(--text-primary, #e2e8f0)',
                          verticalAlign: 'middle',
                        }}
                      >
                        Follow-up
                      </span>
                    ) : null}
                  </div>
                  <div className="question-nav-progress" aria-hidden>
                    <div
                      className="question-nav-progress__fill"
                      style={{ width: `${navProgressPct}%` }}
                    />
                  </div>

                  <div key={questionIndex} className="question-body" role="region" aria-live="polite">
                    {loadingQuestions ? (
                      <span className="q-loading">
                        <span className="spinner" />
                        Generating questions…
                      </span>
                    ) : (
                      currentTextQuestion || '—'
                    )}
                  </div>

                  {!isCoding && interviewerPersonaFlavor(interviewerPersona) ? (
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: 13,
                        fontStyle: 'italic',
                        color: 'var(--muted)',
                        opacity: 0.95,
                      }}
                    >
                      {interviewerPersonaFlavor(interviewerPersona)}
                    </p>
                  ) : null}

                  {!isCoding && followupPhase === 'loading' ? (
                    <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--muted, #94a3b8)' }}>
                      Generating follow-up…
                    </p>
                  ) : null}

                  {!isCoding && followupPhase === 'awaiting' && followupQuestionText ? (
                    <div
                      style={{
                        marginTop: 14,
                        padding: '14px 16px',
                        borderRadius: 10,
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(129, 140, 248, 0.45)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: 'var(--muted, #94a3b8)',
                          marginBottom: 8,
                        }}
                      >
                        Follow-up:
                      </div>
                      <div style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--text-primary, #f1f5f9)' }}>
                        {followupQuestionText}
                      </div>
                    </div>
                  ) : null}

                  <div className="hint-below" hidden={!questionHint && !hintLoading}>
                    {hintLoading ? 'Getting hint…' : `💡 ${questionHint}`}
                  </div>

                  <p className="answer-saved-flash" hidden={!answerSavedFlash}>
                    ✓ Answer saved
                  </p>

                  {false && (
                    <div
                      className="feedback-inline-panel"
                      hidden={!(feedbackLoading || feedbackData || feedbackError)}
                    >
                      {feedbackLoading && (
                        <p className="feedback-placeholder">
                          <span className="loading-dots">Analysing your answer</span>
                        </p>
                      )}
                      {feedbackError && !feedbackLoading && (
                        <p className="err-text">
                          {feedbackError}
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ marginTop: 12 }}
                            onClick={() => fetchAiFeedback()}
                          >
                            Retry
                          </button>
                        </p>
                      )}
                      {feedbackData && !feedbackLoading && (
                        <>
                          <div className="feedback-head" style={{ marginBottom: 10 }}>
                            Feedback
                          </div>
                          <div className="score-display">
                            <span className="score-display__main">
                              {Number(feedbackData.score).toFixed(1)}
                            </span>
                            <span className="score-display__sub">/10</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="answer-wrap answer-wrap--stretch">
                    <textarea
                      className="answer-area"
                      placeholder="Type your answer or use the mic…"
                      aria-label="Your answer"
                      rows={6}
                      readOnly={readOnly}
                      value={readOnly ? currentSlot?.text || '' : answer + speechInterim}
                      onChange={(e) => {
                        setSpeechInterim('');
                        setAnswer(e.target.value);
                      }}
                      onPaste={(e) => {
                        const text = e.clipboardData?.getData('text') || '';
                        if (text.length > 100) {
                          e.preventDefault();
                          showToast(
                            'Large pastes are disabled in interview mode. Type your answer.',
                            true
                          );
                          logViolation(`textarea_paste_${text.length}_chars`, 'large_paste_blocked');
                        }
                      }}
                      disabled={controlsDisabled || readOnly}
                    />
                    <span className="char-count">
                      {readOnly ? (currentSlot?.text || '').length : charCount} / 2000
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {!isCoding && (
          <div
            className="interview-action-bar controls-row controls-row--answer controls-row--interview-nav"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <div className="interview-action-bar__left">
              <button
                type="button"
                className="btn btn-ghost controls-row__prev"
                disabled={loadingQuestions || questionIndex === 0 || controlsDisabled || (!isCoding && followupPhase !== 'idle')}
                onClick={goPrev}
              >
                ← Previous
              </button>
              <button
                type="button"
                className="btn btn-ghost controls-row__clear"
                onClick={() => {
                  setAnswer('');
                  setSpeechInterim('');
                  if (captionOn) setCaptionText('');
                }}
                disabled={controlsDisabled || readOnly}
              >
                Clear
              </button>
              {!selfPaced && (
                <button
                  type="button"
                  className={`record-fab controls-row__mic ${recording ? 'recording' : ''}`}
                  aria-label={recording ? 'Stop recording' : 'Record answer'}
                  aria-pressed={recording}
                  onClick={toggleRecord}
                  disabled={controlsDisabled || readOnly}
                >
                  <IconMic />
                </button>
              )}
            </div>
            <span style={{ flex: 1 }} aria-hidden />
            <div className="interview-action-bar__right" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {!isCoding && followupPhase !== 'idle' ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void handleSkipFollowup()}
                  disabled={controlsDisabled || readOnly || guestSubmitLocked}
                >
                  Skip follow-up
                </button>
              ) : null}
              {!currentQuestionSubmitted && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void handleSubmit()}
                  disabled={controlsDisabled || readOnly || guestSubmitLocked || (!isCoding && followupPhase === 'loading')}
                >
                  {!isCoding && followupPhase === 'awaiting' ? 'Submit follow-up' : 'Submit'}
                </button>
              )}
              {currentQuestionSubmitted && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={goNext}
                  disabled={questionIndex >= totalQ - 1 || controlsDisabled}
                >
                  {feedbackLoading ? 'Getting feedback...' : 'Next →'}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="caption-dock" hidden={!captionOn || !captionText}>
          {captionText}
        </div>
      </div>

      {feedbackModalOpen && (
        <>
          <div className="feedback-fab-backdrop" onClick={() => setFeedbackModalOpen(false)} aria-hidden />
          <div className="feedback-fab-modal" role="dialog">
            <h2>Send Feedback</h2>
            <div className="feedback-type-pills">
              {['Bug Report', 'Feature Request', 'General Feedback'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`feedback-pill ${feedbackType === t ? 'active' : ''}`}
                  onClick={() => setFeedbackType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <label className="feedback-fab-label">
              Description <span className="req">*</span>
              <textarea
                className="feedback-fab-textarea"
                rows={4}
                placeholder="Describe the issue or suggestion..."
                value={feedbackDesc}
                onChange={(e) => setFeedbackDesc(e.target.value)}
              />
            </label>
            <label className="feedback-fab-label">
              Email (optional)
              <input
                className="feedback-fab-input"
                type="email"
                placeholder="Your email (optional, for follow-up)"
                value={feedbackEmail}
                onChange={(e) => setFeedbackEmail(e.target.value)}
              />
            </label>
            <div className="feedback-fab-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setFeedbackModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!feedbackDesc.trim() || feedbackSubmitting}
                onClick={async () => {
                  setFeedbackSubmitting(true);
                  try {
                    await fetch('/api/feedback-submit', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: feedbackType,
                        description: feedbackDesc,
                        email: feedbackEmail,
                        user_id: userId,
                      }),
                    });
                    showToast('Thanks! We\'ll look into it.');
                    setFeedbackModalOpen(false);
                    setFeedbackDesc('');
                    setFeedbackEmail('');
                  } catch {
                    showToast('Could not send feedback', true);
                  } finally {
                    setFeedbackSubmitting(false);
                  }
                }}
              >
                {feedbackSubmitting ? 'Sending…' : 'Submit'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Setup Modal */}
      <div className={`session-overlay ${setupModalOpen ? 'open' : ''}`} style={{ zIndex: 100 }}>
        <div className="session-card" role="dialog" aria-modal="true" aria-label="Setup Interview">
          <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Configure Your Interview</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--muted)' }}>
              Interview Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setModeState(e.target.value)}
              className="role-select"
              style={{ marginBottom: 0 }}
            >
              <option value="behavioral">Behavioral</option>
              <option value="technical">Technical</option>
              <option value="coding">Coding (Data Structures & Algorithms)</option>
              <option value="case">Case Study</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--muted)' }}>
              Target Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="role-select"
              style={{ marginBottom: 0 }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 10, fontSize: 13, color: 'var(--muted)' }}>
              Interviewer Style
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))',
                gap: 10,
              }}
            >
              {INTERVIEWER_PERSONA_OPTIONS.map((p) => {
                const active = interviewerPersona === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setInterviewerPersona(p.id)}
                    style={{
                      textAlign: 'left',
                      padding: '12px 12px',
                      borderRadius: 10,
                      border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: active ? 'var(--accent-muted)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 650, marginBottom: 4, lineHeight: 1.25 }}>{p.badge}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.35 }}>{p.subtitle}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--muted)' }}>
              Session Timer
            </label>
            <select
              value={timerPreset}
              onChange={(e) => setTimerPreset(e.target.value)}
              className="role-select"
              style={{ marginBottom: 0 }}
              disabled={selfPaced}
            >
              <option value="none">No limit</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
            </select>
          </div>

          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              id="selfPacedToggle"
              checked={selfPaced}
              onChange={(e) => {
                setSelfPaced(e.target.checked);
                if (e.target.checked) setTimerPreset('none');
              }}
              style={{ width: 16, height: 16 }}
            />
            <label htmlFor="selfPacedToggle" style={{ fontSize: 14, color: 'var(--text)' }}>
              Self-Paced Mode (No camera/audio recording, no time limits)
            </label>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
            onClick={() => {
              setSetupModalOpen(false);
            }}
          >
            Start Interview
          </button>
        </div>
      </div>

      <div className={`resume-sidebar ${resumeExpanded ? 'resume-sidebar--open' : ''}`}>
        <div className="resume-sidebar__body">
          <input
            ref={resumeFileInputRef}
            id="resume-file-input"
            type="file"
            accept=".txt,.pdf,application/pdf"
            style={{ display: 'none' }}
            onChange={handleResumeUpload}
          />
          <button
            type="button"
            className="resume-sidebar__upload-btn"
            onClick={() => resumeFileInputRef.current?.click()}
          >
            📄 Upload PDF or TXT file
          </button>
          <p className="resume-sidebar__or">or</p>
          <textarea
            className="resume-sidebar__textarea"
            placeholder="Paste your resume here..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            onBlur={handleResumeTextBlur}
            rows={5}
          />
          {resumeFileName ? (
            <button type="button" className="resume-sidebar__clear" onClick={clearResume}>
              Clear resume
            </button>
          ) : null}
          {resumeConfirm ? (
            <p className="resume-sidebar__confirm" role="status">
              {resumeConfirm}
            </p>
          ) : null}
        </div>
      </div>

      <div className={`time-up-overlay ${timeUpModalOpen ? 'open' : ''}`}>
        <div className="time-up-card">
          <h2 style={{ margin: '0 0 12px', fontSize: 22 }}>Time&apos;s up!</h2>
          <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: 14 }}>
            Your session timer reached zero.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const sid = activeSessionIdRef.current || lastSessionIdRef.current;
                if (sid) router.push(`/report?session_id=${encodeURIComponent(sid)}`);
                else showToast('Complete a scored answer to open a saved report.', true);
                setTimeUpModalOpen(false);
              }}
            >
              View report
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setTimeUpModalOpen(false);
                setSessionTimerEndAt(null);
              }}
            >
              Continue anyway
            </button>
          </div>
        </div>
      </div>

      <div className={`session-overlay ${sessionModalOpen ? 'open' : ''}`}>
        <div className="session-card" role="dialog" aria-modal="true" aria-label="Session report">
          <div className="session-card__head">
            <div>
              <h1 className="session-title">Session Complete</h1>
              <p className="session-sub">
                {mode.charAt(0).toUpperCase() + mode.slice(1)} · {selectedRole}
              </p>
              <p className="session-sub" style={{ marginTop: 6 }}>
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                · {submittedCount} answered
              </p>
            </div>
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setSessionModalOpen(false)}>
              ✕
            </button>
          </div>
          <div className="breakdown-label" style={{ marginTop: 0, marginBottom: 8 }}>
            AI hiring decision
          </div>
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              minHeight: 72,
            }}
          >
            {hiringDecisionLoading ? (
              <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>Analyzing your session…</p>
            ) : null}
            {hiringDecisionError ? (
              <p className="err-text" style={{ margin: 0 }}>
                {hiringDecisionError}
              </p>
            ) : null}
            {hiringDecision && !hiringDecisionLoading ? (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--muted)',
                    }}
                  >
                    Verdict
                  </span>
                  <span
                    style={(() => {
                      const v = hiringDecision.verdict;
                      const base = {
                        fontSize: 18,
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
                <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                  {hiringDecision.summary}
                </p>
                <div style={{ fontSize: 13 }}>
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
            {!hiringDecisionLoading && !hiringDecisionError && !hiringDecision ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Preparing hiring analysis…</p>
            ) : null}
          </div>
          <div className="report-nums">
            <div className="report-cell" style={{ flex: '1 1 100%', marginBottom: 8 }}>
              <div
                className="report-cell__val"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 36, letterSpacing: '-0.03em' }}
              >
                {sessionAvg}
              </div>
              <div className="report-cell__lbl">Overall avg /10</div>
            </div>
            <div className="report-cell">
              <div className="report-cell__val">{sessionBest}/10</div>
              <div className="report-cell__lbl">Best</div>
            </div>
            <div className="report-cell">
              <div className="report-cell__val">{streak}</div>
              <div className="report-cell__lbl">Day streak</div>
            </div>
          </div>
          {sessionGrade !== '—' ? <div className="grade-badge">{sessionGrade}</div> : null}
          <div className="breakdown-label">Question breakdown</div>
          {sessionHistory.map((item, i) => (
            <div key={i} className="rb-row">
              <div className="rb-row-bar">
                <span className="rb-q">{(item.q || '').substring(0, 48)}…</span>
                <div className="rb-mini-track" aria-hidden>
                  <div
                    className="rb-mini-fill"
                    style={{
                      width: `${item.score * 10}%`,
                      backgroundColor:
                        item.score >= 8 ? 'var(--success)' : item.score >= 5 ? 'var(--warning)' : 'var(--error)',
                    }}
                  />
                </div>
                <span
                  className="rb-score"
                  style={{
                    color:
                      item.score >= 7
                        ? 'var(--success)'
                        : item.score >= 5
                          ? 'var(--warning)'
                          : 'var(--error)',
                  }}
                >
                  {item.score}/10
                </span>
              </div>
            </div>
          ))}
          {weakOnes.length > 0 && (
            <div className="weak-box">
              <strong>Weak areas: </strong>
              {weakOnes.map((x) => (x.q || '').substring(0, 36) + '…').join(' · ')}
            </div>
          )}
          {improvementTips.length > 0 ? (
            <div className="weak-box" style={{ marginTop: 10 }}>
              <strong>Focus on these areas before your next session</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: '1.1rem', color: 'var(--muted)', fontSize: 13 }}>
                {improvementTips.map((tip, idx) => (
                  <li key={idx} style={{ marginBottom: 6 }}>
                    {(tip || '').substring(0, 240)}
                    {(tip || '').length > 240 ? '…' : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                const sid = activeSessionIdRef.current || lastSessionIdRef.current;
                if (sid) router.push(`/report?session_id=${encodeURIComponent(sid)}`);
                else showToast('Report will be available after first saved answer.', true);
                setSessionModalOpen(false);
              }}
            >
              View Full Report
            </button>
            <button type="button" className="btn btn-primary" onClick={closeReport}>
              Practice Again
            </button>
          </div>
        </div>
      </div>

      <div className={`time-up-overlay ${guestLimitModalOpen ? 'open' : ''}`}>
        <div className="time-up-card">
          <h2 style={{ margin: '0 0 12px', fontSize: 22 }}>Guest limit reached</h2>
          <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: 14 }}>
            You have used 3 free submissions. Sign up to continue with unlimited sessions and reports.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => router.push('/auth?tab=signup')}
            >
              Sign up
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setGuestLimitModalOpen(false)}
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>

      {mobilePanel ? (
        <div
          className="mobile-sheet-backdrop"
          onClick={() => setMobilePanel(null)}
          aria-hidden
        />
      ) : null}

      {mobilePanel === 'mode' && (
        <div className="mobile-sheet" role="dialog" aria-label="Interview mode">
          <div className="mobile-sheet__head">
            <span>Mode</span>
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setMobilePanel(null)}>
              ✕
            </button>
          </div>
          <div className="mode-list mode-list--sheet">
            {[
              { id: 'technical', label: 'Technical' },
              { id: 'hr', label: 'HR / Behavioral' },
              { id: 'case', label: 'Case Study' },
              { id: 'stress', label: 'Stress Round' },
              { id: 'coding', label: 'Coding Round' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                className={`mode-item ${mode === m.id ? 'active' : ''}`}
                onClick={() => {
                  setMode(m.id);
                  setMobilePanel(null);
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
          {mode === 'technical' && (
            <div className="mobile-sheet__block">
              <div className="sidebar__section-label">Company pack</div>
              <div className="pack-row">
                {['general', 'tcs', 'infosys', 'wipro', 'faang'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`pack-chip ${activePack === p ? 'active' : ''}`}
                    onClick={() => {
                      setActivePack(p);
                      setMobilePanel(null);
                    }}
                  >
                    {p === 'general'
                      ? 'General'
                      : p === 'faang'
                        ? 'FAANG'
                        : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mobilePanel === 'role' && (
        <div className="mobile-sheet" role="dialog" aria-label="Role">
          <div className="mobile-sheet__head">
            <span>Role</span>
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setMobilePanel(null)}>
              ✕
            </button>
          </div>
          <select
            className="role-select"
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setMobilePanel(null);
            }}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      )}

      {mobilePanel === 'stats' && (
        <div className="mobile-sheet" role="dialog" aria-label="Session stats">
          <div className="mobile-sheet__head">
            <span>Stats</span>
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setMobilePanel(null)}>
              ✕
            </button>
          </div>
          <div className="stats-stack">
            <div className="stat-line">
              <span className="stat-line__val">{String(submittedCount).padStart(2, '0')}</span>
              <span className="stat-line__lbl">Answered</span>
            </div>
            <div className="stat-line">
              <span className="stat-line__val">{avgScore}</span>
              <span className="stat-line__lbl">Avg score</span>
            </div>
            <div className="stat-line">
              <span className="stat-line__val">{bestScore !== null ? bestScore.toFixed(1) : '—'}</span>
              <span className="stat-line__lbl">Best</span>
            </div>
            <div className="stat-line">
              <span className="stat-line__val">{String(streak).padStart(2, '0')}</span>
              <span className="stat-line__lbl">Day streak</span>
            </div>
            <div className="stat-line">
              <span className="stat-line__val">{sessionCount}</span>
              <span className="stat-line__lbl">Sessions</span>
            </div>
          </div>
        </div>
      )}

      {mobilePanel === 'history' && (
        <div className="mobile-sheet mobile-sheet--tall" role="dialog" aria-label="History">
          <div className="mobile-sheet__head">
            <span>History</span>
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setMobilePanel(null)}>
              ✕
            </button>
          </div>
          {historyLoading && <div className="history-row">Loading…</div>}
          {historySessionItems.map((h) => (
            <div key={h.key} className="history-row">
              <div
                className="history-row__score"
                style={{
                  color:
                    h.score >= 7
                      ? 'var(--success)'
                      : h.score >= 5
                        ? 'var(--warning)'
                        : 'var(--error)',
                }}
              >
                {h.score}/10
              </div>
              <div className="history-row__q">{h.q.substring(0, 72)}…</div>
            </div>
          ))}
          {pastSessionRows.length > 0 && <div className="history-divider">Past sessions</div>}
          {pastSessionRows.map((row) => {
            const sc = row.avg_score;
            return (
              <button
                key={row.session_id}
                type="button"
                className="history-row history-row--click"
                onClick={() => {
                  router.push(`/report?session_id=${encodeURIComponent(row.session_id)}`);
                  setMobilePanel(null);
                }}
              >
                <span className="history-badge">{row.mode || '—'}</span>
                <div
                  className="history-row__score"
                  style={{
                    color:
                      sc == null
                        ? 'var(--muted)'
                        : sc >= 7
                          ? 'var(--success)'
                          : sc >= 5
                            ? 'var(--warning)'
                            : 'var(--error)',
                  }}
                >
                  {sc != null ? `${sc}/10` : '—'}
                </div>
                <div className="history-date">{formatHistoryDate(row.created_at)}</div>
              </button>
            );
          })}
        </div>
      )}

      <nav className="mobile-bottom-nav" aria-label="Quick navigation">
        <button
          type="button"
          className={`mobile-bottom-nav__btn ${mobilePanel === 'mode' ? 'active' : ''}`}
          aria-label="Mode"
          onClick={() => setMobilePanel((p) => (p === 'mode' ? null : 'mode'))}
        >
          🎯
          <span className="mobile-bottom-nav__label">Mode</span>
        </button>
        <button
          type="button"
          className={`mobile-bottom-nav__btn ${mobilePanel === 'role' ? 'active' : ''}`}
          aria-label="Role"
          onClick={() => setMobilePanel((p) => (p === 'role' ? null : 'role'))}
        >
          👤
          <span className="mobile-bottom-nav__label">Role</span>
        </button>
        <button
          type="button"
          className={`mobile-bottom-nav__btn ${mobilePanel === 'stats' ? 'active' : ''}`}
          aria-label="Stats"
          onClick={() => setMobilePanel((p) => (p === 'stats' ? null : 'stats'))}
        >
          📈
          <span className="mobile-bottom-nav__label">Stats</span>
        </button>
        <button
          type="button"
          className={`mobile-bottom-nav__btn ${mobilePanel === 'history' ? 'active' : ''}`}
          aria-label="History"
          onClick={() => {
            setMobilePanel((p) => (p === 'history' ? null : 'history'));
            fetchHistory();
          }}
        >
          📜
          <span className="mobile-bottom-nav__label">History</span>
        </button>
        <button
          type="button"
          className="mobile-bottom-nav__btn"
          aria-label="Settings"
          onClick={() => {
            setSettingsOpen(true);
            setMobilePanel(null);
          }}
        >
          ⚙
          <span className="mobile-bottom-nav__label">Settings</span>
        </button>
      </nav>

      <div
        className={`toast ${toast.show ? 'show' : ''}`}
        role="status"
        style={toast.err ? { borderColor: 'var(--error)', color: 'var(--error)' } : undefined}
      >
        {toast.msg}
      </div>
    </div>
  );
}

