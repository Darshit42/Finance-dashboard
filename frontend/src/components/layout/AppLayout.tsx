import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, LogOut, TrendingUp, Shield
} from 'lucide-react';
import { useAuth } from '../../store/authContext';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    ANALYST: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    VIEWER: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)]">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 shadow-lg shadow-brand-600/25">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)]">FinanceBoard</div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Dashboard</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>
          {(user?.role === 'ANALYST' || user?.role === 'ADMIN') && (
            <NavLink to="/records" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <FileText size={16} />
              Records
            </NavLink>
          )}
          {user?.role === 'ADMIN' && (
            <NavLink to="/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Users size={16} />
              Users
            </NavLink>
          )}
        </nav>

        {/* User block */}
        <div className="border-t border-[var(--border)] p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600/20 text-sm font-bold text-brand-400">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[var(--text-primary)]">{user?.name}</div>
              <div className="truncate text-xs text-[var(--text-muted)]">{user?.email}</div>
            </div>
          </div>
          <div className="mb-3">
            <span className={`badge-role border text-[10px] uppercase tracking-wider ${roleColors[user?.role ?? 'VIEWER']}`}>
              {user?.role === 'ADMIN' && <Shield size={10} />}
              {user?.role}
            </span>
          </div>
          <button onClick={handleLogout} className="btn-secondary w-full text-xs">
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-auto bg-[var(--bg-primary)]">
        {children}
      </main>
    </div>
  );
}
