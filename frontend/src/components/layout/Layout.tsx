import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '▦', end: true },
  { to: '/analytics', label: 'Analytics', icon: '↗' },
  { to: '/live', label: 'Live Feed', icon: '◉' },
  { to: '/projects', label: 'Projects', icon: '◫' },
  { to: '/members', label: 'Members', icon: '◎' },
  { to: '/files', label: 'Files', icon: '◱' },
  { to: '/audit', label: 'Audit Logs', icon: '≡' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export default function Layout() {
  const { user, tenant, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(true);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Logged out');
  };

  const toggleTheme = () => {
    setDark(!dark);
    document.documentElement.classList.toggle('light');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 56 : 220, background: 'var(--bg2)',
        borderRight: '1px solid var(--border)', display: 'flex',
        flexDirection: 'column', flexShrink: 0, transition: 'width .25s',
      }}>
        {/* Logo */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 13, flexShrink: 0 }}>N</div>
          {!collapsed && <span style={{ fontWeight: 600, fontSize: 14 }}>NexaOS</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 16px', fontSize: 13, textDecoration: 'none',
                color: isActive ? 'var(--accent)' : 'var(--text2)',
                background: isActive ? 'var(--accent-bg)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                transition: 'all .15s', whiteSpace: 'nowrap', overflow: 'hidden',
              })}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: 10, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, cursor: 'pointer' }}
            onClick={handleLogout} title="Click to logout">
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
            {!collapsed && (
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{user?.role} · {tenant?.name}</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{ height: 52, background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0 }}>
          <button onClick={() => setCollapsed(!collapsed)}
            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 16 }}>
            ☰
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ background: 'var(--purple-bg)', border: '1px solid var(--purple)', color: 'var(--purple)', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>
            🏢 {tenant?.name}
          </div>
          <button onClick={toggleTheme}
            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 14 }}>
            {dark ? '☀' : '☾'}
          </button>
          <button onClick={handleLogout}
            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text2)', cursor: 'pointer' }}>
            Logout
          </button>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
