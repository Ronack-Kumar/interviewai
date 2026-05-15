'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { createClient } from '../../lib/supabase';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomRoomCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

function displayNameFromUser(user) {
  const meta = user?.user_metadata;
  if (meta?.full_name && String(meta.full_name).trim()) return String(meta.full_name).trim();
  if (user?.email) return user.email.split('@')[0];
  return 'Player';
}

export default function RoomsClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [publicRooms, setPublicRooms] = useState([]);

  const loadPublicRooms = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('rooms')
      .select('id, code, host_display_name, mode, role, room_participants ( id )')
      .eq('is_public', true)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) return;
    setPublicRooms(
      (data || []).map((r) => ({
        ...r,
        playerCount: Array.isArray(r.room_participants) ? r.room_participants.length : 0,
      }))
    );
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!u) {
        router.replace('/auth?next=/rooms');
        return;
      }
      setUser(u);
      setReady(true);
      await loadPublicRooms();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPublicRooms, router]);

  useEffect(() => {
    if (!ready) return;
    const t = setInterval(loadPublicRooms, 5000);
    return () => clearInterval(t);
  }, [ready, loadPublicRooms]);

  const createRoom = async () => {
    if (!user) return;
    setBusy(true);
    setErr('');
    const supabase = createClient();
    const name = displayNameFromUser(user);
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = randomRoomCode();
      const { data: room, error: rErr } = await supabase
        .from('rooms')
        .insert({
          code,
          host_id: user.id,
          host_display_name: name,
          mode: 'technical',
          role: 'Full Stack Developer',
          is_public: false,
          status: 'waiting',
        })
        .select('id, code')
        .single();
      if (rErr) {
        if (String(rErr.message || '').includes('duplicate') || rErr.code === '23505') continue;
        setErr(rErr.message || 'Could not create room');
        setBusy(false);
        return;
      }
      const { error: pErr } = await supabase.from('room_participants').insert({
        room_id: room.id,
        user_id: user.id,
        display_name: name,
      });
      if (pErr) {
        setErr(pErr.message || 'Could not join as host');
        setBusy(false);
        return;
      }
      router.push(`/rooms/${encodeURIComponent(room.code)}`);
      return;
    }
    setErr('Could not generate a unique room code. Try again.');
    setBusy(false);
  };

  const joinRoom = async (codeRaw) => {
    const code = String(codeRaw || joinCode || '')
      .trim()
      .toUpperCase();
    if (code.length !== 6) {
      setErr('Enter a 6-character room code.');
      return;
    }
    if (!user) return;
    setBusy(true);
    setErr('');
    const supabase = createClient();
    const { data: rows, error: rpcErr } = await supabase.rpc('room_by_code', { _code: code });
    if (rpcErr || !rows || !rows.length) {
      setErr(rpcErr?.message || 'Room not found or not joinable.');
      setBusy(false);
      return;
    }
    const room = rows[0];
    const { error: pErr } = await supabase.from('room_participants').insert({
      room_id: room.id,
      user_id: user.id,
      display_name: displayNameFromUser(user),
    });
    if (pErr && pErr.code !== '23505') {
      setErr(pErr.message || 'Could not join room');
      setBusy(false);
      return;
    }
    router.push(`/rooms/${encodeURIComponent(room.code)}`);
  };

  if (!ready) {
    return (
      <div style={shell}>
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={shell}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link href="/app" style={{ color: 'var(--accent)', fontSize: 14 }}>
          ← Home
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '16px 0 8px' }}>Peer Rooms</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 24, lineHeight: 1.5 }}>
          Practice interviews with friends in real time.
        </p>

        {err ? (
          <p style={{ color: 'var(--error)', marginBottom: 16, fontSize: 14 }}>{err}</p>
        ) : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28, alignItems: 'flex-end' }}>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={createRoom}>
            Create Room
          </button>
          <div style={{ flex: '1 1 200px' }}>
            <label style={lab}>Join Room</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={inp}
                maxLength={6}
                placeholder="CODE"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => joinRoom()}>
                Join
              </button>
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Public Rooms</h2>
        {publicRooms.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>No public rooms waiting right now.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {publicRooms.map((r) => (
              <li
                key={r.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  marginBottom: 10,
                  background: 'var(--bg-card)',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: 2 }}>{r.code}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    Host: {r.host_display_name} · Mode: {r.mode} · Players: {r.playerCount}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Role: {r.role}</div>
                </div>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => joinRoom(r.code)}>
                  Join
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const shell = {
  minHeight: '100vh',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  padding: '24px 16px 48px',
};

const lab = { display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 };
const inp = {
  flex: 1,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  letterSpacing: 2,
};
