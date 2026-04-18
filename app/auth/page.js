'use client';

import { createClient } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState('signin');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  const [emailIn, setEmailIn] = useState('');
  const [passwordIn, setPasswordIn] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState('');

  const [fullName, setFullName] = useState('');
  const [emailUp, setEmailUp] = useState('');
  const [passwordUp, setPasswordUp] = useState('');
  const [passwordUp2, setPasswordUp2] = useState('');
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpError, setSignUpError] = useState('');
  const [signUpSuccess, setSignUpSuccess] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const qpTab = new URLSearchParams(window.location.search).get('tab');
    if (qpTab === 'signup') setTab('signup');
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled && user) {
        router.replace('/');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSignIn(e) {
    e.preventDefault();
    setSignInError('');
    setSignInLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: emailIn.trim(),
        password: passwordIn,
      });
      if (error) {
        setSignInError(error.message);
        return;
      }
      router.replace('/');
      router.refresh();
    } finally {
      setSignInLoading(false);
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setSignUpError('');
    setSignUpSuccess('');
    if (passwordUp.length < 8) {
      setSignUpError('Password must be at least 8 characters.');
      return;
    }
    if (passwordUp !== passwordUp2) {
      setSignUpError('Passwords do not match.');
      return;
    }
    setSignUpLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: emailUp.trim(),
        password: passwordUp,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });
      if (error) {
        setSignUpError(error.message);
        return;
      }
      setSignUpSuccess(
        "Check your email — we've sent you a confirmation link"
      );
      setTimeout(() => {
        router.replace('/');
        router.refresh();
      }, 900);
    } finally {
      setSignUpLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setForgotMsg('');
    setForgotLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: 'https://interviewai-swart.vercel.app/auth/reset',
      });
      if (error) throw error;
      setForgotMsg('Check your email for a reset link');
    } catch (err) {
      setForgotMsg(err.message || 'Could not send reset link');
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">MockPrep</div>
        <p className="auth-tagline">Practice interviews. Get better. Get hired.</p>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'signin'}
            className={`auth-tab ${tab === 'signin' ? 'active' : ''}`}
            onClick={() => {
              setTab('signin');
              setSignInError('');
              setSignUpError('');
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'signup'}
            className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setTab('signup');
              setSignInError('');
              setSignUpError('');
            }}
          >
            Sign up
          </button>
        </div>

        {tab === 'signin' ? (
          <form className="auth-form" onSubmit={handleSignIn}>
            <label className="auth-label">
              Email
              <input
                className="auth-input"
                type="email"
                autoComplete="email"
                value={emailIn}
                onChange={(e) => setEmailIn(e.target.value)}
                required
              />
            </label>
            <label className="auth-label">
              Password
              <input
                className="auth-input"
                type="password"
                autoComplete="current-password"
                value={passwordIn}
                onChange={(e) => setPasswordIn(e.target.value)}
                required
              />
            </label>
            <button
              type="button"
              className="sidebar__sign-out"
              style={{ alignSelf: 'flex-start', marginTop: -4 }}
              onClick={() => setShowForgot((s) => !s)}
            >
              Forgot password?
            </button>
            {showForgot ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <input
                  className="auth-input"
                  type="email"
                  placeholder="Email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
                <button type="button" className="auth-submit" disabled={forgotLoading} onClick={handleForgotPassword}>
                  {forgotLoading ? 'Sending…' : 'Send reset link'}
                </button>
                {forgotMsg ? <p className="auth-success">{forgotMsg}</p> : null}
              </div>
            ) : null}
            <button
              type="submit"
              className="auth-submit"
              disabled={signInLoading}
            >
              {signInLoading ? 'Signing in…' : 'Sign in'}
            </button>
            {signInError ? <p className="auth-error">{signInError}</p> : null}
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSignUp}>
            <label className="auth-label">
              Full name
              <input
                className="auth-input"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </label>
            <label className="auth-label">
              Email
              <input
                className="auth-input"
                type="email"
                autoComplete="email"
                value={emailUp}
                onChange={(e) => setEmailUp(e.target.value)}
                required
              />
            </label>
            <label className="auth-label">
              Password (min 8 characters)
              <input
                className="auth-input"
                type="password"
                autoComplete="new-password"
                value={passwordUp}
                onChange={(e) => setPasswordUp(e.target.value)}
                minLength={8}
                required
              />
            </label>
            <label className="auth-label">
              Confirm password
              <input
                className="auth-input"
                type="password"
                autoComplete="new-password"
                value={passwordUp2}
                onChange={(e) => setPasswordUp2(e.target.value)}
                minLength={8}
                required
              />
            </label>
            <button
              type="submit"
              className="auth-submit"
              disabled={signUpLoading}
            >
              {signUpLoading ? 'Creating account…' : 'Create account'}
            </button>
            {signUpSuccess ? (
              <p className="auth-success">{signUpSuccess}</p>
            ) : null}
            {signUpError ? <p className="auth-error">{signUpError}</p> : null}
          </form>
        )}
      </div>
    </div>
  );
}
