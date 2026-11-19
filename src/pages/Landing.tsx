import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  ClipboardCheck,
  Clock3,
  Database,
  FileSearch,
  Fingerprint,
  Gauge,
  LayoutDashboard,
  Lock,
  MonitorSmartphone,
  QrCode,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { Badge, Button, Card } from '../components/ui';
import { cx } from '../lib/utils';

const STEPS = [
  {
    key: 'verify',
    title: 'Verify',
    tagline: 'Prove identity, once per session.',
    icon: ShieldCheck,
    accent: 'text-primary-600 bg-primary-50',
    ring: 'ring-primary-500/30',
    summary:
      'Every check-in is gated behind a mode the instructor chooses — a Dynamic QR/Token, Student ID + PIN credentials, or an on-device webcam face check with explicit consent.',
    points: [
      { icon: QrCode, text: 'Dynamic 6-character token that rotates every session' },
      { icon: UserCheck, text: 'Credentials mode validates Student ID against a private PIN' },
      { icon: Fingerprint, text: 'Face check runs on-device with Privacy-by-Design consent' },
    ],
    eliminates: 'Kills proxy attendance — a code alone is never enough when the session demands identity proof.',
  },
  {
    key: 'record',
    title: 'Record',
    tagline: 'Write it down exactly once.',
    icon: Database,
    accent: 'text-verified-600 bg-verified-50',
    ring: 'ring-verified-500/30',
    summary:
      'A verified check-in is written to the attendance ledger with a unique (student, session) constraint, an immutable timestamp and the verification method used.',
    points: [
      { icon: Clock3, text: 'Server-timestamped the moment verification succeeds' },
      { icon: XCircle, text: 'Duplicate attempts for the same session are rejected outright' },
      { icon: ScrollText, text: 'Every write is mirrored into an append-only audit log' },
    ],
    eliminates: 'Removes clerical errors — no re-typing, no double entries, no lost sheets of paper.',
  },
  {
    key: 'monitor',
    title: 'Monitor',
    tagline: 'See the room as it fills.',
    icon: LayoutDashboard,
    accent: 'text-pending-600 bg-pending-50',
    ring: 'ring-pending-500/30',
    summary:
      'Instructors watch presence in real time, resolve correction disputes, and — when they must intervene — record a reason that permanently lands in the audit trail.',
    points: [
      { icon: Gauge, text: 'Live KPIs: present, absent and attendance rate' },
      { icon: FileSearch, text: 'Approve or reject student correction requests' },
      { icon: BadgeCheck, text: 'Manual overrides require a mandatory written reason' },
    ],
    eliminates: 'Ends manual roll calls — attendance is a live dashboard, not a 10-minute interruption.',
  },
] as const;

const STATS = [
  { value: '0', label: 'Manual roll calls needed' },
  { value: '100%', label: 'Check-ins written to the audit log' },
  { value: '3', label: 'Verification modes' },
  { value: '<1s', label: 'To reject a duplicate' },
];

const SECURITY = [
  {
    icon: Lock,
    title: 'Role-scoped access',
    text: 'Students can only check in; instructors alone can override or resolve disputes. Every route is guarded by role.',
  },
  {
    icon: XCircle,
    title: 'Duplicate guard',
    text: 'A strict unique constraint on (student, session) makes a second check-in impossible, even from a second device.',
  },
  {
    icon: Clock3,
    title: 'Expiring tokens',
    text: 'Session tokens die on a countdown. Late or shared codes are refused after the window closes.',
  },
  {
    icon: ScrollText,
    title: 'Immutable audit trail',
    text: 'Overrides cannot be saved without a reason, and each one is stamped with actor, target and timestamp.',
  },
  {
    icon: Fingerprint,
    title: 'Privacy-by-Design biometrics',
    text: 'Face checks run locally with an explicit consent notice — no frames are stored, only the match result.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Transparent receipts',
    text: 'Students receive a timestamped digital receipt for every verified check-in, verifiable against the ledger.',
  },
];

export default function Landing() {
  const [active, setActive] = useState<(typeof STEPS)[number]['key']>('verify');
  const activeStep = STEPS.find((s) => s.key === active) ?? STEPS[0];

  return (
    <div className="min-h-full bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <Logo size={30} />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#workflow" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
              Workflow
            </a>
            <a href="#architecture" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
              Architecture
            </a>
            <a href="#security" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
              Security
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login?role=student">
              <Button variant="outline" size="sm">
                <Users size={15} />
                Student Portal
              </Button>
            </Link>
            <Link to="/login?role=instructor">
              <Button size="sm">
                <LayoutDashboard size={15} />
                Instructor Console
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              'radial-gradient(60rem 30rem at 75% -10%, rgba(79,70,229,0.10), transparent), radial-gradient(45rem 28rem at 5% 10%, rgba(16,185,129,0.08), transparent)',
          }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-in">
            <Badge tone="primary" className="mb-5">
              <Sparkles size={13} />
              Verify → Record → Monitor
            </Badge>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Clear Attendance.
              <br />
              <span className="text-primary-600">Stronger Trust.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              TrueAttend replaces the manual roll call with a verify-once, record-exactly-once,
              monitor-in-real-time workflow. Dynamic tokens, duplicate guards and an immutable audit
              trail make every attendance record defensible.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login?role=instructor">
                <Button size="lg">
                  Launch Instructor Console
                  <ArrowRight size={17} />
                </Button>
              </Link>
              <Link to="/login?role=student">
                <Button size="lg" variant="outline">
                  Open Student Portal
                </Button>
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck size={14} className="text-verified-600" />
                Works instantly — pre-seeded demo data
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-primary-600" />
                Zero setup
              </span>
            </div>
          </div>

          {/* Product preview */}
          <div className="animate-fade-in lg:pl-4">
            <Card className="overflow-hidden shadow-pop">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-xs font-semibold text-slate-600">Live Session · CS-201</span>
                <Badge tone="verified">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-verified-500" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-verified-500" />
                  </span>
                  Live
                </Badge>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Session code
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tracking-[0.25em] text-slate-900">
                    K7M2QF
                  </p>
                  <p className="mt-2 text-xs text-slate-500">Expires in 09:00</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { k: 'Present', v: '4' },
                    { k: 'Absent', v: '6' },
                    { k: 'Rate', v: '40%' },
                    { k: 'Roster', v: '10' },
                  ].map((s) => (
                    <div key={s.k} className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {s.k}
                      </p>
                      <p className="text-lg font-bold tabular text-slate-900">{s.v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 border-t border-slate-200 p-5">
                {[
                  ['Rohan Gupta', 'STU-1003'],
                  ['Sneha Reddy', 'STU-1006'],
                  ['Meera Nair', 'STU-1008'],
                ].map(([name, id]) => (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">
                        {name.split(' ').map((n) => n[0]).join('')}
                      </span>
                      {name}
                    </span>
                    <Badge tone="verified">
                      <BadgeCheck size={12} />
                      Verified
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative border-y border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-slate-200 px-4 sm:px-6 lg:grid-cols-4 lg:divide-x">
            {STATS.map((s) => (
              <div key={s.label} className="px-2 py-6 text-center lg:px-6">
                <p className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {s.value}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="neutral" className="mb-4">
            The workflow
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Three steps. Every time.
          </h2>
          <p className="mt-4 text-slate-600">
            Tap a stage to see what it does and which real-world problem it removes.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => {
            const isActive = step.key === active;
            return (
              <button
                key={step.key}
                onClick={() => setActive(step.key)}
                className={cx(
                  'group rounded-xl border bg-white p-5 text-left transition',
                  isActive
                    ? cx('border-transparent ring-2 shadow-pop', step.ring)
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-card',
                )}
              >
                <span
                  className={cx(
                    'flex h-11 w-11 items-center justify-center rounded-xl',
                    step.accent,
                  )}
                >
                  <step.icon size={20} />
                </span>
                <h3 className="mt-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                  {step.title}
                  {isActive ? <ArrowRight size={16} className="text-slate-400" /> : null}
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-500">{step.tagline}</p>
              </button>
            );
          })}
        </div>

        <Card className="mt-6 overflow-hidden">
          <div className="grid gap-6 p-6 lg:grid-cols-2 lg:p-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{activeStep.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{activeStep.summary}</p>
              <div className="mt-4 rounded-lg border border-primary-100 bg-primary-50/60 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                  What it eliminates
                </p>
                <p className="mt-1.5 text-sm text-slate-700">{activeStep.eliminates}</p>
              </div>
            </div>
            <ul className="space-y-3">
              {activeStep.points.map((p) => (
                <li
                  key={p.text}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
                    <p.icon size={15} />
                  </span>
                  <span className="text-sm text-slate-700">{p.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </section>

      {/* Architecture */}
      <section id="architecture" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge tone="neutral" className="mb-4">
                <Boxes size={13} />
                Architecture
              </Badge>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                A pipeline you can click through
              </h2>
              <p className="mt-4 text-slate-600">
                Attendance data flows through six deliberate stages. Each one has a single job, so
                verification stays honest and the ledger stays clean. Open the Architecture Explorer
                to inspect every node in detail.
              </p>
              <ol className="mt-6 space-y-2.5">
                {[
                  'Student Client',
                  'Session Gateway',
                  'Identity Verification',
                  'Duplicate Guard',
                  'Database',
                  'Instructor Analytics & Audit',
                ].map((n, i) => (
                  <li key={n} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{n}</span>
                  </li>
                ))}
              </ol>
              <Link to="/login" className="mt-7 inline-block">
                <Button variant="secondary">
                  <Boxes size={16} />
                  Open Architecture Explorer
                </Button>
              </Link>
            </div>
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-center gap-3">
                {[
                  { icon: MonitorSmartphone, label: 'Student Client' },
                  { icon: QrCode, label: 'Session Gateway' },
                  { icon: Fingerprint, label: 'Identity Verification' },
                  { icon: XCircle, label: 'Duplicate Guard' },
                  { icon: Database, label: 'Database' },
                  { icon: ClipboardCheck, label: 'Analytics & Audit' },
                ].map((node, i, arr) => (
                  <div key={node.label} className="flex items-center gap-3">
                    <div className="flex w-[8.5rem] flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-4 text-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-primary-600 shadow-sm">
                        <node.icon size={17} />
                      </span>
                      <span className="text-[11px] font-semibold leading-tight text-slate-700">
                        {node.label}
                      </span>
                    </div>
                    {i < arr.length - 1 ? (
                      <ArrowRight size={16} className="hidden shrink-0 text-slate-300 sm:block" />
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="neutral" className="mb-4">
            <ShieldCheck size={13} />
            Security &amp; integrity
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Built so records can be trusted
          </h2>
          <p className="mt-4 text-slate-600">
            Every safeguard exists to make an attendance record mean exactly what it says.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECURITY.map((item) => (
            <Card key={item.title} className="p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <item.icon size={19} />
              </span>
              <h3 className="mt-4 text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-2xl bg-primary-600 px-6 py-12 text-center sm:px-12">
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Start with the one-click demo
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-primary-100">
            Jump straight into a pre-seeded course, roster and live session — no setup, no sign-up.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/login?role=instructor">
              <Button variant="secondary" size="lg">
                <LayoutDashboard size={17} />
                Instructor demo
              </Button>
            </Link>
            <Link to="/login?role=student">
              <Button
                size="lg"
                className="bg-white text-primary-700 hover:bg-primary-50"
              >
                <Users size={17} />
                Student demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Logo size={28} withTagline />
          <p className="text-xs text-slate-400">© 2026 TrueAttend. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
