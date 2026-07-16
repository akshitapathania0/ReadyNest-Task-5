import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [invite, setInvite] = useState<any>(null);
  const [form, setForm] = useState({ name: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setError('No invite token found in URL'); return; }
    api.get(`/auth/invite/${token}`)
      .then(r => setInvite(r.data.data))
      .catch(err => setError(err.response?.data?.error?.message || 'Invalid or expired invite'));
  }, [token]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.password) { toast.error('All fields required'); return; }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 8) { toast.error('Password min 8 characters'); return; }
    setLoading(true);
    try {
      await api.post(`/auth/invite/${token}/accept`, { name: form.name, password: form.password });
      setDone(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to accept invite');
    } finally { setLoading(false); }
  };

  const s = {
    page: { minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } as React.CSSProperties,
    card: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420 } as React.CSSProperties,
    label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 } as React.CSSProperties,
    input: { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text)', outline: 'none' } as React.CSSProperties,
    btn: { width: '100%', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 20 } as React.CSSProperties,
  };

  if (error) return (
    <div style={s.page}>
      <div style={{ ...s.card, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Invalid invite</h2>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>{error}</p>
        <Link to="/login" style={{ color: 'var(--accent)', fontSize: 13 }}>Back to sign in</Link>
      </div>
    </div>
  );

  if (done) return (
    <div style={s.page}>
      <div style={{ ...s.card, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>You're in!</h2>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
          Your account has been created. Sign in with your email and password.
        </p>
        <Link to="/login" style={{ display: 'block', background: 'var(--accent)', color: '#fff', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 500, textDecoration: 'none', textAlign: 'center' }}>
          Go to sign in
        </Link>
      </div>
    </div>
  );

  if (!invite) return (
    <div style={s.page}>
      <div style={{ ...s.card, textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: 13, color: 'var(--text2)' }}>Loading invite...</p>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✉️</div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>You've been invited!</h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
            Join <strong style={{ color: 'var(--text)' }}>{invite.tenant?.name}</strong> as{' '}
            <span style={{ background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: 20, padding: '1px 8px', fontSize: 12 }}>{invite.role}</span>
          </p>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Invited to: {invite.email}</p>
        </div>
        <form onSubmit={handle}>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Your name</label>
            <input style={s.input} placeholder="Jordan Davis" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Set password</label>
            <input style={s.input} type="password" placeholder="Min 8 characters" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label style={s.label}>Confirm password</label>
            <input style={s.input} type="password" placeholder="Repeat password" value={form.confirm}
              onChange={e => setForm({ ...form, confirm: e.target.value })} />
          </div>
          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Creating account...' : 'Accept invite & join'}
          </button>
        </form>
      </div>
    </div>
  );
}