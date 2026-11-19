import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  CheckCircle2,
  CircleSlash,
  Clock3,
  FlaskConical,
  Info,
  Play,
  RotateCcw,
  ScrollText,
  ShieldAlert,
  UserRoundPen,
  XCircle,
} from 'lucide-react';
import { Badge, Button, Card, CardHeader } from '../components/ui';
import { attemptCheckIn, createSession, manualOverride } from '../lib/engine';
import { buildSeedDatabase, DEMO_INSTRUCTOR_ID, DEMO_STUDENT_ID } from '../lib/seed';
import type { Database } from '../types';
import { cx } from '../lib/utils';

interface Assertion {
  label: string;
  expected: string;
  actual: string;
  pass: boolean;
}
interface TestOutcome {
  pass: boolean;
  assertions: Assertion[];
}
interface Scenario {
  id: string;
  name: string;
  icon: LucideIcon;
  scenario: string;
  run: () => TestOutcome;
}
interface TestResult extends Omit<Scenario, 'run'> {
  pass: boolean;
  assertions: Assertion[];
}

const check = (label: string, expected: string, actual: string): Assertion => ({
  label,
  expected,
  actual,
  pass: expected === actual,
});

/** A throwaway clone with a fresh, unexpired session for the scenario. */
function sandbox(): { db: Database; sessionId: string; token: string } {
  const base = buildSeedDatabase();
  const { db, session } = createSession(base, {
    courseId: 'crs_cs201',
    instructorId: DEMO_INSTRUCTOR_ID,
    verificationMode: 'qr_token',
    durationMinutes: 15,
  });
  return { db, sessionId: session.id, token: session.sessionToken };
}

// --- the five validation scenarios -----------------------------------------

function runValidCheckIn(): TestOutcome {
  const { db: base, sessionId, token } = sandbox();
  const res = attemptCheckIn(base, { actorId: DEMO_STUDENT_ID, sessionId, token });
  const records = res.db.attendanceRecords.filter(
    (r) => r.sessionId === sessionId && r.studentId === DEMO_STUDENT_ID,
  );
  const audit = res.db.auditLogs.filter(
    (l) => l.action === 'attendance_verified' && l.actorId === DEMO_STUDENT_ID,
  );
  return {
    pass: res.ok && records.length === 1 && audit.length > 0,
    assertions: [
      check('Check-in accepted', 'accepted', res.ok ? 'accepted' : `rejected (${res.code})`),
      check('Records written for (student, session)', '1', String(records.length)),
      check('Status recorded', 'present', res.ok ? res.record.status : '—'),
      check('Audit entry emitted (attendance_verified)', 'yes', audit.length > 0 ? 'yes' : 'no'),
    ],
  };
}

function runDuplicateCheckIn(): TestOutcome {
  const { db: base, sessionId, token } = sandbox();
  const first = attemptCheckIn(base, { actorId: DEMO_STUDENT_ID, sessionId, token });
  const second = attemptCheckIn(first.db, { actorId: DEMO_STUDENT_ID, sessionId, token });
  const records = second.db.attendanceRecords.filter(
    (r) => r.sessionId === sessionId && r.studentId === DEMO_STUDENT_ID,
  );
  const blocked = second.db.auditLogs.filter(
    (l) => l.action === 'attendance_rejected_duplicate',
  );
  return {
    pass: first.ok && !second.ok && records.length === 1,
    assertions: [
      check('First check-in', 'accepted', first.ok ? 'accepted' : 'rejected'),
      check('Second check-in', 'rejected:DUPLICATE', second.ok ? 'accepted' : `rejected:${second.code}`),
      check('Total records for (student, session)', '1', String(records.length)),
      check('Duplicate block audited', 'yes', blocked.length > 0 ? 'yes' : 'no'),
    ],
  };
}

function runExpiredToken(): TestOutcome {
  const base = buildSeedDatabase();
  // Mint a session whose window closed an hour ago.
  const { db, session } = createSession(base, {
    courseId: 'crs_cs201',
    instructorId: DEMO_INSTRUCTOR_ID,
    verificationMode: 'qr_token',
    durationMinutes: 10,
    now: Date.now() - 60 * 60 * 1000,
  });
  const res = attemptCheckIn(db, {
    actorId: DEMO_STUDENT_ID,
    sessionId: session.id,
    token: session.sessionToken,
  });
  const records = res.db.attendanceRecords.filter(
    (r) => r.sessionId === session.id && r.studentId === DEMO_STUDENT_ID,
  );
  const settled = res.db.sessions.find((s) => s.id === session.id);
  return {
    pass: !res.ok && res.code === 'SESSION_EXPIRED' && records.length === 0,
    assertions: [
      check('Check-in outcome', 'rejected:SESSION_EXPIRED', res.ok ? 'accepted' : `rejected:${res.code}`),
      check('Records written', '0', String(records.length)),
      check('Session status settled', 'expired', settled?.status ?? '—'),
      check(
        'Expired attempt audited',
        'yes',
        res.db.auditLogs.some((l) => l.action === 'attendance_rejected_expired') ? 'yes' : 'no',
      ),
    ],
  };
}

function runUnauthorizedRole(): TestOutcome {
  const { db: base, sessionId, token } = sandbox();
  const res = attemptCheckIn(base, { actorId: DEMO_INSTRUCTOR_ID, sessionId, token });
  const records = res.db.attendanceRecords.filter(
    (r) => r.sessionId === sessionId && r.studentId === DEMO_INSTRUCTOR_ID,
  );
  const denied = res.db.auditLogs.filter((l) => l.action === 'access_denied');
  return {
    pass: !res.ok && res.code === 'UNAUTHORIZED' && records.length === 0,
    assertions: [
      check('Check-in outcome', 'rejected:UNAUTHORIZED', res.ok ? 'accepted' : `rejected:${res.code}`),
      check('Records written for instructor', '0', String(records.length)),
      check('Access denial audited', 'yes', denied.length > 0 ? 'yes' : 'no'),
    ],
  };
}

function runAuditedOverride(): TestOutcome {
  const { db: base, sessionId } = sandbox();
  const studentId = 'usr_stu_1002'; // Priya — no record in this fresh session

  // (a) An override without a reason must be refused.
  const noReason = manualOverride(base, {
    actorId: DEMO_INSTRUCTOR_ID,
    sessionId,
    studentId,
    newStatus: 'present',
    reason: '   ',
  });

  // (b) A reasoned override succeeds and is written to the audit log.
  const withReason = manualOverride(base, {
    actorId: DEMO_INSTRUCTOR_ID,
    sessionId,
    studentId,
    newStatus: 'present',
    reason: 'Verified in person at the door after a device failure.',
  });

  const record = withReason.ok
    ? withReason.db.attendanceRecords.find(
        (r) => r.studentId === studentId && r.sessionId === sessionId,
      )
    : undefined;
  const auditEntry = withReason.ok
    ? withReason.db.auditLogs.find((l) => l.id === withReason.auditId)
    : undefined;

  return {
    pass:
      !noReason.ok &&
      noReason.code === 'REASON_REQUIRED' &&
      withReason.ok &&
      record?.status === 'present' &&
      Boolean(auditEntry?.reason),
    assertions: [
      check('Override without reason', 'REASON_REQUIRED', noReason.ok ? 'accepted' : noReason.code),
      check('Override with reason', 'accepted', withReason.ok ? 'accepted' : 'rejected'),
      check('Record status after override', 'present', record?.status ?? '—'),
      check('Audit action', 'manual_override', auditEntry?.action ?? '—'),
      check('Reason persisted', 'yes', auditEntry?.reason ? 'yes' : 'no'),
    ],
  };
}

const SCENARIOS: Scenario[] = [
  {
    id: 'valid',
    name: 'Valid check-in',
    icon: BadgeCheck,
    scenario: 'A student submits the correct live token within the window.',
    run: runValidCheckIn,
  },
  {
    id: 'duplicate',
    name: 'Duplicate rejection',
    icon: CircleSlash,
    scenario: 'The same student checks in twice to one session.',
    run: runDuplicateCheckIn,
  },
  {
    id: 'expired',
    name: 'Expired token rejection',
    icon: Clock3,
    scenario: 'A student submits a token after the session window has closed.',
    run: runExpiredToken,
  },
  {
    id: 'unauthorized',
    name: 'Unauthorized role block',
    icon: ShieldAlert,
    scenario: 'An instructor account attempts to check in as a student.',
    run: runUnauthorizedRole,
  },
  {
    id: 'override',
    name: 'Audit-logged override',
    icon: UserRoundPen,
    scenario: 'Instructor overrides a status — with and without a mandatory reason.',
    run: runAuditedOverride,
  },
];

function execute(scenario: Scenario): TestResult {
  const { pass, assertions } = scenario.run();
  return {
    id: scenario.id,
    name: scenario.name,
    icon: scenario.icon,
    scenario: scenario.scenario,
    pass,
    assertions,
  };
}

export default function EdgeCaseSuite() {
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const runAll = () => {
    setResults(SCENARIOS.map(execute));
    setExpanded(null);
  };

  const runOne = (id: string) => {
    const scenario = SCENARIOS.find((s) => s.id === id);
    if (!scenario) return;
    const result = execute(scenario);
    setResults((prev) => {
      const base = prev ?? SCENARIOS.map(execute);
      return base.map((r) => (r.id === id ? result : r));
    });
    setExpanded(id);
  };

  const passed = results?.filter((r) => r.pass).length ?? 0;
  const total = results?.length ?? SCENARIOS.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary-600">Evaluation view</p>
          <h1 className="mt-0.5 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
            <FlaskConical size={22} className="text-primary-600" />
            Edge-Case Validation Suite
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            One click runs five integrity scenarios against a throwaway clone of the database. Your
            live data is never touched.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {results ? (
            <Badge tone={passed === total ? 'verified' : 'pending'}>
              <CheckCircle2 size={12} />
              {passed} / {total} passed
            </Badge>
          ) : null}
          <Button onClick={runAll}>
            <Play size={16} />
            Run all checks
          </Button>
        </div>
      </div>

      <Card className="flex items-start gap-3 border-primary-100 bg-primary-50/50 p-4">
        <Info size={17} className="mt-0.5 shrink-0 text-primary-600" />
        <p className="text-xs leading-relaxed text-slate-600">
          Each scenario seeds an isolated sandbox, drives the exact same verification engine used by
          the live app, and asserts the outcome — including the records written and the audit entries
          emitted.
        </p>
      </Card>

      {results ? (
        <div className="space-y-3">
          {results.map((r) => {
            const open = expanded === r.id;
            return (
              <Card
                key={r.id}
                className={cx('overflow-hidden', r.pass ? 'border-verified-200' : 'border-rejected-200')}
              >
                <div className="flex items-center gap-3 p-4">
                  <span
                    className={cx(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      r.pass ? 'bg-verified-50 text-verified-600' : 'bg-rejected-50 text-rejected-600',
                    )}
                  >
                    {r.pass ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{r.name}</p>
                      <Badge tone={r.pass ? 'verified' : 'rejected'}>{r.pass ? 'PASS' : 'FAIL'}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{r.scenario}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => runOne(r.id)}>
                      <RotateCcw size={14} />
                      <span className="hidden sm:inline">Re-run</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setExpanded(open ? null : r.id)}>
                      {open ? 'Hide' : 'Details'}
                    </Button>
                  </div>
                </div>

                <div className="border-t border-slate-100 px-4 py-3">
                  <ul className="space-y-2">
                    {r.assertions.map((as) => (
                      <li key={as.label} className="flex flex-wrap items-center gap-2 text-xs">
                        {as.pass ? (
                          <CheckCircle2 size={14} className="shrink-0 text-verified-500" />
                        ) : (
                          <XCircle size={14} className="shrink-0 text-rejected-500" />
                        )}
                        <span className="font-medium text-slate-700">{as.label}</span>
                        {open ? (
                          <span className="ml-auto flex items-center gap-2 font-mono text-[11px]">
                            <span className="text-slate-400">expected {as.expected}</span>
                            <span className={as.pass ? 'text-verified-600' : 'text-rejected-600'}>
                              got {as.actual}
                            </span>
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader
            icon={<FlaskConical size={16} />}
            title="Five scenarios ready to run"
            subtitle="Valid check-in · duplicate rejection · expired token · unauthorized role · audit-logged override."
          />
          <ul className="divide-y divide-slate-100">
            {SCENARIOS.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <s.icon size={17} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.scenario}</p>
                </div>
                <ScrollText size={15} className="text-slate-300" />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
