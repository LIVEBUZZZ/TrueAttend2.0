import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  KeyRound,
  Lock,
  MapPin,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
  XCircle,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field } from '../ui';
import { MODE_LABEL, ModeIcon } from '../StatusBadge';
import { ReceiptCard } from './ReceiptCard';
import { BiometricCheck, type BiometricState } from './BiometricCheck';
import { useApp } from '../../context/AppContext';
import { useNow } from '../../hooks/useNow';
import { findSession, isSessionLive } from '../../lib/engine';
import { getCourse, studentLiveSessions } from '../../lib/selectors';
import type { AttendanceRecord, CheckInResult, Session } from '../../types';
import { cx, formatCountdown, remaining } from '../../lib/utils';

const STEPS = [
  { n: 1, title: 'Discover', desc: 'Find a live session' },
  { n: 2, title: 'Enter code', desc: 'Type or scan the token' },
  { n: 3, title: 'Review', desc: 'Confirm the session' },
  { n: 4, title: 'Verify', desc: 'Prove your identity' },
  { n: 5, title: 'Validate', desc: 'Guard checks run' },
  { n: 6, title: 'Record', desc: 'Written to the ledger' },
  { n: 7, title: 'Receipt', desc: 'Digital proof issued' },
];

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <li key={s.n} className="flex shrink-0 items-center gap-1">
            <div className="flex items-center gap-2">
              <span
                className={cx(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition',
                  done
                    ? 'bg-verified-500 text-white'
                    : active
                      ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                      : 'bg-slate-100 text-slate-400',
                )}
              >
                {done ? <CheckCircle2 size={14} /> : s.n}
              </span>
              <span className="hidden sm:block">
                <span
                  className={cx(
                    'block text-xs font-semibold',
                    active ? 'text-primary-700' : done ? 'text-slate-700' : 'text-slate-400',
                  )}
                >
                  {s.title}
                </span>
                <span className="block text-[10px] text-slate-400">{s.desc}</span>
              </span>
            </div>
            {i < STEPS.length - 1 ? (
              <span
                className={cx('h-px w-4 sm:w-7', done ? 'bg-verified-400' : 'bg-slate-200')}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function CheckInFlow({ onGoToHistory }: { onGoToHistory: () => void }) {
  const { db, currentUser, checkIn } = useApp();
  const now = useNow(1000);

  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const [credId, setCredId] = useState(currentUser?.studentId ?? '');
  const [credPin, setCredPin] = useState('');
  const [bio, setBio] = useState<BiometricState>({ consent: false, match: false });

  const [outcome, setOutcome] = useState<CheckInResult | null>(null);
  const [receipt, setReceipt] = useState<AttendanceRecord | null>(null);

  const live = currentUser ? studentLiveSessions(db, currentUser.id, now) : [];

  const reset = () => {
    setStep(1);
    setCode('');
    setCodeError(null);
    setSession(null);
    setCredPin('');
    setBio({ consent: false, match: false });
    setOutcome(null);
    setReceipt(null);
  };

  const recordFor = (sessionId: string) =>
    currentUser
      ? db.attendanceRecords.find(
          (r) => r.studentId === currentUser.id && r.sessionId === sessionId,
        )
      : undefined;

  const openSession = (s: Session) => {
    setSession(s);
    setCode(s.sessionToken);
    setCodeError(null);
    setStep(3);
  };

  const openExistingReceipt = (record: AttendanceRecord) => {
    const s = db.sessions.find((x) => x.id === record.sessionId) ?? null;
    setSession(s);
    setReceipt(record);
    setStep(7);
  };

  const resolveCode = () => {
    const found = findSession(db, { token: code });
    if (!found) {
      setCodeError('No session matches that code. Double-check the 6 characters.');
      return;
    }
    setCodeError(null);
    setSession(found);
    setStep(3);
  };

  const runVerification = () => {
    if (!session) return;
    const base = { sessionId: session.id, token: code };
    let result: CheckInResult;
    if (session.verificationMode === 'qr_token') {
      result = checkIn({ ...base, token: code });
    } else if (session.verificationMode === 'credentials') {
      result = checkIn({ sessionId: session.id, credentials: { studentId: credId, pin: credPin } });
    } else {
      result = checkIn({
        sessionId: session.id,
        biometricConsent: bio.consent,
        biometricMatch: bio.match,
      });
    }
    setOutcome(result);
    if (result.ok) setReceipt(result.record);
    setStep(5);
  };

  const course = getCourse(db, session?.courseId);

  const errorCopy = useMemo(() => {
    if (!outcome || outcome.ok) return null;
    const map: Record<string, { title: string; body: string }> = {
      SESSION_EXPIRED: {
        title: 'Expired token rejected',
        body: 'This session window has closed. The token is dead — ask your instructor for a fresh session.',
      },
      DUPLICATE: {
        title: 'Duplicate check-in blocked',
        body: 'You already have a verified record for this session. Duplicate records are impossible by design.',
      },
      SESSION_ENDED: {
        title: 'Session already ended',
        body: 'The instructor closed this session, so no further check-ins are accepted.',
      },
      TOKEN_INVALID: {
        title: 'Incorrect token',
        body: 'The code you entered does not match this session. Re-scan the QR or retype the code.',
      },
      CREDENTIALS_INVALID: {
        title: 'Credentials rejected',
        body: 'Your Student ID and PIN did not match. Check both and try again.',
      },
      UNAUTHORIZED: {
        title: 'Not permitted',
        body: 'Only student accounts can check in to a session.',
      },
      BIOMETRIC_DENIED: {
        title: 'Face check incomplete',
        body: 'The face check was not completed or consent was not given.',
      },
      NOT_ENROLLED: {
        title: 'Not enrolled',
        body: 'You are not enrolled in the course for this session.',
      },
    };
    return (
      map[outcome.code] ?? {
        title: 'Check-in failed',
        body: outcome.message,
      }
    );
  }, [outcome]);

  // ---------------------------------------------------------------- step 1
  const renderDiscover = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Live sessions right now</h2>
        <p className="text-sm text-slate-500">
          Tap a session to check in, or enter a code if you were given one.
        </p>
      </div>

      {live.length === 0 ? (
        <EmptyState
          icon={<QrCode size={26} />}
          title="No live sessions"
          description="When your instructor launches a session it will appear here instantly."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {live.map((s) => {
            const c = getCourse(db, s.courseId);
            const existing = recordFor(s.id);
            const ms = remaining(s.expiresAt, now);
            return (
              <Card
                key={s.id}
                className={cx(
                  'p-4 transition',
                  existing ? 'border-verified-200 bg-verified-50/40' : 'hover:border-primary-300',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{c?.code}</p>
                    <p className="text-xs text-slate-500">{c?.title}</p>
                  </div>
                  {existing ? (
                    <Badge tone="verified">
                      <BadgeCheck size={12} /> Checked in
                    </Badge>
                  ) : (
                    <Badge tone="verified">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-verified-500" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-verified-500" />
                      </span>
                      Live
                    </Badge>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} /> {c?.room}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ModeIcon mode={s.verificationMode} size={12} /> {MODE_LABEL[s.verificationMode]}
                  </span>
                  <span className="inline-flex items-center gap-1 tabular">
                    <Clock3 size={12} /> {formatCountdown(ms)}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant={existing ? 'outline' : 'primary'}
                  className="mt-3 w-full"
                  onClick={() => (existing ? openExistingReceipt(existing) : openSession(s))}
                >
                  {existing ? (
                    <>
                      <BadgeCheck size={14} /> View receipt
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} /> Check in
                    </>
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <button
        onClick={() => {
          setCode('');
          setCodeError(null);
          setStep(2);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 transition hover:border-primary-300 hover:bg-primary-50/40 hover:text-primary-700"
      >
        <ScanLine size={16} />
        I have a code instead
      </button>
    </div>
  );

  // ---------------------------------------------------------------- step 2
  const renderCode = () => (
    <div className="mx-auto max-w-md space-y-5">
      <button
        onClick={() => setStep(1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={15} /> Back
      </button>
      <div>
        <h2 className="text-lg font-bold text-slate-900">Enter your session code</h2>
        <p className="text-sm text-slate-500">
          Type the 6-character code from the board, or scan the QR code on screen.
        </p>
      </div>

      <Card className="p-5">
        <Field label="Session code" hint="Letters and numbers only — case insensitive.">
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
              setCodeError(null);
            }}
            placeholder="ABC123"
            className="ta-input text-center font-mono text-2xl font-bold tracking-[0.4em]"
            inputMode="text"
            maxLength={6}
            autoFocus
          />
        </Field>

        {codeError ? (
          <p className="mt-3 rounded-lg border border-rejected-100 bg-rejected-50 px-3 py-2 text-sm text-rejected-700">
            {codeError}
          </p>
        ) : null}

        <Button className="mt-4 w-full" onClick={resolveCode} disabled={code.length !== 6}>
          <ScanLine size={16} />
          Find session
        </Button>

        <button
          onClick={() => {
            const first = live[0];
            if (first) {
              setCode(first.sessionToken);
              setCodeError(null);
            }
          }}
          disabled={live.length === 0}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-50 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
        >
          <QrCode size={14} />
          Simulate scanning the board QR
        </button>
      </Card>
    </div>
  );

  // ---------------------------------------------------------------- step 3
  const renderReview = () => {
    if (!session) return null;
    const ms = remaining(session.expiresAt, now);
    const liveNow = isSessionLive(session, now);
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <button
          onClick={() => setStep(1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={15} /> Start over
        </button>
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{course?.code}</p>
                <p className="text-xs text-slate-500">{course?.title}</p>
              </div>
              {liveNow ? (
                <Badge tone="verified">
                  <Clock3 size={12} /> {formatCountdown(ms)}
                </Badge>
              ) : (
                <Badge tone="rejected">
                  <XCircle size={12} /> Expired
                </Badge>
              )}
            </div>
          </div>
          <dl className="divide-y divide-slate-100">
            {[
              ['Session code', <span className="font-mono tracking-widest">{session.sessionToken}</span>],
              ['Room', course?.room ?? '—'],
              ['Verification method', MODE_LABEL[session.verificationMode]],
              ['Duration', `${session.durationMinutes} minutes`],
            ].map(([k, v], i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                <dd className="text-sm font-medium text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Button
          className="w-full"
          size="lg"
          disabled={!liveNow}
          onClick={() => setStep(4)}
        >
          Continue to verification
          <ArrowRight size={17} />
        </Button>
        {!liveNow ? (
          <p className="text-center text-xs text-rejected-600">
            This session has expired — a new session is required.
          </p>
        ) : null}
      </div>
    );
  };

  // ---------------------------------------------------------------- step 4
  const renderVerify = () => {
    if (!session) return null;
    const ready =
      session.verificationMode === 'qr_token'
        ? code.trim().length === 6
        : session.verificationMode === 'credentials'
          ? credId.trim().length > 0 && credPin.length >= 4
          : bio.consent && bio.match;

    return (
      <div className="mx-auto max-w-lg space-y-5">
        <button
          onClick={() => setStep(3)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={15} /> Back
        </button>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <ModeIcon mode={session.verificationMode} size={20} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{MODE_LABEL[session.verificationMode]}</h2>
              <p className="text-xs text-slate-500">
                Verify your identity to record attendance for {course?.code}.
              </p>
            </div>
          </div>

          {session.verificationMode === 'qr_token' ? (
            <div className="space-y-4">
              <Field label="Confirm session token" hint="Scanned automatically, or type it yourself.">
                <input
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
                  }
                  className="ta-input text-center font-mono text-xl font-bold tracking-[0.35em]"
                  maxLength={6}
                />
              </Field>
              <button
                onClick={() => setCode(session.sessionToken)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-50 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100"
              >
                <QrCode size={14} /> Simulate QR scan
              </button>
            </div>
          ) : null}

          {session.verificationMode === 'credentials' ? (
            <div className="space-y-4">
              <Field label="Student ID">
                <div className="relative">
                  <UserRound
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={credId}
                    onChange={(e) => setCredId(e.target.value)}
                    placeholder="STU-1001"
                    className="ta-input pl-9"
                  />
                </div>
              </Field>
              <Field label="PIN">
                <div className="relative">
                  <KeyRound
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={credPin}
                    onChange={(e) => setCredPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    inputMode="numeric"
                    className="ta-input pl-9 tracking-[0.4em]"
                  />
                </div>
              </Field>
            </div>
          ) : null}

          {session.verificationMode === 'biometric_check' ? (
            <BiometricCheck onChange={setBio} />
          ) : null}

          <Button className="mt-5 w-full" size="lg" disabled={!ready} onClick={runVerification}>
            <ShieldCheck size={17} />
            Verify &amp; check in
          </Button>
        </Card>

        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
          <Lock size={12} />
          Your verification data never leaves this device.
        </p>
      </div>
    );
  };

  // ---------------------------------------------------------------- step 5
  const renderValidate = () => {
    const ok = outcome?.ok ?? false;
    const failCode = outcome && !outcome.ok ? outcome.code : null;
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <h2 className="text-center text-lg font-bold text-slate-900">
          {ok ? 'All guard checks passed' : 'Check-in blocked'}
        </h2>

        <Card className={cx('p-5', !ok && 'border-rejected-200')}>
          <ul className="space-y-2.5">
            {[
              { label: 'Session located and active', pass: ok || failCode !== 'SESSION_NOT_FOUND' },
              { label: 'Token within its time window', pass: ok || failCode !== 'SESSION_EXPIRED' },
              { label: 'No duplicate record for this session', pass: ok || failCode !== 'DUPLICATE' },
              { label: 'Student role authorized', pass: ok || failCode !== 'UNAUTHORIZED' },
            ].map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-700">{row.label}</span>
                {row.pass ? (
                  <CheckCircle2 size={17} className="shrink-0 text-verified-500" />
                ) : (
                  <XCircle size={17} className="shrink-0 text-rejected-500" />
                )}
              </li>
            ))}
          </ul>

          {!ok && errorCopy ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-rejected-100 bg-rejected-50 p-3.5">
              <ShieldAlert size={18} className="mt-0.5 shrink-0 text-rejected-600" />
              <div>
                <p className="text-sm font-semibold text-rejected-800">{errorCopy.title}</p>
                <p className="mt-0.5 text-xs text-rejected-700">{errorCopy.body}</p>
              </div>
            </div>
          ) : null}
        </Card>

        {ok ? (
          <Button className="w-full" size="lg" onClick={() => setStep(6)}>
            Continue to recording
            <ArrowRight size={17} />
          </Button>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setOutcome(null);
                setStep(4);
              }}
            >
              <RefreshCw size={15} /> Try again
            </Button>
            <Button variant="ghost" className="flex-1" onClick={reset}>
              Start over
            </Button>
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------- step 6
  const renderRecord = () => {
    if (!outcome || !outcome.ok) return null;
    const { record } = outcome;
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-verified-100 text-verified-600">
            <BadgeCheck size={26} />
          </span>
          <h2 className="mt-3 text-lg font-bold text-slate-900">Record written to the ledger</h2>
          <p className="text-sm text-slate-500">
            One immutable entry for you, for this session. No duplicates possible.
          </p>
        </div>
        <Card className="divide-y divide-slate-100">
          {[
            ['Record ID', <span className="font-mono text-xs">{record.id}</span>],
            ['Status', <Badge tone="verified">Present</Badge>],
            ['Method', record.verificationNote ?? '—'],
            ['Verified at', new Date(record.verifiedAt).toLocaleString()],
          ].map(([k, v], i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k}</span>
              <span className="text-right text-sm font-medium text-slate-800">{v}</span>
            </div>
          ))}
        </Card>
        <Button className="w-full" size="lg" onClick={() => setStep(7)}>
          <Sparkles size={17} /> View digital receipt
        </Button>
      </div>
    );
  };

  // ---------------------------------------------------------------- step 7
  const renderReceipt = () => {
    if (!receipt || !currentUser) return null;
    const s = session ?? db.sessions.find((x) => x.id === receipt.sessionId) ?? null;
    if (!s) return null;
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <ReceiptCard
          record={receipt}
          session={s}
          course={getCourse(db, s.courseId)}
          student={currentUser}
        />
        <div className="flex flex-col gap-2 sm:flex-row no-print">
          <Button variant="primary" className="flex-1" onClick={reset}>
            <QrCode size={15} /> Check in to another session
          </Button>
          <Button variant="outline" className="flex-1" onClick={onGoToHistory}>
            View my history
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Stepper current={step} />
      <div className="animate-fade-in">
        {step === 1 ? renderDiscover() : null}
        {step === 2 ? renderCode() : null}
        {step === 3 ? renderReview() : null}
        {step === 4 ? renderVerify() : null}
        {step === 5 ? renderValidate() : null}
        {step === 6 ? renderRecord() : null}
        {step === 7 ? renderReceipt() : null}
      </div>
    </div>
  );
}
