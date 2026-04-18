'use client';

import { useCallback, useState } from 'react';

export default function FeedbackFab({ userId, showToast }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('bug');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const submit = useCallback(async () => {
    const d = description.trim();
    if (d.length < 3) {
      showToast?.('Please add a description.', true);
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/feedback-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description: d,
          email: email.trim() || null,
          user_id: userId || null,
        }),
      });
      if (!res.ok) throw new Error('Submit failed');
      showToast?.("Thanks! We'll look into it.");
      setOpen(false);
      setDescription('');
      setEmail('');
    } catch {
      showToast?.('Could not send feedback. Try again.', true);
    } finally {
      setSending(false);
    }
  }, [type, description, email, userId, showToast]);

  return (
    <>
      <button
        type="button"
        className="feedback-fab"
        aria-label="Send feedback"
        onClick={() => setOpen(true)}
      >
        💬
      </button>

      {open ? (
        <>
          <div className="feedback-fab-backdrop" onClick={() => setOpen(false)} aria-hidden />
          <div className="feedback-fab-modal" role="dialog" aria-labelledby="feedback-fab-title">
            <h2 id="feedback-fab-title">Send Feedback</h2>
            <div className="feedback-type-pills">
              {[
                { id: 'bug', label: 'Bug Report' },
                { id: 'feature', label: 'Feature Request' },
                { id: 'general', label: 'General Feedback' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`feedback-pill ${type === p.id ? 'active' : ''}`}
                  onClick={() => setType(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label className="feedback-fab-label">
              Description <span className="req">*</span>
              <textarea
                className="feedback-fab-textarea"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue or suggestion..."
              />
            </label>
            <label className="feedback-fab-label">
              Email (optional)
              <input
                type="email"
                className="feedback-fab-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email (optional, for follow-up)"
              />
            </label>
            <div className="feedback-fab-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={sending} onClick={submit}>
                {sending ? 'Sending…' : 'Submit'}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
