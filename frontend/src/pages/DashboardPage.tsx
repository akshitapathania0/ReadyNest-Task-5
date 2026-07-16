import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api';

const metrics = [
  { label: 'Total revenue', value: '$84,210', delta: '↑ 12.4%', color: 'var(--green)', bar: 74 },
  { label: 'Active users', value: '1,247', delta: '↑ 8.1%', color: 'var(--accent)', bar: 62 },
  { label: 'Open tickets', value: '38', delta: '↑ 3 today', color: 'var(--amber)', bar: 38 },
  { label: 'Uptime', value: '99.9%', delta: '↑ SLA OK', color: 'var(--purple)', bar: 99 },
];

const barData = [
  { month: 'Jan', value: 42 }, { month: 'Feb', value: 58 }, { month: 'Mar', value: 35 },
  { month: 'Apr', value: 71 }, { month: 'May', value: 63 }, { month: 'Jun', value: 80 },
  { month: 'Jul', value: 55 }, { month: 'Aug', value: 84 },
];

const recentProjects = [
  { name: 'Marketing Hub', status: 'Active', members: 8, progress: 72 },
  { name: 'API Revamp', status: 'In Review', members: 5, progress: 45 },
  { name: 'Mobile App v3', status: 'Planning', members: 12, progress: 18 },
  { name: 'Data Pipeline', status: 'Active', members: 4, progress: 91 },
];

const statusColor: Record<string, string> = {
  'Active': 'var(--green)', 'In Review': 'var(--amber)', 'Planning': 'var(--accent)', 'Completed': 'var(--purple)',
};
const statusBg: Record<string, string> = {
  'Active': 'var(--green-bg)', 'In Review': 'var(--amber-bg)', 'Planning': 'var(--accent-bg)', 'Completed': 'var(--purple-bg)',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';

  const card = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Good morning, {firstName} 👋</h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Here's what's happening in your workspace today.</p>
        </div>
        <button style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          + New project
        </button>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {metrics.map(m => (
          <div key={m.label} style={card}>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 3 }}>{m.delta}</div>
            <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${m.bar}%`, background: m.color, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 20 }}>
        {/* Bar chart */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            Revenue trend
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>Last 8 months</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, paddingBottom: 20 }}>
            {barData.map(b => (
              <div key={b.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                  <div style={{ width: '100%', height: `${(b.value / 84) * 100}%`, background: 'var(--accent)', borderRadius: '3px 3px 0 0', minHeight: 4, cursor: 'pointer', transition: 'opacity .15s' }}
                    title={`$${b.value}K`} onMouseEnter={e => (e.currentTarget.style.opacity = '.7')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')} />
                </div>
                <span style={{ fontSize: 9, color: 'var(--text3)' }}>{b.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Plan breakdown</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <svg width="90" height="90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--bg3)" strokeWidth="18" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--accent)" strokeWidth="18" strokeDasharray="142 97" strokeDashoffset="0" transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--purple)" strokeWidth="18" strokeDasharray="68 171" strokeDashoffset="-142" transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--green)" strokeWidth="18" strokeDasharray="29 210" strokeDashoffset="-210" transform="rotate(-90 50 50)" />
              <text x="50" y="55" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)">1.2k</text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[['var(--accent)', 'Pro', '60%'], ['var(--purple)', 'Team', '29%'], ['var(--green)', 'Enterprise', '11%']].map(([c, l, p]) => (
                <div key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c as string }} />
                  <span style={{ flex: 1, color: 'var(--text2)' }}>{l as string}</span>
                  <span style={{ fontWeight: 600 }}>{p as string}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent projects */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Recent projects</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Project', 'Status', 'Members', 'Progress'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentProjects.map(p => (
              <tr key={p.name} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--text)' }}>{p.name}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ background: statusBg[p.status], color: statusColor[p.status], borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 500 }}>{p.status}</span>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>{p.members}</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${p.progress}%`, background: p.progress > 70 ? 'var(--green)' : 'var(--accent)', borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 28 }}>{p.progress}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
