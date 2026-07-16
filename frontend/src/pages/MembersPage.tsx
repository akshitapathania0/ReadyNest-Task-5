import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const roleColor: any = { ADMIN: 'var(--purple)', MEMBER: 'var(--accent)', VIEWER: 'var(--amber)' };
const roleBg: any = { ADMIN: 'var(--purple-bg)', MEMBER: 'var(--accent-bg)', VIEWER: 'var(--amber-bg)' };

export default function MembersPage() {
  const { can, user: currentUser } = useAuth();
  const isAdmin = can('ADMIN');
  const [tab, setTab] = useState<'members' | 'requests' | 'invites'>('members');

  // Real data from API
  const [members, setMembers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);

  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'MEMBER' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  // Fetch members
  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const { data } = await api.get('/users');
      setMembers(data.data || []);
    } catch (err: any) {
      toast.error('Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  };

  // Fetch join requests (admin only)
  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const { data } = await api.get('/users/join-requests?status=PENDING');
      setRequests(data.data || []);
    } catch {
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Fetch pending invites (admin only)
  const fetchInvites = async () => {
    setLoadingInvites(true);
    try {
      const { data } = await api.get('/users/invites');
      setInvites(data.data || []);
    } catch {
      setInvites([]);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    if (isAdmin) {
      fetchRequests();
      fetchInvites();
    }
  }, [isAdmin]);

  const filtered = members.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const btn = (bg = 'var(--accent)', color = '#fff') => ({
    background: bg, color, border: 'none', borderRadius: 8,
    padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
  } as React.CSSProperties);

  const card = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 } as React.CSSProperties;
  const input = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: 'var(--text)', outline: 'none', width: '100%' } as React.CSSProperties;

  const sendInvite = async () => {
    if (!inviteForm.email) { toast.error('Email required'); return; }
    setInviteLoading(true);
    try {
      const { data } = await api.post('/users/invite', {
        email: inviteForm.email,
        role: inviteForm.role,
      });
      setInviteLink(data.data.acceptLink);
      await fetchInvites();
      toast.success(`Invite created for ${inviteForm.email}`);
      setInviteForm({ email: '', role: 'MEMBER' });
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Unknown error';
      toast.error(msg);
    } finally {
      setInviteLoading(false);
    }
  };

  const approveRequest = async (id: string, name: string) => {
  try {
    await api.post(`/users/join-requests/${id}/approve`);
    setRequests(prev => prev.filter(r => r.id !== id));
    await fetchMembers();
    toast.success(`✓ ${name} approved and can now sign in!`);
  } catch (err: any) {
    toast.error(err.response?.data?.error?.message || 'Failed to approve');
  }
};

  const rejectRequest = async (id: string, name: string) => {
    try {
      await api.post(`/users/join-requests/${id}/reject`);
      setRequests(prev => prev.filter(r => r.id !== id));
      toast.success(`${name}'s request rejected`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to reject');
    }
  };

  const revokeInvite = async (id: string, email: string) => {
    try {
      await api.delete(`/users/invites/${id}`);
      setInvites(prev => prev.filter(i => i.id !== id));
      toast.success(`Invite to ${email} revoked`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to revoke');
    }
  };

  const removeMember = async (id: string, email: string) => {
    try {
      await api.delete(`/users/${id}`);
      setMembers(prev => prev.filter(m => m.id !== id));
      toast.success(`${email} removed`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to remove');
    }
  };

  const TABS = [
    { key: 'members', label: `Members (${members.length})` },
    ...(isAdmin ? [
      { key: 'requests', label: `Join Requests${requests.length > 0 ? ` (${requests.length})` : ''}` },
      { key: 'invites', label: `Pending Invites (${invites.length})` },
    ] : []),
  ] as { key: typeof tab; label: string }[];

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Members</h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Manage your organization's team.</p>
        </div>
        {isAdmin && (
          <button style={btn()} onClick={() => { setShowInviteModal(true); setInviteLink(''); }}>
            + Invite member
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: tab === t.key ? 'var(--accent)' : 'var(--text2)', borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Members tab */}
      {tab === 'members' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
            <input style={{ ...input, width: 240 }} placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
            <button style={btn('var(--bg3)', 'var(--text)')} onClick={fetchMembers}>↻ Refresh</button>
          </div>

          {loadingMembers ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading members...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {filtered.map(m => {
                const initials = m.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?';
                const isCurrentUser = m.id === currentUser?.id;
                return (
                  <div key={m.id} style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>{initials}</div>
                        <div style={{ width: 8, height: 8, background: m.isActive ? 'var(--green)' : 'var(--text3)', borderRadius: '50%', border: '2px solid var(--bg2)', position: 'absolute', bottom: 0, right: 0 }} />
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.name} {isCurrentUser && <span style={{ fontSize: 10, color: 'var(--text3)' }}>(you)</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ background: roleBg[m.role], color: roleColor[m.role], borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 500 }}>{m.role}</span>
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                        {m.lastLoginAt ? `Last seen ${new Date(m.lastLoginAt).toLocaleDateString()}` : 'Never logged in'}
                      </span>
                    </div>
                    {isAdmin && !isCurrentUser && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={{ ...btn('var(--bg3)', 'var(--text)'), flex: 1, fontSize: 11 }}
                          onClick={() => toast.success('Edit coming soon')}>Edit</button>
                        <button style={{ ...btn('var(--red-bg)', 'var(--red)'), fontSize: 11 }}
                          onClick={() => removeMember(m.id, m.email)}>Remove</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && !loadingMembers && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 32, color: 'var(--text3)' }}>No members found</div>
              )}
            </div>
          )}
        </>
      )}

      {/* Join Requests tab */}
      {tab === 'requests' && isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
            <button style={btn('var(--bg3)', 'var(--text)')} onClick={fetchRequests}>↻ Refresh</button>
          </div>
          {loadingRequests ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading...</div>
          ) : requests.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 32, color: 'var(--text3)' }}>No pending join requests 🎉</div>
          ) : requests.map(r => (
            <div key={r.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg3)', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                {r.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</span>
                  <span style={{ background: roleBg[r.role], color: roleColor[r.role], borderRadius: 20, padding: '1px 8px', fontSize: 10 }}>{r.role}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{r.email}</div>
                {r.message && (
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, background: 'var(--bg3)', borderRadius: 6, padding: '4px 8px' }}>"{r.message}"</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{new Date(r.createdAt).toLocaleDateString()}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button style={btn('var(--green-bg)', 'var(--green)')} onClick={() => approveRequest(r.id, r.name)}>✓ Approve</button>
                <button style={btn('var(--red-bg)', 'var(--red)')} onClick={() => rejectRequest(r.id, r.name)}>✕ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending Invites tab */}
      {tab === 'invites' && isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
            <button style={btn('var(--bg3)', 'var(--text)')} onClick={fetchInvites}>↻ Refresh</button>
          </div>
          {loadingInvites ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading...</div>
          ) : invites.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 32, color: 'var(--text3)' }}>No pending invites</div>
          ) : invites.map(inv => (
            <div key={inv.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>✉️</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{inv.email}</span>
                  <span style={{ background: roleBg[inv.role], color: roleColor[inv.role], borderRadius: 20, padding: '1px 8px', fontSize: 10 }}>{inv.role}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Sent {new Date(inv.createdAt).toLocaleDateString()} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                </div>
              </div>
              <button style={btn('var(--red-bg)', 'var(--red)')} onClick={() => revokeInvite(inv.id, inv.email)}>Revoke</button>
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setShowInviteModal(false)}>
          <div style={{ ...card, width: 440, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
              Invite member
              <span style={{ cursor: 'pointer', color: 'var(--text3)' }} onClick={() => setShowInviteModal(false)}>✕</span>
            </div>

            {!inviteLink ? (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 5 }}>Email address</label>
                  <input style={input} type="email" placeholder="colleague@company.com" value={inviteForm.email}
                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Role</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['MEMBER', 'Member', 'var(--accent)', 'var(--accent-bg)'], ['VIEWER', 'Viewer', 'var(--amber)', 'var(--amber-bg)'], ['ADMIN', 'Admin', 'var(--purple)', 'var(--purple-bg)']].map(([v, l, c, bg]) => (
                      <div key={v} onClick={() => setInviteForm({ ...inviteForm, role: v })}
                        style={{ flex: 1, padding: '8px', border: `1px solid ${inviteForm.role === v ? c : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: inviteForm.role === v ? bg : 'var(--bg3)', textAlign: 'center', fontSize: 12, fontWeight: 500, color: inviteForm.role === v ? c : 'var(--text2)', transition: 'all .15s' }}>
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button style={btn('var(--bg3)', 'var(--text)')} onClick={() => setShowInviteModal(false)}>Cancel</button>
                  <button style={btn()} onClick={sendInvite} disabled={inviteLoading}>
                    {inviteLoading ? 'Sending...' : 'Send invite'}
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--green)', marginBottom: 8 }}>✓ Invite link created!</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Share this link — expires in 7 days:</div>
                  <div style={{ background: 'var(--bg3)', borderRadius: 6, padding: '8px 10px', fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all', color: 'var(--accent)' }}>{inviteLink}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ ...btn('var(--bg3)', 'var(--text)'), flex: 1 }}
                    onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!'); }}>
                    📋 Copy link
                  </button>
                  <button style={{ ...btn(), flex: 1 }} onClick={() => { setShowInviteModal(false); setInviteLink(''); }}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}