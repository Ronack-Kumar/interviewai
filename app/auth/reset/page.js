'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createClient } from '../../../lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('');
    if (password.length < 8) {
      setMsg('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setMsg('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.replace('/');
      router.refresh();
    } catch (err) {
      setMsg(err.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">Reset password</div>
        <form className="auth-form" onSubmit={onSubmit}>
          <label className="auth-label">
            New password
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <label className="auth-label">
            Confirm password
            <input
              className="auth-input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Updating…' : 'Set new password'}
          </button>
          {msg ? <p className="auth-success">{msg}</p> : null}
        </form>
      </div>
    </div>
  );
}
