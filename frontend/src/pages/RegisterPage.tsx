import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const ROLES = [
  { value: 'MEMBER', label: 'Member', desc: 'Read and write access to projects', color: 'var(--accent)', bg: 'var(--accent-bg)' },
  { value: 'VIEWER', label: 'Viewer', desc: 'Read-only, cannot make changes', color: 'var(--amber)', bg: 'var(--amber-bg)' },
];

type Mode = 'new_org' | 'join_org';

export default function RegisterPage() {
  const { register } = useAuth();
  const [mode, setMode] = useState<Mode>('new_org');
  const [form, setForm] = useState({ tenantName: '', tenantSlug: '', name: '', email: '', password: '', role: 'MEMBER', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const getSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 32);

  const s = {
    page: { minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } as React.CSSProperties,
    card: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 460 } as React.CSSProperties,
    label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 } as React.CSSProperties,
    input: { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text)', outline: 'none' } as React.CSSProperties,
    btn: { width: '100%', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 20 } as React.CSSProperties,
    mb: { marginBottom: 14 } as React.CSSProperties,
  };

  const handleNewOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tenantName || !form.name || !form.email || !form.password) { toast.error('All fields required'); return; }
    if (form.password.length < 8) { toast.error('Password min 8 characters'); return; }
    setLoading(true);
    try {
      await register({ tenantName: form.tenantName, name: form.name, email: form.email, password: form.password });
      toast.success(`Organization created! Slug: ${getSlug(form.tenantName)}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tenantSlug || !form.name || !form.email || !form.password) { toast.error('All fields required'); return; }
    if (form.password.length < 8) { toast.error('Password min 8 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/join-request', {
      tenantSlug: form.tenantSlug,
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      message: form.message,
    });
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Request failed');
    } finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div style={s.page}>
        <div style={{ ...s.card, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Request sent!</h2>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
            Your join request has been sent to the organization admin.<br />
            They will review it and send you an invite link via email once approved.
          </p>
          <Link to="/login" style={{ color: 'var(--accent)', fontSize: 13 }}>Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, background: 'var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 18, margin: '0 auto 12px' }}>N</div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Get started with NexaOS</h1>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {([['new_org', '🏢 Create org'], ['join_org', '🔗 Join existing']] as [Mode, string][]).map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '7px', border: 'none', borderRadius: 7, fontSize: 13,
              fontWeight: 500, cursor: 'pointer',
              background: mode === m ? 'var(--bg2)' : 'transparent',
              color: mode === m ? 'var(--text)' : 'var(--text3)',
              boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,.2)' : 'none',
            }}>{label}</button>
          ))}
        </div>

        {mode === 'new_org' ? (
          <form onSubmit={handleNewOrg}>
            <div style={s.mb}>
              <label style={s.label}>Organization name</label>
              <input style={s.input} placeholder="e.g. Acme Corp" value={form.tenantName}
                onChange={e => setForm({ ...form, tenantName: e.target.value })} />
              {form.tenantName && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  Login slug: <strong style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{getSlug(form.tenantName)}</strong>
                </div>
              )}
            </div>
            <div style={s.mb}>
              <label style={s.label}>Your name</label>
              <input style={s.input} placeholder="Jordan Davis" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={s.mb}>
              <label style={s.label}>Work email</label>
              <input style={s.input} type="email" placeholder="you@company.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label style={s.label}>Password</label>
              <input style={s.input} type="password" placeholder="Min 8 characters" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div style={{ marginTop: 14, background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--green)' }}>
              ✓ You will be the <strong>Admin</strong> of this organization
            </div>
            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? 'Creating...' : 'Create organization'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinOrg}>
            <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--accent)', marginBottom: 16 }}>
              ℹ️ Your request will be sent to the org admin for approval. Once approved, you can sign in with the email and password you set here.
            </div>
            <div style={s.mb}>
              <label style={s.label}>Organization slug</label>
              <input style={s.input} placeholder="e.g. acme_corp" value={form.tenantSlug}
                onChange={e => setForm({ ...form, tenantSlug: e.target.value.toLowerCase().replace(/\s/g, '_') })} />
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Ask your admin for the organization slug</div>
            </div>
            <div style={s.mb}>
              <label style={s.label}>Your name</label>
              <input style={s.input} placeholder="Jordan Davis" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={s.mb}>
              <label style={s.label}>Your email</label>
              <input style={s.input} type="email" placeholder="you@company.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div style={s.mb}>
              <label style={s.label}>Password</label>
              <input style={s.input} type="password" placeholder="Min 8 characters" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div style={s.mb}>
              <label style={s.label}>Requested role</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ROLES.map(r => (
                  <div key={r.value} onClick={() => setForm({ ...form, role: r.value })}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: `1px solid ${form.role === r.value ? r.color : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: form.role === r.value ? r.bg : 'var(--bg3)', transition: 'all .15s' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${form.role === r.value ? r.color : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {form.role === r.value && <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: form.role === r.value ? r.color : 'var(--text)' }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={s.mb}>
              <label style={s.label}>Message to admin <span style={{ color: 'var(--text3)' }}>(optional)</span></label>
              <textarea style={{ ...s.input, height: 72, resize: 'none' }} placeholder="Why do you want to join?" value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })} />
            </div>
            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? 'Sending request...' : 'Send join request'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text2)', marginTop: 20 }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}