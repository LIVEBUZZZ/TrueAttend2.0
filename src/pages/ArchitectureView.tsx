import { useState } from 'react';
import {
  ArrowRight,
  Boxes,
  Database,
  Fingerprint,
  Info,
  LayoutDashboard,
  MonitorSmartphone,
  QrCode,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { Badge, Card, CardHeader } from '../components/ui';
import { cx } from '../lib/utils';

interface NodeDef {
  id: string;
  label: string;
  icon: typeof QrCode;
  accent: string;
  tagline: string;
  description: string;
  responsibilities: string[];
  io: { label: string; value: string }[];
  failureModes: string[];
  tech: string;
}

const NODES: NodeDef[] = [
  {
    id: 'student-client',
    label: 'Student Client',
    icon: MonitorSmartphone,
    accent: 'text-primary-600 bg-primary-50',
    tagline: 'Captures the check-in',
    description:
      'The mobile-first client students use to discover live sessions, submit the session token or scanned QR, run an on-device face check, and receive a digital receipt.',
    responsibilities: [
      'List live sessions the student is enrolled in',
      'Capture the 6-character token or QR scan',
      'Run the on-device biometric check under an explicit consent notice',
      'Render the timestamped “Attendance Verified” receipt',
    ],
    io: [
      { label: 'Sends', value: 'check-in request { sessionId | token, identity proof }' },
      { label: 'Receives', value: 'attendance record + receipt' },
    ],
    failureModes: ['Camera unavailable → simulated match fallback'],
    tech: 'React · TypeScript · Tailwind · getUserMedia',
  },
  {
    id: 'session-gateway',
    label: 'Session Gateway',
    icon: QrCode,
    accent: 'text-sky-600 bg-sky-50',
    tagline: 'Validates the session',
    description:
      'Resolves the session reference and checks its lifecycle before any identity work happens. A session is only usable while it is active and inside its countdown window.',
    responsibilities: [
      'Resolve the session by id or 6-character token',
      'Reject sessions that do not exist or were already ended',
      'Enforce the countdown expiry window',
      'Surface the session’s verification mode to the next stage',
    ],
    io: [
      { label: 'Input', value: 'sessionId | token' },
      { label: 'Output', value: 'resolved session + verification mode' },
    ],
    failureModes: ['SESSION_NOT_FOUND', 'SESSION_ENDED', 'SESSION_EXPIRED'],
    tech: 'Pure TypeScript domain logic (engine.ts)',
  },
  {
    id: 'identity-verification',
    label: 'Identity Verification',
    icon: Fingerprint,
    accent: 'text-emerald-600 bg-emerald-50',
    tagline: 'Proves who you are',
    description:
      'Confirms the actor is a student and proves identity using whichever mode the instructor selected when the session was launched.',
    responsibilities: [
      'Authorize the actor role (students only)',
      'qr_token — match the dynamic token',
      'credentials — match Student ID against the private PIN',
      'biometric_check — require consent and a successful local face match',
    ],
    io: [
      { label: 'Input', value: 'verification payload for the chosen mode' },
      { label: 'Output', value: 'verified identity assertion' },
    ],
    failureModes: ['UNAUTHORIZED', 'TOKEN_INVALID', 'CREDENTIALS_INVALID', 'BIOMETRIC_DENIED'],
    tech: 'engine.attemptCheckIn',
  },
  {
    id: 'duplicate-guard',
    label: 'Duplicate Guard',
    icon: XCircle,
    accent: 'text-amber-600 bg-amber-50',
    tagline: 'One record, once',
    description:
      'The single most important integrity rule: a strict unique constraint on (student_id, session_id). It is what makes proxy and repeat attendance impossible.',
    responsibilities: [
      'Look up any existing record for the student + session pair',
      'Reject the attempt outright when one exists',
      'Emit a duplicate-blocked entry to the audit log',
    ],
    io: [
      { label: 'Input', value: 'verified identity + session' },
      { label: 'Output', value: 'cleared for insert, or rejected' },
    ],
    failureModes: ['DUPLICATE'],
    tech: 'Unique key enforcement in the storage layer',
  },
  {
    id: 'database',
    label: 'Database',
    icon: Database,
    accent: 'text-indigo-600 bg-indigo-50',
    tagline: 'The ledger of record',
    description:
      'The attendance ledger — the single source of truth for records, sessions, disputes and the audit trail. Verification writes are append-only.',
    responsibilities: [
      'Persist attendance_records with a server-side timestamp',
      'Persist sessions, audit_logs and correction_disputes',
      'Guarantee the unique (student_id, session_id) constraint',
    ],
    io: [
      { label: 'Writes', value: 'attendance_records, audit_logs' },
      { label: 'Reads', value: 'roster, KPIs, history, disputes' },
    ],
    failureModes: ['Storage unavailable → fail soft, never corrupt'],
    tech: 'localStorage adapter now → Supabase/Postgres ready',
  },
  {
    id: 'analytics-audit',
    label: 'Instructor Analytics & Audit',
    icon: LayoutDashboard,
    accent: 'text-slate-700 bg-slate-100',
    tagline: 'Observes and corrects',
    description:
      'Turns the ledger into real-time KPIs, a correction workflow and an immutable audit trail — with a mandatory reason behind every manual change.',
    responsibilities: [
      'Live presence KPIs: total, present, absent, attendance %',
      'Approve or reject student correction disputes',
      'Apply manual overrides only with a written reason',
      'Export CSV and print a summary report',
    ],
    io: [
      { label: 'Reads', value: 'live roster + aggregates' },
      { label: 'Writes', value: 'audit_logs, correction resolutions' },
    ],
    failureModes: ['REASON_REQUIRED — overrides are refused without one'],
    tech: 'Recharts · audit-log writer',
  },
];

export default function ArchitectureView() {
  const [selected, setSelected] = useState<string>(NODES[1].id);
  const node = NODES.find((n) => n.id === selected) ?? NODES[0];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary-600">Evaluation view</p>
        <h1 className="mt-0.5 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
          <Boxes size={22} className="text-primary-600" />
          Architecture Explorer
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          A check-in passes through six deliberate stages. Click any node to inspect its
          responsibilities, inputs and failure modes.
        </p>
      </div>

      {/* Node chain */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {NODES.map((n, i) => {
            const active = n.id === selected;
            return (
              <div key={n.id} className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setSelected(n.id)}
                  className={cx(
                    'flex w-[8.75rem] flex-col items-center gap-2 rounded-xl border px-3 py-3.5 text-center transition',
                    active
                      ? 'border-primary-500 bg-primary-50/60 ring-1 ring-primary-500/30'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <span
                    className={cx(
                      'flex h-10 w-10 items-center justify-center rounded-xl',
                      n.accent,
                    )}
                  >
                    <n.icon size={19} />
                  </span>
                  <span className="text-[11px] font-semibold leading-tight text-slate-700">
                    {n.label}
                  </span>
                  <span className="text-[10px] leading-tight text-slate-400">{n.tagline}</span>
                </button>
                {i < NODES.length - 1 ? (
                  <ArrowRight size={16} className="hidden shrink-0 text-slate-300 sm:block" />
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Detail */}
      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader
            icon={<node.icon size={16} />}
            title={node.label}
            subtitle={node.tagline}
            action={<Badge tone="primary">Stage {NODES.findIndex((n) => n.id === node.id) + 1} / 6</Badge>}
          />
          <div className="space-y-5 p-5">
            <p className="text-sm leading-relaxed text-slate-600">{node.description}</p>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Responsibilities
              </h4>
              <ul className="mt-2 space-y-2">
                {node.responsibilities.map((r) => (
                  <li key={r} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {node.io.map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-700">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <ShieldAlert size={16} className="text-pending-600" />
              Failure modes guarded
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {node.failureModes.map((f) => (
                <span
                  key={f}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-600"
                >
                  {f}
                </span>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Info size={16} className="text-primary-600" />
              Implementation
            </h3>
            <p className="mt-2 text-sm text-slate-600">{node.tech}</p>
          </Card>

          <Card className="border-primary-100 bg-primary-50/50 p-5">
            <h3 className="text-sm font-bold text-slate-900">End-to-end flow</h3>
            <ol className="mt-3 space-y-2 text-xs text-slate-600">
              <li>1 · Instructor launches a session → a rotating token is minted.</li>
              <li>2 · Student submits the code → the gateway validates the window.</li>
              <li>3 · Identity is proven in the session’s mode.</li>
              <li>4 · The duplicate guard enforces one record per session.</li>
              <li>5 · The ledger is written and a receipt is issued.</li>
              <li>6 · Instructors monitor, correct (with a reason) and audit.</li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
