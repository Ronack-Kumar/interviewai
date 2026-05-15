'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createClient } from '../../../lib/supabase';

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

const EMOJIS = ['👍', '🔥', '💡', '😮'];

function displayNameFromUser(user) {
  const meta = user?.user_metadata;
  if (meta?.full_name && String(meta.full_name).trim()) return String(meta.full_name).trim();
  if (user?.email) return user.email.split('@')[0];
  return 'Player';
}

function sortedParticipants(parts) {
  return [...(parts || [])].sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at));
}

export default function RoomClient({ roomCode }) {
  const router = useRouter();
  const code = String(roomCode || '')
    .trim()
    .toUpperCase();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [observerTyping, setObserverTyping] = useState('');
  const [localAnswer, setLocalAnswer] = useState('');
  const channelRef = useRef(null);
  const chatEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  const refreshParticipants = useCallback(async (roomId) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });
    if (!error && data) setParticipants(data);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function init() {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!u) {
        router.replace(`/auth?next=/rooms/${encodeURIComponent(code)}`);
        return;
      }
      setUser(u);
      const { data: rows, error: rpcErr } = await supabase.rpc('room_by_code', { _code: code });
      if (rpcErr || !rows?.length) {
        setErr('Room not found.');
        setReady(true);
        return;
      }
      const r = rows[0];
      setRoom(r);
      await refreshParticipants(r.id);
      setReady(true);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [code, refreshParticipants, router]);

  useEffect(() => {
    if (!room?.id || !user) return;
    const supabase = createClient();
    const roomId = room.id;
    const chName = `room:${roomId}`;

    const ch = supabase
      .channel(chName, { config: { broadcast: { self: true } } })
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        if (!payload?.id) return;
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;
          return [...prev, payload].sort((a, b) => a.ts - b.ts);
        });
      })
      .on('broadcast', { event: 'answer_update' }, ({ payload }) => {
        if (payload?.text != null) setObserverTyping(String(payload.text));
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        if (!payload?.emoji) return;
        const id = payload.id || `${Date.now()}-${Math.random()}`;
        const x = typeof payload.x === 'number' ? payload.x : 20 + Math.random() * 60;
        const y = typeof payload.y === 'number' ? payload.y : 10 + Math.random() * 40;
        setReactions((prev) => [...prev, { id, emoji: payload.emoji, x, y }]);
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== id));
        }, 3500);
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.new) setRoom(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${roomId}` },
        () => {
          refreshParticipants(roomId);
        }
      );

    ch.subscribe();
    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [room?.id, user, refreshParticipants]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const isHost = user && room && user.id === room.host_id;
  const ordered = useMemo(() => sortedParticipants(participants), [participants]);
  const currentQuestion = useMemo(() => {
    const qs = room?.questions;
    if (!Array.isArray(qs) || !room) return '';
    return qs[room.current_question_index] || '';
  }, [room]);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || !channelRef.current) return;
    const msg = {
      id: `${Date.now()}-${user.id}`,
      user: displayNameFromUser(user),
      text,
      ts: Date.now(),
    };
    setChatInput('');
    await channelRef.current.send({ type: 'broadcast', event: 'chat_message', payload: msg });
  };

  const broadcastTyping = useCallback(
    (text) => {
      if (!channelRef.current || room?.session_mode !== 'observer') return;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(async () => {
        typingTimerRef.current = null;
        await channelRef.current?.send({
          type: 'broadcast',
          event: 'answer_update',
          payload: { userId: user?.id, text },
        });
      }, 120);
    },
    [room?.session_mode, user?.id]
  );

  const sendReaction = async (emoji) => {
    if (!channelRef.current) return;
    await channelRef.current.send({
      type: 'broadcast',
      event: 'reaction',
      payload: {
        id: `${Date.now()}-${emoji}`,
        emoji,
        x: 15 + Math.random() * 70,
        y: 10 + Math.random() * 35,
      },
    });
  };

  const patchRoomWaiting = async (partial) => {
    if (!room || !isHost) return;
    const supabase = createClient();
    await supabase.from('rooms').update(partial).eq('id', room.id);
  };

  const startInterview = async () => {
    if (!room || !isHost) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: room.mode,
          role: room.role,
          pack: 'general',
          resumeText: '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Questions failed');
      const questions = Array.isArray(data.questions) ? data.questions.slice(0, 8) : [];
      if (!questions.length) throw new Error('No questions returned');
      const supabase = createClient();
      const order = sortedParticipants(participants);
      const first = room.session_mode === 'observer' ? room.host_id : order[0]?.user_id || room.host_id;
      const { error } = await supabase
        .from('rooms')
        .update({
          questions,
          status: 'active',
          stage: 'question',
          current_question_index: 0,
          current_turn_user_id: first,
          round_answers: {},
        })
        .eq('id', room.id);
      if (error) throw new Error(error.message);
      setLocalAnswer('');
      setObserverTyping('');
    } catch (e) {
      setErr(e.message || 'Start failed');
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = async () => {
    if (!room || !user) return;
    const text = localAnswer.trim();
    if (!text) return;
    setBusy(true);
    setErr('');
    try {
      let scoreLast = null;
      try {
        const fr = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: typeof currentQuestion === 'string' ? currentQuestion : String(currentQuestion),
            answer: text,
            mode: room.mode,
            role: room.role,
          }),
        });
        const parsed = await fr.json();
        if (fr.ok && typeof parsed.score === 'number') scoreLast = parsed.score;
      } catch {
        /* optional feedback */
      }

      const supabase = createClient();
      if (scoreLast != null) {
        await supabase.from('room_participants').update({ score_last: scoreLast }).eq('room_id', room.id).eq('user_id', user.id);
      }

      if (room.session_mode === 'observer' && user.id === room.host_id) {
        const qs = room.questions || [];
        const nextIdx = room.current_question_index + 1;
        if (nextIdx >= qs.length) {
          await supabase
            .from('rooms')
            .update({
              status: 'finished',
              stage: 'finished',
              round_answers: {},
              current_turn_user_id: room.host_id,
            })
            .eq('id', room.id);
        } else {
          await supabase
            .from('rooms')
            .update({
              current_question_index: nextIdx,
              round_answers: {},
              current_turn_user_id: room.host_id,
            })
            .eq('id', room.id);
        }
        setLocalAnswer('');
        setObserverTyping('');
        await channelRef.current?.send({ type: 'broadcast', event: 'answer_update', payload: { text: '' } });
        setBusy(false);
        return;
      }

      const ids = sortedParticipants(participants).map((p) => p.user_id);
      const prev = room.round_answers && typeof room.round_answers === 'object' ? { ...room.round_answers } : {};
      prev[user.id] = text;
      const allDone = ids.length > 0 && ids.every((id) => prev[id]);
      let nextTurn = null;
      let stage = 'question';
      if (!allDone) {
        const curIdx = ids.indexOf(room.current_turn_user_id);
        const start = curIdx >= 0 ? curIdx : 0;
        for (let step = 1; step <= ids.length; step++) {
          const cand = ids[(start + step) % ids.length];
          if (!prev[cand]) {
            nextTurn = cand;
            break;
          }
        }
      } else {
        stage = 'review';
        nextTurn = null;
      }

      await supabase
        .from('rooms')
        .update({
          round_answers: prev,
          current_turn_user_id: nextTurn,
          stage,
        })
        .eq('id', room.id);
      setLocalAnswer('');
    } catch (e) {
      setErr(e.message || 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  const nextQuestion = async () => {
    if (!room || !isHost) return;
    const qs = room.questions || [];
    const nextIdx = room.current_question_index + 1;
    const supabase = createClient();
    if (nextIdx >= qs.length) {
      await supabase
        .from('rooms')
        .update({ status: 'finished', stage: 'finished', round_answers: {}, current_turn_user_id: null })
        .eq('id', room.id);
      return;
    }
    const order = sortedParticipants(participants).map((p) => p.user_id);
    const first = room.session_mode === 'observer' ? room.host_id : order[0] || room.host_id;
    await supabase
      .from('rooms')
      .update({
        current_question_index: nextIdx,
        stage: 'question',
        round_answers: {},
        current_turn_user_id: first,
      })
      .eq('id', room.id);
    setLocalAnswer('');
  };

  if (!ready) {
    return (
      <div style={shell}>
        <p style={{ color: 'var(--muted)' }}>Loading room…</p>
      </div>
    );
  }

  if (err && !room) {
    return (
      <div style={shell}>
        <p style={{ color: 'var(--error)' }}>{err}</p>
        <Link href="/rooms" style={{ color: 'var(--accent)' }}>
          Back to lobby
        </Link>
      </div>
    );
  }

  if (!room) return null;

  const myTurn =
    room.stage === 'question' &&
    room.current_turn_user_id === user?.id &&
    (room.session_mode === 'turn' || (room.session_mode === 'observer' && user?.id === room.host_id));

  const showObserverStream = room.session_mode === 'observer' && user?.id !== room.host_id && room.status === 'active';

  return (
    <div style={shell}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '220px 1fr 280px', gap: 16 }}>
        <aside style={card}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Participants</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {ordered.map((p) => {
              const isTurn = p.user_id === room.current_turn_user_id && room.stage === 'question' && room.status === 'active';
              return (
                <li
                  key={p.id}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    marginBottom: 8,
                    border: `1px solid ${isTurn ? 'var(--accent)' : 'var(--border)'}`,
                    background: isTurn ? 'var(--accent-muted)' : 'transparent',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.display_name}</div>
                  {p.user_id === room.host_id ? <div style={{ fontSize: 11, color: 'var(--muted)' }}>Host</div> : null}
                  {typeof p.score_last === 'number' ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Last score: {p.score_last}/10</div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </aside>

        <main style={{ ...card, position: 'relative', minHeight: 420 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <Link href="/rooms" style={{ color: 'var(--accent)', fontSize: 13 }}>
              ← Lobby
            </Link>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: 2 }}>{room.code}</span>
          </div>

          {err ? <p style={{ color: 'var(--error)', fontSize: 13 }}>{err}</p> : null}

          {room.status === 'waiting' && isHost ? (
            <div style={{ marginTop: 8 }}>
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>Room setup</h2>
              <label style={lab}>Interview mode</label>
              <select
                style={sel}
                value={room.mode}
                onChange={(e) => patchRoomWaiting({ mode: e.target.value })}
              >
                {MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <label style={{ ...lab, marginTop: 12 }}>Role</label>
              <select style={sel} value={room.role} onChange={(e) => patchRoomWaiting({ role: e.target.value })}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <label style={{ ...lab, marginTop: 12 }}>Room visibility</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                  type="button"
                  className={room.is_public ? 'btn btn-primary' : 'btn btn-ghost'}
                  onClick={() => patchRoomWaiting({ is_public: true })}
                >
                  Public
                </button>
                <button
                  type="button"
                  className={!room.is_public ? 'btn btn-primary' : 'btn btn-ghost'}
                  onClick={() => patchRoomWaiting({ is_public: false })}
                >
                  Private
                </button>
              </div>
              <label style={lab}>Session mode</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  type="button"
                  className={room.session_mode === 'turn' ? 'btn btn-primary' : 'btn btn-ghost'}
                  onClick={() => patchRoomWaiting({ session_mode: 'turn' })}
                >
                  Turn-based
                </button>
                <button
                  type="button"
                  className={room.session_mode === 'observer' ? 'btn btn-primary' : 'btn btn-ghost'}
                  onClick={() => patchRoomWaiting({ session_mode: 'observer' })}
                >
                  Observer
                </button>
              </div>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={startInterview}>
                Start Interview
              </button>
            </div>
          ) : null}

          {room.status === 'waiting' && !isHost ? (
            <p style={{ color: 'var(--muted)' }}>Waiting for host to configure and start the interview…</p>
          ) : null}

          {room.status === 'active' || room.status === 'finished' ? (
            <>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                Q{room.current_question_index + 1} / {Array.isArray(room.questions) ? room.questions.length : 0} ·{' '}
                {room.session_mode === 'observer' ? 'Observer mode' : 'Turn-based'} · Stage: {room.stage}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.45, marginBottom: 16 }}>
                {typeof currentQuestion === 'string' ? currentQuestion : String(currentQuestion || '')}
              </div>

              {room.stage === 'question' && room.status === 'active' ? (
                <>
                  {room.session_mode === 'turn' && !myTurn ? (
                    <p style={{ color: 'var(--muted)' }}>
                      Waiting for{' '}
                      <strong>{ordered.find((p) => p.user_id === room.current_turn_user_id)?.display_name || '…'}</strong>{' '}
                      to answer…
                    </p>
                  ) : null}

                  {showObserverStream ? (
                    <div
                      style={{
                        minHeight: 120,
                        padding: 12,
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        background: 'var(--bg-surface)',
                        whiteSpace: 'pre-wrap',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {observerTyping || <span style={{ color: 'var(--muted)' }}>Watching host type…</span>}
                    </div>
                  ) : null}

                  {(myTurn && room.session_mode === 'turn') || (room.session_mode === 'observer' && user?.id === room.host_id) ? (
                    <textarea
                      style={{ ...ta, minHeight: 140 }}
                      value={localAnswer}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLocalAnswer(v);
                        if (room.session_mode === 'observer' && user?.id === room.host_id) broadcastTyping(v);
                      }}
                      placeholder="Your answer…"
                    />
                  ) : null}

                  {room.session_mode === 'observer' && user?.id !== room.host_id ? (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {EMOJIS.map((em) => (
                        <button key={em} type="button" className="btn btn-ghost" onClick={() => sendReaction(em)}>
                          {em}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {myTurn && (room.session_mode === 'turn' || (room.session_mode === 'observer' && user?.id === room.host_id)) ? (
                    <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy} onClick={submitAnswer}>
                      Submit answer
                    </button>
                  ) : null}
                </>
              ) : null}

              {room.stage === 'review' && room.session_mode === 'turn' ? (
                <div>
                  <h3 style={{ fontSize: 15, marginBottom: 10 }}>Compare answers</h3>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {ordered.map((p) => (
                      <div key={p.id} style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{p.display_name}</div>
                        <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                          {(room.round_answers && room.round_answers[p.user_id]) || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                  {isHost ? (
                    <button type="button" className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy} onClick={nextQuestion}>
                      Next question
                    </button>
                  ) : null}
                </div>
              ) : null}

              {room.status === 'finished' ? (
                <p style={{ color: 'var(--success)', marginTop: 12 }}>Session finished.</p>
              ) : null}
            </>
          ) : null}

          {reactions.map((r) => (
            <div
              key={r.id}
              style={{
                position: 'absolute',
                left: `${r.x}%`,
                top: `${r.y}%`,
                fontSize: 28,
                pointerEvents: 'none',
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              {r.emoji}
            </div>
          ))}
        </main>

        <aside style={card}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Live chat</div>
          <div style={{ flex: 1, maxHeight: 360, overflowY: 'auto', marginBottom: 10, fontSize: 13 }}>
            {chatMessages.map((m) => (
              <div key={m.id} style={{ marginBottom: 10 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{m.user}</span>{' '}
                <span style={{ color: 'var(--muted)', fontSize: 11 }}>{new Date(m.ts).toLocaleTimeString()}</span>
                <div style={{ color: 'var(--text-secondary)' }}>{m.text}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ ...inp, flex: 1 }}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder="Message…"
            />
            <button type="button" className="btn btn-primary" onClick={sendChat}>
              Send
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

const shell = {
  minHeight: '100vh',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  padding: '20px 12px 40px',
};

const card = {
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: 14,
  background: 'var(--bg-card)',
  alignSelf: 'start',
};

const lab = { display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 };
const sel = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
};
const ta = {
  width: '100%',
  padding: 12,
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  resize: 'vertical',
};
const inp = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
};
