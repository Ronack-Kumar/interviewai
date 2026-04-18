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
  if (score >= 8) return '#22c55e';
  if (score >= 5) return '#f59e0b';
  return '#ef4444';
}

function computeRadarRows(answers) {
  const n = answers.length || 1;
  const avg = (key) =>
    answers.reduce((s, a) => s + (typeof a[key] === 'number' ? a[key] : 0), 0) / n;
  const acc = avg('accuracy');
  const clar = avg('clarity');
  const dep = avg('depth');
  const scores = answers.map((a) => (typeof a.score === 'number' ? a.score : 0)).filter((x) => x > 0);
  const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const variance =
    scores.length > 1
      ? scores.reduce((s, x) => s + (x - mean) * (x - mean), 0) / scores.length
      : 0;
  const consistency = Math.max(0, Math.min(100, 100 - variance * 25));
  let commSum = 0;
  for (const a of answers) {
    const words = (a.answer || '').split(/\s+/).filter(Boolean).length;
    const structure = (a.answer || '').split(/\n\n/).length;
    const raw = Math.min(100, words / 8 + structure * 12);
    commSum += raw;
  }
  const communication = commSum / n;
  return [
    { metric: 'Accuracy', value: Math.round(acc) },
    { metric: 'Clarity', value: Math.round(clar) },
    { metric: 'Depth', value: Math.round(dep) },
    { metric: 'Communication', value: Math.round(communication) },
    { metric: 'Consistency', value: Math.round(consistency) },
  ];
}

export default function ReportClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [pdfBusy, setPdfBusy] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
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
        const res = await fetch(
          `/api/session-report?session_id=${encodeURIComponent(sessionId)}&user_id=${encodeURIComponent(user.id)}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        if (cancelled) return;
        setSession(data.session);
        setAnswers(Array.isArray(data.answers) ? data.answers : []);
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

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
      const y = 10;
      if (imgH > pageH - 20) {
        const scale = (pageH - 20) / imgH;
        const w2 = imgW * scale;
        const h2 = imgH * scale;
        pdf.addImage(img, 'PNG', (pageW - w2) / 2, 10, w2, h2);
      } else {
        pdf.addImage(img, 'PNG', 10, y, imgW, imgH);
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

  const avgScore =
    answers.length > 0
      ? answers.reduce((s, a) => s + (typeof a.score === 'number' ? a.score : 0), 0) / answers.length
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

  const totalSecs = answers.reduce(
    (s, a) => s + (typeof a.time_taken_seconds === 'number' ? a.time_taken_seconds : 0),
    0
  );
  const radarData = computeRadarRows(answers);
  const barData = answers.map((a, i) => ({
    name: `Q${i + 1}`,
    score: typeof a.score === 'number' ? a.score : 0,
  }));
  const weak = answers.filter((a) => (a.score || 0) < 6);

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

  return (
    <div className="report-page">
      <div className="report-page-inner" ref={reportRef}>
        <div className="report-header-bar">
          <div>
            <div style={{ fontWeight: 600, fontSize: 18 }}>MockPrep</div>
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>Session Report</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
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

        <p style={{ color: 'var(--muted)', marginBottom: 24, fontSize: 14 }}>
          {modeLabel} | {created} | {answers.length} answers | {Math.floor(totalSecs / 60)}m {totalSecs % 60}s total
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
              Questions: {answers.length}
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
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#4f8ef7"
                  fill="#4f8ef7"
                  fillOpacity={0.35}
                />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }} />
              </RadarChart>
            </ResponsiveContainer>
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
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Per question</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {answers.map((a, i) => (
              <QuestionBlock key={a.id || i} index={i} row={a} />
            ))}
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
                <li key={a.id || i} style={{ marginBottom: 8 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {(a.question || '').substring(0, 80)}
                    {(a.question || '').length > 80 ? '…' : ''}
                  </strong>{' '}
                  ({a.score}/10)
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
}

function QuestionBlock({ index, row }) {
  const [openFb, setOpenFb] = useState(false);
  const [openIdeal, setOpenIdeal] = useState(false);
  const sc = typeof row.score === 'number' ? row.score : 0;
  const q = row.question || `Question ${index + 1}`;
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
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{row.feedback}</p>
      ) : null}
      {(row.ideal_answer || '').length > 0 ? (
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
              {row.ideal_answer}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
