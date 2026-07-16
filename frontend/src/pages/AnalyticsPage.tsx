// AnalyticsPage.tsx
import React from 'react';
export default function AnalyticsPage() {
  const card = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 };
  const metrics = [
    { label: 'Avg session', value: '4m 32s', color: 'var(--accent)', delta: '↑ 22%' },
    { label: 'Conversion', value: '3.8%', color: 'var(--green)', delta: '↑ 0.4pp' },
    { label: 'Churn rate', value: '1.2%', color: 'var(--red)', delta: '↓ 0.3pp' },
    { label: 'NPS score', value: '72', color: 'var(--purple)', delta: '↑ +8 pts' },
  ];
  const tenants = [
    { name: 'Acme Corp', plan: 'Enterprise', users: 247, storage: '18.4 GB', calls: '1.2M', status: 'Healthy' },
    { name: 'TechStart Inc', plan: 'Pro', users: 84, storage: '6.1 GB', calls: '340K', status: 'Healthy' },
    { name: 'BuildCo Ltd', plan: 'Pro', users: 56, storage: '4.8 GB', calls: '218K', status: 'Degraded' },
    { name: 'MediaGroup', plan: 'Team', users: 31, storage: '2.2 GB', calls: '98K', status: 'Healthy' },
  ];
  const statusColor: any = { Healthy: 'var(--green)', Degraded: 'var(--amber)', Issues: 'var(--red)' };
  const statusBg: any = { Healthy: 'var(--green-bg)', Degraded: 'var(--amber-bg)', Issues: 'var(--red-bg)' };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Analytics</h1>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Detailed insights for your workspace.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {metrics.map(m => (
          <div key={m.label} style={card}>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 3 }}>{m.delta}</div>
          </div>
        ))}
      </div>
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Top tenants by usage</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Organization','Plan','Users','Storage','API calls','Status'].map(h => (
              <th key={h} style={{ textAlign:'left', padding:'6px 12px', fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {tenants.map(t => (
              <tr key={t.name} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding:'10px 12px', fontWeight:500, color:'var(--text)' }}>{t.name}</td>
                <td style={{ padding:'10px 12px' }}><span style={{ background:'var(--purple-bg)', color:'var(--purple)', borderRadius:20, padding:'2px 8px', fontSize:11 }}>{t.plan}</span></td>
                <td style={{ padding:'10px 12px', color:'var(--text2)' }}>{t.users}</td>
                <td style={{ padding:'10px 12px', color:'var(--text2)' }}>{t.storage}</td>
                <td style={{ padding:'10px 12px', color:'var(--text2)' }}>{t.calls}</td>
                <td style={{ padding:'10px 12px' }}><span style={{ background:statusBg[t.status], color:statusColor[t.status], borderRadius:20, padding:'2px 8px', fontSize:11 }}>{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
