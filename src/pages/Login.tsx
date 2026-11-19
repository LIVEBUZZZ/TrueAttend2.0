import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  LayoutDashboard,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { Button, Card, Field } from '../components/ui';
import { useApp } from '../context/AppContext';
import { DEMO_INSTRUCTOR_ID, DEMO_STUDENT_ID } from '../lib/seed';
import type { Role } from '../types';
import { cx } from '../lib/utils';

export default function Login() {
  const { currentUser, login, loginAs } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const initialRole = (params.get('role') as Role) || 'student';
  const [role, setRole] = useState<Role>(initialRole === 'instructor' ? 'instructor' : 'student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const redirectFor = (r: Role) => (r === 'instructor' ? '/instructor' : '/student');
  const from = (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    if (currentUser) navigate(redirectFor(currentUser.role), { replace: true });
  }, [currentUser, navigate]);

  // Keep the email field in sync with the selected role's demo account.
  useEffect(() => {
    setEmail(
      role === 'student' ? 'aditya.verma@student.trueattend.app' : 'instructor@trueattend.app',
    );
    setError(null);
  }, [role]);

  const doLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = login(email, role);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Unable to sign in.');
      return;
    }
    navigate(from ?? redirectFor(role), { replace: true });
  };

  const demo = (which: Role) => {
    loginAs(which === 'instructor' ? DEMO_INSTRUCTOR_ID : DEMO_STUDENT_ID);
    navigate(redirectFor(which), { replace: true });
  };

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary-600 p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(30rem 20rem at 80% 0%, rgba(255,255,255,0.25), transparent), radial-gradient(25rem 18rem at 0% 100%, rgba(16,185,129,0.35), transparent)',
          }}
        />
        <Link to="/" className="relative">
          <span className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <ShieldCheck size={20} />
            </span>
            <span className="text-lg font-extrabold tracking-tight">TrueAttend</span>
          </span>
        </Link>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
            Clear Attendance. Stronger Trust.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-primary-100">
            Sign in to the console that verifies identity, records attendance exactly once and
            surfaces it in real time — backed by a permanent audit trail.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-primary-50">
            {[
              'Dynamic QR / Token, Credentials or Face Check',
              'Duplicate and expiry guards on every check-in',
              'Reason-required overrides written to the audit log',
            ].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-verified-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-primary-200">© 2026 TrueAttend</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center bg-slate-50 px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-md">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800 lg:hidden"
          >
            <ArrowLeft size={15} />
            Back to home
          </Link>

          <div className="mb-8 lg:hidden">
            <Logo size={34} withTagline />
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Sign in to your TrueAttend workspace, or jump straight into a demo.
          </p>

          {/* One-click demo switcher */}
          <Card className="mt-6 border-primary-100 bg-primary-50/50 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600 text-white">
                <Zap size={14} />
              </span>
              <p className="text-sm font-bold text-slate-900">One-click demo switcher</p>
              <span className="ta-chip ml-auto bg-white text-primary-700">
                <Sparkles size={12} />
                No setup
              </span>
            </div>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <Button variant="outline" className="justify-start" onClick={() => demo('student')}>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-verified-50 text-verified-600">
                  <GraduationCap size={15} />
                </span>
                <span className="text-left leading-tight">
                  <span className="block text-sm font-semibold text-slate-900">Demo Student</span>
                  <span className="block text-[11px] font-normal text-slate-500">Aditya Verma</span>
                </span>
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => demo('instructor')}>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <LayoutDashboard size={15} />
                </span>
                <span className="text-left leading-tight">
                  <span className="block text-sm font-semibold text-slate-900">Demo Instructor</span>
                  <span className="block text-[11px] font-normal text-slate-500">Dr. Rajesh Kumar</span>
                </span>
              </Button>
            </div>
          </Card>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              or sign in
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Role toggle */}
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {(['student', 'instructor'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cx(
                  'flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold capitalize transition',
                  role === r ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                {r === 'student' ? <GraduationCap size={15} /> : <LayoutDashboard size={15} />}
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={doLogin} className="mt-4 space-y-4">
            <Field label="Email address">
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@trueattend.app"
                  className="ta-input pl-9"
                  autoComplete="email"
                />
              </div>
            </Field>
            <Field label="Password" hint="Demo mode accepts any value — this is not a real credential check.">
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="ta-input pl-9"
                  autoComplete="current-password"
                />
              </div>
            </Field>

            {error ? (
              <p className="rounded-lg border border-rejected-100 bg-rejected-50 px-3 py-2 text-sm text-rejected-700">
                {error}
              </p>
            ) : null}

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              Sign in as {role}
              <ArrowRight size={17} />
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-400">
            Accounts are pre-seeded and stored locally in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
