'use client';

/**
 * lib/hooks/useAIFeedback.js
 *
 * Custom hook encapsulating AI feedback evaluation, hint generation,
 * follow-up generation, and session hiring decision logic.
 */

import { useCallback, useState } from 'react';

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

export function useAIFeedback() {
  const [answerSlots, setAnswerSlots] = useState(() =>
    Array.from({ length: 8 }, emptyAnswerSlot)
  );

  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const [feedbackData, setFeedbackData] = useState(null);

  const [questionHint, setQuestionHint] = useState('');
  const [hintLoading, setHintLoading] = useState(false);

  const [followupPhase, setFollowupPhase] = useState('idle');
  const [followupQuestionText, setFollowupQuestionText] = useState('');

  const [hiringDecision, setHiringDecision] = useState(null);
  const [hiringDecisionLoading, setHiringDecisionLoading] = useState(false);
  const [hiringDecisionError, setHiringDecisionError] = useState('');

  const resetFeedbackState = useCallback(() => {
    setFeedbackData(null);
    setFeedbackError(null);
    setFeedbackLoading(false);
    setQuestionHint('');
    setFollowupPhase('idle');
    setFollowupQuestionText('');
  }, []);

  const resetAllSlots = useCallback(() => {
    setAnswerSlots(Array.from({ length: 8 }, emptyAnswerSlot));
    resetFeedbackState();
  }, [resetFeedbackState]);

  const submitFeedback = useCallback(
    async ({
      question,
      answer,
      mode,
      role,
      persona,
      userId,
      questionIndex,
      onSuccess,
      onRateLimited,
    }) => {
      setFeedbackLoading(true);
      setFeedbackError(null);
      setFeedbackData(null);

      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            answer,
            mode,
            role,
            persona,
            user_id: userId || undefined,
          }),
        });

        const parsed = await res.json();

        if (res.status === 429 && parsed.error === 'rate_limited') {
          if (onRateLimited) onRateLimited(parsed);
          throw new Error(parsed.message || 'Daily limit reached');
        }

        if (!res.ok || parsed.error) {
          throw new Error(parsed.error || 'Feedback evaluation failed');
        }

        setFeedbackData(parsed);

        setAnswerSlots((prev) => {
          const updated = [...prev];
          updated[questionIndex] = {
            ...updated[questionIndex],
            feedback: parsed,
            err: null,
            submitted: true,
          };
          return updated;
        });

        if (onSuccess) onSuccess(parsed);
        return parsed;
      } catch (err) {
        const msg = err.message || 'Failed to get feedback';
        setFeedbackError(msg);
        setAnswerSlots((prev) => {
          const updated = [...prev];
          updated[questionIndex] = {
            ...updated[questionIndex],
            err: msg,
          };
          return updated;
        });
        throw err;
      } finally {
        setFeedbackLoading(false);
      }
    },
    []
  );

  const fetchHint = useCallback(
    async ({ question, mode, role, userId, questionIndex, onRateLimited }) => {
      if (!question) return;
      setHintLoading(true);
      setQuestionHint('');

      try {
        const res = await fetch('/api/hint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            mode,
            role,
            user_id: userId || undefined,
          }),
        });

        const data = await res.json();

        if (res.status === 429 && data.error === 'rate_limited') {
          if (onRateLimited) onRateLimited(data);
          throw new Error(data.message || 'Daily limit reached');
        }

        if (!res.ok || data.error) throw new Error(data.error || 'Hint failed');

        const hintText = data.hint || '';
        setQuestionHint(hintText);

        setAnswerSlots((prev) => {
          const updated = [...prev];
          updated[questionIndex] = {
            ...updated[questionIndex],
            hint: hintText,
          };
          return updated;
        });

        return hintText;
      } catch (err) {
        throw err;
      } finally {
        setHintLoading(false);
      }
    },
    []
  );

  const fetchHiringDecision = useCallback(
    async ({ answers, mode, role, userId }) => {
      if (!answers || answers.length === 0) return;
      setHiringDecisionLoading(true);
      setHiringDecisionError('');
      setHiringDecision(null);

      try {
        const res = await fetch('/api/hiring-decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers,
            mode,
            role,
            user_id: userId || undefined,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Hiring decision failed');

        setHiringDecision(data);
        return data;
      } catch (err) {
        const msg = err.message || 'Failed to load hiring decision';
        setHiringDecisionError(msg);
        throw err;
      } finally {
        setHiringDecisionLoading(false);
      }
    },
    []
  );

  return {
    answerSlots,
    setAnswerSlots,
    feedbackLoading,
    feedbackError,
    feedbackData,
    questionHint,
    hintLoading,
    followupPhase,
    setFollowupPhase,
    followupQuestionText,
    setFollowupQuestionText,
    hiringDecision,
    hiringDecisionLoading,
    hiringDecisionError,
    resetFeedbackState,
    resetAllSlots,
    submitFeedback,
    fetchHint,
    fetchHiringDecision,
  };
}
