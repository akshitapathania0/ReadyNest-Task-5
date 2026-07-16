import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// ── SHARED STYLES ──────────────────────────────────────────────────────────
const card = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 } as React.CSSProperties;
const input = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: 'var(--text)', outline: 'none', width: '100%' } as React.CSSProperties;
const btn = (bg = 'var(--accent)', color = '#fff') => ({ background: bg, color, border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }) as React.CSSProperties;

// ── LIVE FEED ─────────────────────────────────────────────────────────────
const RT_EVENTS = [
  { actor: 'Sam Park', action: 'created a new task in Marketing Hub', type: 'create' },
  { actor: 'Alex Chen', action: 'uploaded brand-assets.zip', type: 'upload' },
  { actor: 'Riley Kim', action: 'commented on API Revamp', type: 'comment' },
  { actor: 'System', action: 'automated backup completed', type: 'system' },
  { actor: 'Jordan Davis', action: 'updated project status to Active', type: 'update' },
];
const typeColor: any = { create: 'var(--green)', upload: 'var(--accent)', comment: 'var(--amber)', system: 'var(--text3)', update: 'var(--purple)' };

export function LiveFeedPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<any>(null);

  const addEvent = () => {
    const e = RT_EVENTS[Math.floor(Math.random() * RT_EVENTS.length)];
    const now = new Date();
    setEvents(prev => [{ ...e, id: Date.now(), time: now.toLocaleTimeString() }, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    addEvent();
    timerRef.current = setInterval(() => { if (!paused) addEvent(); }, 2500);
    return () => clearInterval(timerRef.current);
  }, [paused]);

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>Live event feed</h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>Real-time WebSocket events from your workspace.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn('var(--bg3)', 'var(--text)')} onClick={() => setEvents([])}>Clear</button>
          <button style={btn()} onClick={() => setPaused(!paused)}>{paused ? '▶ Resume' : '⏸ Pause'}</button>
        </div>
      </div>
      <div style={card}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 500, overflowY: 'auto' }}>
          {events.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 24 }}>Waiting for events...</p>}
          {events.map(e => (
            <div key={e.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 12, fontSize: 12, animation: 'none' }}>
              <span style={{ color: 'var(--text3)', minWidth: 70 }}>{e.time}</span>
              <span style={{ flex: 1 }}><strong style={{ color: 'var(--text)' }}>{e.actor}</strong> {e.action}</span>
              <span style={{ background: 'var(--bg4)', color: typeColor[e.type] || 'var(--text3)', borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>{e.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PROJECTS ──────────────────────────────────────────────────────────────
const MOCK_PROJECTS = [
  { id: '1', name: 'Marketing Hub', status: 'ACTIVE', owner: 'Jordan Davis', members: 8, dueDate: '2025-08-30', progress: 72 },
  { id: '2', name: 'API Revamp', status: 'IN_REVIEW', owner: 'Alex Chen', members: 5, dueDate: '2025-09-15', progress: 45 },
  { id: '3', name: 'Mobile App v3', status: 'PLANNING', owner: 'Sam Park', members: 12, dueDate: '2025-11-01', progress: 18 },
  { id: '4', name: 'Data Pipeline', status: 'ACTIVE', owner: 'Morgan Lee', members: 4, dueDate: '2025-08-10', progress: 91 },
  { id: '5', name: 'Design System', status: 'COMPLETED', owner: 'Riley Kim', members: 3, dueDate: '2025-07-20', progress: 100 },
];
const statusLabel: any = { ACTIVE: 'Active', IN_REVIEW: 'In Review', PLANNING: 'Planning', COMPLETED: 'Completed', ARCHIVED: 'Archived' };
const statusColor2: any = { ACTIVE: 'var(--green)', IN_REVIEW: 'var(--amber)', PLANNING: 'var(--accent)', COMPLETED: 'var(--purple)', ARCHIVED: 'var(--text3)' };
const statusBg2: any = { ACTIVE: 'var(--green-bg)', IN_REVIEW: 'var(--amber-bg)', PLANNING: 'var(--accent-bg)', COMPLETED: 'var(--purple-bg)', ARCHIVED: 'var(--bg4)' };

export function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', status: 'PLANNING' });
  const [projects, setProjects] = useState(MOCK_PROJECTS);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (!filter || p.status === filter)
  );

  const create = () => {
    if (!form.name) { toast.error('Name required'); return; }
    setProjects(prev => [...prev, { id: Date.now().toString(), name: form.name, status: form.status, owner: 'You', members: 1, dueDate: '-', progress: 0 }]);
    setShowModal(false);
    setForm({ name: '', description: '', status: 'PLANNING' });
    toast.success('Project created');
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 600 }}>Projects</h1><p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>All projects in your workspace.</p></div>
        <button style={btn()} onClick={() => setShowModal(true)}>+ New project</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input style={{ ...input, width: 220 }} placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...input, width: 160, cursor: 'pointer' }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['ACTIVE', 'IN_REVIEW', 'PLANNING', 'COMPLETED'].map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
        </select>
      </div>
      <div style={{ ...card, padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Project','Status','Owner','Members','Due date','Progress','Actions'].map(h => (
              <th key={h} style={{ textAlign:'left', padding:'10px 14px', fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding:'11px 14px', fontWeight:500, color:'var(--text)' }}>{p.name}</td>
                <td style={{ padding:'11px 14px' }}><span style={{ background:statusBg2[p.status], color:statusColor2[p.status], borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:500 }}>{statusLabel[p.status]}</span></td>
                <td style={{ padding:'11px 14px', color:'var(--text2)' }}>{p.owner}</td>
                <td style={{ padding:'11px 14px', color:'var(--text2)' }}>{p.members}</td>
                <td style={{ padding:'11px 14px', color:'var(--text3)' }}>{p.dueDate}</td>
                <td style={{ padding:'11px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:80, height:4, background:'var(--bg4)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${p.progress}%`, background:p.progress===100?'var(--green)':'var(--accent)', borderRadius:2 }} />
                    </div>
                    <span style={{ fontSize:11, color:'var(--text3)' }}>{p.progress}%</span>
                  </div>
                </td>
                <td style={{ padding:'11px 14px' }}>
                  <div style={{ display:'flex', gap:4 }}>
                    <button style={btn('var(--bg3)','var(--text)')} onClick={() => toast.success('Edit coming soon')}>Edit</button>
                    <button style={btn('var(--red-bg)','var(--red)')} onClick={() => { setProjects(prev => prev.filter(x => x.id !== p.id)); toast.success('Deleted'); }}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} style={{ padding:32, textAlign:'center', color:'var(--text3)' }}>No projects found</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }} onClick={() => setShowModal(false)}>
          <div style={{ ...card, width:420, padding:24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:20, display:'flex', justifyContent:'space-between' }}>New project<span style={{ cursor:'pointer', color:'var(--text3)' }} onClick={() => setShowModal(false)}>✕</span></div>
            <div style={{ marginBottom:12 }}><label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Name</label><input style={input} placeholder="Project name" value={form.name} onChange={e => setForm({...form,name:e.target.value})} /></div>
            <div style={{ marginBottom:12 }}><label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Description</label><input style={input} placeholder="What is this project?" value={form.description} onChange={e => setForm({...form,description:e.target.value})} /></div>
            <div style={{ marginBottom:20 }}><label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Status</label>
              <select style={{ ...input, cursor:'pointer' }} value={form.status} onChange={e => setForm({...form,status:e.target.value})}>
                {['PLANNING','ACTIVE','IN_REVIEW'].map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button style={btn('var(--bg3)','var(--text)')} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={btn()} onClick={create}>Create project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MEMBERS ───────────────────────────────────────────────────────────────
const MOCK_MEMBERS = [
  { id: '1', name: 'Jordan Davis', email: 'admin@acme.com', role: 'ADMIN', joined: 'Jan 2024', online: true },
  { id: '2', name: 'Sam Park', email: 'sam@acme.com', role: 'MEMBER', joined: 'Feb 2024', online: true },
  { id: '3', name: 'Alex Chen', email: 'alex@acme.com', role: 'MEMBER', joined: 'Mar 2024', online: false },
  { id: '4', name: 'Riley Kim', email: 'riley@acme.com', role: 'VIEWER', joined: 'Apr 2024', online: true },
  { id: '5', name: 'Morgan Lee', email: 'morgan@acme.com', role: 'ADMIN', joined: 'May 2024', online: false },
];
const roleColor: any = { ADMIN: 'var(--purple)', MEMBER: 'var(--accent)', VIEWER: 'var(--amber)' };
const roleBg: any = { ADMIN: 'var(--purple-bg)', MEMBER: 'var(--accent-bg)', VIEWER: 'var(--amber-bg)' };

export function MembersPage() {
  const [members, setMembers] = useState(MOCK_MEMBERS);
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ email: '', name: '', role: 'MEMBER' });

  const filtered = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()));

  const doInvite = () => {
    if (!invite.email || !invite.name) { toast.error('Email and name required'); return; }
    setMembers(prev => [...prev, { id: Date.now().toString(), name: invite.name, email: invite.email, role: invite.role, joined: 'Now', online: false }]);
    setShowInvite(false);
    setInvite({ email: '', name: '', role: 'MEMBER' });
    toast.success(`Invite sent to ${invite.email}`);
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 600 }}>Members</h1><p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Manage your organization's team.</p></div>
        <button style={btn()} onClick={() => setShowInvite(true)}>+ Invite member</button>
      </div>
      <input style={{ ...input, width: 240, marginBottom: 14 }} placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {filtered.map(m => {
          const initials = m.name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
          return (
            <div key={m.id} style={{ ...card, transition: 'border-color .15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>{initials}</div>
                  {m.online && <div style={{ width: 8, height: 8, background: 'var(--green)', borderRadius: '50%', border: '2px solid var(--bg2)', position: 'absolute', bottom: 0, right: 0 }} />}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ background: roleBg[m.role], color: roleColor[m.role], borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 500 }}>{m.role}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>Joined {m.joined}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{ ...btn('var(--bg3)', 'var(--text)'), flex: 1, justifyContent: 'center', fontSize: 11 }} onClick={() => toast.success('Edit coming soon')}>Edit</button>
                <button style={{ ...btn('var(--red-bg)', 'var(--red)'), fontSize: 11 }} onClick={() => { setMembers(prev => prev.filter(x => x.id !== m.id)); toast.success('Removed'); }}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>

      {showInvite && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }} onClick={() => setShowInvite(false)}>
          <div style={{ ...card, width:400, padding:24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:20, display:'flex', justifyContent:'space-between' }}>Invite member<span style={{ cursor:'pointer', color:'var(--text3)' }} onClick={() => setShowInvite(false)}>✕</span></div>
            <div style={{ marginBottom:12 }}><label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Name</label><input style={input} placeholder="Full name" value={invite.name} onChange={e => setInvite({...invite,name:e.target.value})} /></div>
            <div style={{ marginBottom:12 }}><label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Email</label><input style={input} type="email" placeholder="colleague@company.com" value={invite.email} onChange={e => setInvite({...invite,email:e.target.value})} /></div>
            <div style={{ marginBottom:20 }}><label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Role</label>
              <select style={{ ...input, cursor:'pointer' }} value={invite.role} onChange={e => setInvite({...invite,role:e.target.value})}>
                <option value="MEMBER">Member</option><option value="ADMIN">Admin</option><option value="VIEWER">Viewer</option>
              </select>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button style={btn('var(--bg3)','var(--text)')} onClick={() => setShowInvite(false)}>Cancel</button>
              <button style={btn()} onClick={doInvite}>Send invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── FILES ─────────────────────────────────────────────────────────────────
const MOCK_FILES = [
  { id:'1', name:'brand-assets.zip', type:'zip', size:'14.2 MB', date:'Jul 10' },
  { id:'2', name:'Q2-report.pdf', type:'pdf', size:'2.8 MB', date:'Jul 9' },
  { id:'3', name:'hero-banner.png', type:'image', size:'1.4 MB', date:'Jul 9' },
  { id:'4', name:'product-demo.mp4', type:'video', size:'48 MB', date:'Jul 8' },
  { id:'5', name:'api-docs.pdf', type:'pdf', size:'890 KB', date:'Jul 7' },
  { id:'6', name:'team-photo.jpg', type:'image', size:'3.2 MB', date:'Jul 6' },
  { id:'7', name:'roadmap.xlsx', type:'doc', size:'540 KB', date:'Jul 5' },
];
const fileIcon: any = { zip:'📦', pdf:'📄', image:'🖼️', video:'🎬', doc:'📊' };

export function FilesPage() {
  const [files, setFiles] = useState(MOCK_FILES);
  const [drag, setDrag] = useState(false);

  const simulateUpload = () => {
    toast.loading('Uploading to Cloudinary...');
    setTimeout(() => {
      toast.dismiss();
      setFiles(prev => [{ id: Date.now().toString(), name: `upload-${Date.now()}.png`, type: 'image', size: '2.1 MB', date: 'Now' }, ...prev]);
      toast.success('File uploaded successfully');
    }, 1500);
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 600 }}>Files</h1><p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Upload and manage files via Cloudinary CDN.</p></div>
        <button style={btn()} onClick={simulateUpload}>↑ Upload file</button>
      </div>
      <div
        style={{ border: `2px dashed ${drag ? 'var(--accent)' : 'var(--border-strong)'}`, borderRadius: 12, padding: 32, textAlign: 'center', marginBottom: 16, cursor: 'pointer', background: drag ? 'var(--accent-bg)' : 'transparent', transition: 'all .15s', color: drag ? 'var(--accent)' : 'var(--text2)' }}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); simulateUpload(); }}
        onClick={simulateUpload}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>☁️</div>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>Drop files here or click to upload</div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>Images, PDFs, videos, ZIP · Max 50MB · Stored via Cloudinary CDN</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 10 }}>
        {files.map(f => (
          <div key={f.id} style={{ ...card, textAlign: 'center', cursor: 'pointer', padding: 14 }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{fileIcon[f.type] || '📎'}</div>
            <div style={{ fontSize: 11, wordBreak: 'break-all', lineHeight: 1.4 }}>{f.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{f.size} · {f.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AUDIT ─────────────────────────────────────────────────────────────────
const AUDIT_DATA = [
  { icon:'🔑', bg:'var(--accent-bg)', actor:'Jordan Davis', action:'Logged in', detail:'192.168.1.1 · Chrome/Windows', time:'2 min ago', type:'login' },
  { icon:'✏️', bg:'var(--bg3)', actor:'Sam Park', action:'Updated project: API Revamp', detail:'Changed status to In Review', time:'14 min ago', type:'update' },
  { icon:'👤', bg:'var(--purple-bg)', actor:'Jordan Davis', action:'Invited riley@acme.com', detail:'Role: Viewer', time:'1 hr ago', type:'invite' },
  { icon:'📄', bg:'var(--bg3)', actor:'Alex Chen', action:'Uploaded brand-assets.zip', detail:'14.2 MB via Cloudinary', time:'2 hr ago', type:'create' },
  { icon:'🗑️', bg:'var(--red-bg)', actor:'Morgan Lee', action:'Deleted project: Old Campaign', detail:'Permanent deletion', time:'5 hr ago', type:'delete' },
  { icon:'🔧', bg:'var(--amber-bg)', actor:'Jordan Davis', action:'Updated billing plan', detail:'Upgraded to Enterprise', time:'1 day ago', type:'billing' },
  { icon:'🔑', bg:'var(--accent-bg)', actor:'Taylor Nguyen', action:'Generated API key', detail:'Production environment', time:'1 day ago', type:'api' },
  { icon:'👥', bg:'var(--green-bg)', actor:'Sam Park', action:'Changed member role', detail:'Alex Chen: Member → Admin', time:'2 days ago', type:'role' },
];

export function AuditPage() {
  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 600 }}>Audit logs</h1><p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Full activity trail for your organization.</p></div>
        <button style={btn('var(--bg3)', 'var(--text)')} onClick={() => toast.success('Exporting...')}>↓ Export CSV</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <select style={{ ...input, width: 160, cursor: 'pointer' }}><option>All actors</option></select>
        <select style={{ ...input, width: 160, cursor: 'pointer' }}><option>All actions</option></select>
        <select style={{ ...input, width: 160, cursor: 'pointer' }}><option>Last 7 days</option><option>Last 30 days</option></select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {AUDIT_DATA.map((a, i) => (
          <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{a.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--text)' }}><strong>{a.actor}</strong> {a.action}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{a.detail}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.time}</div>
              <span style={{ background: 'var(--bg4)', color: 'var(--text3)', borderRadius: 4, padding: '1px 6px', fontSize: 10, marginTop: 3, display: 'inline-block' }}>{a.type}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SETTINGS ──────────────────────────────────────────────────────────────
export function SettingsPage() {
  const { user, tenant } = useAuth();
  const [tab, setTab] = useState('general');
  const tabs = ['general', 'security', 'notifications', 'billing', 'api'];

  return (
    <div>
      <div style={{ marginBottom: 20 }}><h1 style={{ fontSize: 20, fontWeight: 600 }}>Settings</h1><p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Manage your workspace and account preferences.</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tabs.map(t => (
            <button key={t} style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: 'none', background: tab === t ? 'var(--accent-bg)' : 'none', color: tab === t ? 'var(--accent)' : 'var(--text2)', textTransform: 'capitalize' }} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <div>
          {tab === 'general' && (
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Organization profile</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>Update your organization's name and settings.</div>
              <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Organization name</label><input style={input} defaultValue={tenant?.name} /></div>
              <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Slug</label><input style={input} defaultValue={tenant?.slug} /></div>
              <div style={{ marginBottom: 16 }}><label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Your name</label><input style={input} defaultValue={user?.name} /></div>
              <button style={btn()} onClick={() => toast.success('Settings saved')}>Save changes</button>
            </div>
          )}
          {tab === 'security' && (
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Security</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>Configure authentication and access policies.</div>
              {[['Two-factor authentication','Require 2FA for all members',true],['SSO / SAML','Enterprise single sign-on',false],['Session timeout','Auto-logout after 30 min',true]].map(([l,d,on]) => (
                <div key={l as string} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                  <div><div style={{ fontSize:13 }}>{l as string}</div><div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{d as string}</div></div>
                  <div style={{ width:36, height:20, background:on?'var(--accent)':'var(--bg4)', borderRadius:20, position:'relative', cursor:'pointer', flexShrink:0 }}>
                    <div style={{ width:14, height:14, background:on?'#fff':'var(--text3)', borderRadius:'50%', position:'absolute', top:3, left:on?'auto':3, right:on?3:'auto', transition:'.2s' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'notifications' && (
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Notifications</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>Control when and how you're notified.</div>
              {[['Email digests','Daily summary of activity',true],['Real-time alerts','Instant push notifications',true],['Slack integration','Post to #general channel',false]].map(([l,d,on]) => (
                <div key={l as string} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                  <div><div style={{ fontSize:13 }}>{l as string}</div><div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{d as string}</div></div>
                  <div style={{ width:36, height:20, background:on?'var(--accent)':'var(--bg4)', borderRadius:20, position:'relative', cursor:'pointer', flexShrink:0 }}>
                    <div style={{ width:14, height:14, background:on?'#fff':'var(--text3)', borderRadius:'50%', position:'absolute', top:3, left:on?'auto':3, right:on?3:'auto', transition:'.2s' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'billing' && (
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Billing</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>Manage your subscription.</div>
              <div style={{ background:'var(--purple-bg)', border:'1px solid var(--purple)', borderRadius:8, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div><div style={{ fontWeight:600, color:'var(--purple)' }}>{tenant?.plan || 'Enterprise'} Plan</div><div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>Unlimited members · 500GB storage · Priority support</div></div>
                <div style={{ fontSize:18, fontWeight:700 }}>$499<span style={{ fontSize:12, fontWeight:400, color:'var(--text3)' }}>/mo</span></div>
              </div>
              <button style={btn('var(--bg3)','var(--text)')}>Manage subscription</button>
            </div>
          )}
          {tab === 'api' && (
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>API Keys</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>Manage programmatic access to your workspace.</div>
              {[{name:'Production key',key:'nxa_live_••••••••••••••••',active:true},{name:'Development key',key:'nxa_test_••••••••••••••••',active:false}].map(k => (
                <div key={k.name} style={{ display:'flex', alignItems:'center', gap:10, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', marginBottom:8 }}>
                  <div style={{ flex:1 }}><div style={{ fontSize:12, fontWeight:500 }}>{k.name}</div><div style={{ fontSize:11, color:'var(--text3)', fontFamily:'monospace', marginTop:2 }}>{k.key}</div></div>
                  <span style={{ background:k.active?'var(--green-bg)':'var(--amber-bg)', color:k.active?'var(--green)':'var(--amber)', borderRadius:20, padding:'2px 8px', fontSize:11 }}>{k.active?'Active':'Dev'}</span>
                  <button style={{ ...btn('var(--red-bg)','var(--red)'), fontSize:11 }} onClick={() => toast.error('Key revoked')}>Revoke</button>
                </div>
              ))}
              <button style={{ ...btn(), marginTop:8 }} onClick={() => toast.success('API key generated')}>+ Generate key</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
