import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', tenantSlug: '' });
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.tenantSlug) {
      toast.error('All fields are required'); return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password, form.tenantSlug);
      toast.success('Welcome back!');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Login failed';
      const status = err?.response?.status || '';
      toast.error(status ? `${status}: ${msg}` : msg);
    } finally { setLoading(false); }
  };

  const s = {
    page: { minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } as React.CSSProperties,
    card: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420 } as React.CSSProperties,
    label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 } as React.CSSProperties,
    input: { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text)', outline: 'none' } as React.CSSProperties,
    btn: { width: '100%', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 20 } as React.CSSProperties,
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, background: 'var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 18, margin: '0 auto 12px' }}>N</div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Sign in to NexaOS</h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Enter your organization slug to continue</p>
        </div>
        <form onSubmit={handle}>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Organization slug</label>
            <input style={s.input} placeholder="e.g. acme_corp" value={form.tenantSlug}
              onChange={e => setForm({ ...form, tenantSlug: e.target.value.toLowerCase().replace(/\s/g, '_') })} />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              This is the slug shown when you registered
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" placeholder="you@company.com" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div style={{ marginBottom: 4 }}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <Link to="/register" style={{ display: 'block', textAlign: 'center', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 500, color: 'var(--text)', textDecoration: 'none' }}>
          Create new organization
        </Link>
      </div>
    </div>
  );
}