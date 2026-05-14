'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { createClient } from '../../lib/supabase';

function barColor(score) {
  if (score >= 8) return 'var(--success)';
  if (score >= 5) return 'var(--warning)';
  return 'var(--error)';
}

function computeRadarRows(answers) {
  const n = answers.length || 1;
  const avg = (key) =>
    answers.reduce((s, a) => s + (typeof a?.[key] === 'number' ? a[key] : 0), 0) / n;
  const acc = avg('accuracy');
  const clar = avg('clarity');
  const dep = avg('depth');
  const scores = answers.map((a) => (typeof a?.score === 'number' ? a.score : 0)).filter((x) => x > 0);
  const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const variance =
    scores.length > 1
      ? scores.reduce((s, x) => s + (x - mean) * (x - mean), 0) / scores.length
      : 0;
  const consistency = Math.max(0, Math.min(10, 10 - variance * 2.5));
  let commSum = 0;
  for (const a of answers) {
    const words = (a?.answer || '').split(/\s+/).filter(Boolean).length;
    const structure = (a?.answer || '').split(/\n+/).filter(Boolean).length;
    const raw = Math.min(10, words / 45 + structure * 1.2);
    commSum += raw;
  }
  const communication = Math.min(10, commSum / n);
  return [
    { metric: 'Accuracy', value: Number(acc.toFixed(1)) },
    { metric: 'Clarity', value: Number(clar.toFixed(1)) },
    { metric: 'Depth', value: Number(dep.toFixed(1)) },
    { metric: 'Communication', value: Number(communication.toFixed(1)) },
    { metric: 'Consistency', value: Number(consistency.toFixed(1)) },
  ];
}

export default function ReportClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [renderError, setRenderError] = useState(null);
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackErr, setFeedbackErr] = useState('');
  const reportRef = useRef(null);

  const safeAnswers = Array.isArray(answers) ? answers : [];
  const allScoresNull =
    safeAnswers.length > 0 && safeAnswers.every((a) => a?.score === null || a?.score === undefined);

  const loadReportData = useCallback(
    async (cancelled = false) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth');
        return;
      }
      if (cancelled) return;
      if (!sessionId) {
        setErr('Missing session_id');
        setLoading(false);
        return;
      }
      try {
        setRenderError(null);
        const res = await fetch(
          `/api/session-report?session_id=${encodeURIComponent(sessionId)}&user_id=${encodeURIComponent(user.id)}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        if (cancelled) return;
        setErr('');
        setSession(data.session);
        setAnswers(Array.isArray(data.answers) ? data.answers : []);
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    },
    [router, sessionId]
  );

  useEffect(() => {
    let cancelled = false;
    loadReportData(cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadReportData]);

  const downloadPdf = useCallback(async () => {
    if (!reportRef.current) return;
    setPdfBusy(true);
    try {
      const [{ default: html2canvas }, jspdfMod] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const { jsPDF } = jspdfMod;
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgW = pageW - 20;
      const imgH = imgW * ratio;
      if (imgH > pageH - 20) {
        const scale = (pageH - 20) / imgH;
        const w2 = imgW * scale;
        const h2 = imgH * scale;
        pdf.addImage(img, 'PNG', (pageW - w2) / 2, 10, w2, h2);
      } else {
        pdf.addImage(img, 'PNG', 10, 10, imgW, imgH);
      }
      const mode = session?.mode || 'session';
      const dateStr = new Date().toISOString().slice(0, 10);
      pdf.save(`MockPrep_Report_${mode}_${dateStr}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setPdfBusy(false);
    }
  }, [session]);

  const handleGetAllFeedback = useCallback(async () => {
    if (!session || !sessionId) return;
    setFeedbackBusy(true);
    setFeedbackErr('');
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth');
        return;
      }

      for (const answerRow of safeAnswers) {
        try {
          const res = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: answerRow?.question || '',
              answer: answerRow?.answer || '',
              mode: session.mode,
            }),
          });
          const parsed = await res.json();
          if (!res.ok || parsed.error) continue;

          if (answerRow?.id) {
            const { error: updateError } = await supabase
              .from('answers')
              .update({
                score: parsed.score ?? null,
                accuracy: parsed.accuracy ?? null,
                clarity: parsed.clarity ?? null,
                depth: parsed.depth ?? null,
                feedback: parsed.feedback ?? null,
                ideal_answer: parsed.idealAnswer ?? '',
              })
              .eq('id', answerRow.id)
              .eq('user_id', user.id)
              .eq('session_id', sessionId);
            if (updateError) continue;
          }
        } catch {
          continue;
        }
      }

      await loadReportData(false);
    } catch (e) {
      setFeedbackErr(e.message || 'Failed to get AI feedback');
    } finally {
      setFeedbackBusy(false);
    }
  }, [loadReportData, router, safeAnswers, session, sessionId]);

  const avgScore =
    safeAnswers.length > 0
      ? safeAnswers.reduce((s, a) => s + (typeof a?.score === 'number' ? a.score : 0), 0) / safeAnswers.length
      : null;
  const grade =
    avgScore == null
      ? '—'
      : avgScore >= 8
        ? 'A'
        : avgScore >= 6
          ? 'B'
          : avgScore >= 4
            ? 'C'
            : 'D';

  const totalSecs = safeAnswers.reduce(
    (s, a) => s + (typeof a?.time_taken_seconds === 'number' ? a.time_taken_seconds : 0),
    0
  );
  const radarData = safeAnswers.length > 0 ? computeRadarRows(safeAnswers) : [];
  const barData =
    safeAnswers.length > 0
      ? safeAnswers.map((a, i) => ({
          name: `Q${i + 1}`,
          score: a?.score == null ? 0 : a.score,
        }))
      : [];
  const weak = safeAnswers.length > 0 ? safeAnswers.filter((a) => ((a?.score || 0) < 4)) : [];

  if (loading) {
    return (
      <div className="report-page">
        <div className="report-page-inner">
          <p>Loading report…</p>
        </div>
      </div>
    );
  }

  if (err || !session) {
    return (
      <div className="report-page">
        <div className="report-page-inner">
          <p>{err || 'Not found'}</p>
          <Link href="/">Back home</Link>
        </div>
      </div>
    );
  }

  const modeLabel = (session.mode || '').charAt(0).toUpperCase() + (session.mode || '').slice(1);
  const created = session.created_at
    ? new Date(session.created_at).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';

  let radarChartContent;
  try {
    radarChartContent = allScoresNull ? (
      <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
        <p>No scores yet — AI feedback pending</p>
      </div>
    ) : radarData.length > 0 ? (
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
          <Radar
            name="Score"
            dataKey="value"
            stroke="var(--accent)"
            fill="var(--accent)"
            fillOpacity={0.35}
          />
          <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }} />
          <YAxis domain={[0, 10]} hide />
        </RadarChart>
      </ResponsiveContainer>
    ) : (
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>No data available</p>
    );
  } catch (e) {
    const message = e.message || 'Failed to render radar chart';
    if (!renderError) setTimeout(() => setRenderError(message), 0);
    radarChartContent = <p style={{ color: 'var(--muted)', fontSize: 13 }}>No data available</p>;
  }

  let barChartContent;
  try {
    barChartContent = allScoresNull ? (
      <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
        <p>No scores yet — AI feedback pending</p>
      </div>
    ) : barData.length > 0 ? (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={barData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
          <YAxis domain={[0, 10]} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
          <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }} />
          <Bar dataKey="score" radius={[2, 2, 0, 0]}>
            {barData.map((e, i) => (
              <Cell key={i} fill={barColor(e.score)} />
            ))}
          </Bar>
          <Bar
            dataKey="score"
            fillOpacity={0}
            label={{ position: 'top', fill: 'var(--text-secondary)', fontSize: 11 }}
          />
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>No data available</p>
    );
  } catch (e) {
    const message = e.message || 'Failed to render score chart';
    if (!renderError) setTimeout(() => setRenderError(message), 0);
    barChartContent = <p style={{ color: 'var(--muted)', fontSize: 13 }}>No data available</p>;
  }

  try {
    return (
      <div className="report-page">
        <div className="report-page-inner" ref={reportRef}>
          <div className="report-header-bar">
            <div>
              <div style={{ fontWeight: 600, fontSize: 18 }}>MockPrep</div>
              <div style={{ color: 'var(--muted)', fontSize: 14 }}>Session Report</div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  const url = `${window.location.origin}/report?session_id=${encodeURIComponent(sessionId)}`;
                  navigator.clipboard.writeText(url)
                    .then(() => alert('Share link copied to clipboard!'))
                    .catch(() => alert('Could not copy link.'));
                }}
              >
                🔗 Share
              </button>
              <button type="button" className="btn btn-primary" disabled={pdfBusy} onClick={downloadPdf}>
                {pdfBusy ? (
                  <>
                    <span className="report-pdf-spinner" />
                    Generating…
                  </>
                ) : (
                  'Download PDF'
                )}
              </button>
              <Link href="/" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                Home
              </Link>
            </div>
          </div>

          {safeAnswers.length > 0 ? (
            <div style={{ marginBottom: 20 }}>
              <button type="button" className="btn btn-primary" onClick={handleGetAllFeedback} disabled={feedbackBusy}>
                {feedbackBusy ? 'Getting AI Feedback…' : 'Get AI Feedback for All Questions'}
              </button>
              {feedbackErr ? (
                <p style={{ color: 'var(--muted)', marginTop: 10, fontSize: 13 }}>{feedbackErr}</p>
              ) : null}
              {renderError ? (
                <p style={{ color: 'var(--muted)', marginTop: 10, fontSize: 13 }}>{renderError}</p>
              ) : null}
            </div>
          ) : null}

          <p style={{ color: 'var(--muted)', marginBottom: 24, fontSize: 14 }}>
            {modeLabel} | {created} | {safeAnswers.length} answers | {Math.floor(totalSecs / 60)}m {totalSecs % 60}s total
          </p>

          <section
            style={{
              padding: 20,
              border: '1px solid var(--border)',
              borderRadius: 4,
              background: 'var(--bg-card)',
              marginBottom: 20,
            }}
          >
            <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>Overview</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 42, fontWeight: 600 }}>
                  {avgScore != null ? avgScore.toFixed(1) : '—'}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>Overall /10</div>
              </div>
              <div className="grade-badge">{grade}</div>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                Questions: {safeAnswers.length}
                <br />
                Total time (tracked): {Math.floor(totalSecs / 60)}m {totalSecs % 60}s
              </div>
            </div>
          </section>

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                padding: 16,
                border: '1px solid var(--border)',
                borderRadius: 4,
                background: 'var(--bg-card)',
                minHeight: 320,
              }}
            >
              <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Performance radar</h3>
              {radarChartContent}
            </div>
            <div
              style={{
                padding: 16,
                border: '1px solid var(--border)',
                borderRadius: 4,
                background: 'var(--bg-card)',
                minHeight: 320,
              }}
            >
              <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Score timeline</h3>
              {barChartContent}
            </div>
          </section>

          <section style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Per question</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {safeAnswers.length > 0 ? (
                safeAnswers.map((a, i) => <QuestionBlock key={a?.id || i} index={i} row={a} />)
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>No data available</p>
              )}
            </div>
          </section>

          <section
            style={{
              padding: 20,
              border: '1px solid var(--border)',
              borderRadius: 4,
              background: 'var(--bg-card)',
            }}
          >
            <h2 style={{ fontSize: 16, marginBottom: 10 }}>Weak areas &amp; recommendations</h2>
            {weak.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>No scores below 6 in this session.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--muted)' }}>
                {weak.map((a, i) => (
                  <li key={a?.id || i} style={{ marginBottom: 8 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {(a?.question || '').substring(0, 80)}
                      {(a?.question || '').length > 80 ? '…' : ''}
                    </strong>{' '}
                    ({a?.score}/10)
                  </li>
                ))}
              </ul>
            )}
            <p style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
              Focus on these areas before your next session.
            </p>
          </section>
        </div>
      </div>
    );
  } catch (e) {
    const message = e.message || 'Failed to render report page';
    if (!renderError) setTimeout(() => setRenderError(message), 0);
    return (
      <div className="report-page">
        <div className="report-page-inner">
          <p>{message}</p>
          <Link href="/">Back home</Link>
        </div>
      </div>
    );
  }
}

function QuestionBlock({ index, row }) {
  const [openFb, setOpenFb] = useState(false);
  const [openIdeal, setOpenIdeal] = useState(false);
  const safeRow = row ?? {};
  const sc = typeof safeRow.score === 'number' ? safeRow.score : 0;
  const q = safeRow.question || `Question ${index + 1}`;
  return (
    <div
      style={{
        padding: 14,
        border: '1px solid var(--border)',
        borderRadius: 4,
        background: 'var(--bg-card)',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>
        {q.length > 160 ? `${q.substring(0, 160)}…` : q}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{sc}/10</span>
        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <div
            style={{
              width: `${sc * 10}%`,
              height: '100%',
              background: barColor(sc),
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ fontSize: 12, padding: '6px 10px' }}
        onClick={() => setOpenFb((x) => !x)}
      >
        {openFb ? '▼' : '▶'} Feedback
      </button>
      {openFb ? (
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>
          {safeRow.feedback || 'No data available'}
        </p>
      ) : null}
      {(safeRow.ideal_answer || '').length > 0 ? (
        <>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '6px 10px', marginLeft: 8 }}
            onClick={() => setOpenIdeal((x) => !x)}
          >
            {openIdeal ? '▼' : '▶'} Ideal answer
          </button>
          {openIdeal ? (
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>
              {safeRow.ideal_answer}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
