import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Boxes,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  RotateCcw,
  X,
} from 'lucide-react';
import { Logo } from './Logo';
import { Avatar, Button } from './ui';
import { useApp } from '../context/AppContext';
import { cx } from '../lib/utils';

function navItems(role?: string) {
  return [
    {
      to: role === 'instructor' ? '/instructor' : '/student',
      label: role === 'instructor' ? 'Instructor Console' : 'Student Portal',
      icon: LayoutDashboard,
    },
    { to: '/architecture', label: 'Architecture', icon: Boxes },
    { to: '/edge-cases', label: 'Edge-Case Suite', icon: FlaskConical },
  ];
}

export function AppLayout() {
  const { currentUser, logout, resetDemo } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = navItems(currentUser?.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur no-print">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to={currentUser?.role === 'instructor' ? '/instructor' : '/student'}>
              <Logo size={30} />
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )
                  }
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="hidden items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 sm:flex">
                <Avatar name={currentUser.name} color={currentUser.avatarColor} size={28} />
                <span className="leading-tight">
                  <span className="block text-xs font-semibold text-slate-800">
                    {currentUser.name}
                  </span>
                  <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    {currentUser.role}
                  </span>
                </span>
              </div>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => {
                resetDemo();
                navigate(0);
              }}
              title="Reset demo data to its seeded state"
            >
              <RotateCcw size={15} />
              Reset demo
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={handleLogout}>
              <LogOut size={15} />
              Sign out
            </Button>
            <button
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {open ? (
          <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium',
                      isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100',
                    )
                  }
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  resetDemo();
                  navigate(0);
                }}
              >
                <RotateCcw size={15} />
                Reset
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={handleLogout}>
                <LogOut size={15} />
                Sign out
              </Button>
            </div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 no-print">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-400 sm:px-6">
          TrueAttend — Clear &amp; Authentic Attendance · © 2026 TrueAttend
        </div>
      </footer>
    </div>
  );
}
