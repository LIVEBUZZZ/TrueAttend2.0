import { useMemo, useState } from 'react';
import {
  Clock3,
  Fingerprint,
  KeyRound,
  Play,
  QrCode,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { Badge, Button, Card, CardHeader, Field } from '../ui';
import { useApp } from '../../context/AppContext';
import { getProfile } from '../../lib/selectors';
import type { VerificationMode } from '../../types';
import { cx } from '../../lib/utils';

const MODES: Array<{
  value: VerificationMode;
  label: string;
  desc: string;
  icon: typeof QrCode;
  accent: string;
}> = [
  {
    value: 'qr_token',
    label: 'Dynamic QR / Token',
    desc: 'Students scan the QR or type the rotating 6-character code.',
    icon: QrCode,
    accent: 'text-primary-600 bg-primary-50',
  },
  {
    value: 'credentials',
    label: 'Credentials',
    desc: 'Students confirm with their Student ID and private PIN.',
    icon: KeyRound,
    accent: 'text-verified-600 bg-verified-50',
  },
  {
    value: 'biometric_check',
    label: 'Webcam Face Check',
    desc: 'On-device face check with a Privacy-by-Design consent notice.',
    icon: Fingerprint,
    accent: 'text-pending-600 bg-pending-50',
  },
];

export function SessionLauncher({ onLaunched }: { onLaunched: () => void }) {
  const { db, currentUser, launchSession } = useApp();
  const courses = useMemo(
    () => db.courses.filter((c) => c.instructorId === currentUser?.id),
    [db.courses, currentUser?.id],
  );

  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [mode, setMode] = useState<VerificationMode>('qr_token');
  const [duration, setDuration] = useState(12);
  const [error, setError] = useState<string | null>(null);

  const course = db.courses.find((c) => c.id === courseId);

  const handleLaunch = () => {
    if (!courseId) {
      setError('Select a course to launch a session.');
      return;
    }
    setError(null);
    launchSession(courseId, mode, duration);
    onLaunched();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <CardHeader
          icon={<Rocket size={16} />}
          title="Live Session Launcher"
          subtitle="Configure a session — students can check in the moment it starts."
        />
        <div className="space-y-6 p-5">
          <Field label="Course">
            <select
              className="ta-input"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              {courses.length === 0 ? <option value="">No courses assigned</option> : null}
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.title}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <span className="ta-label">Verification mode</span>
            <div className="grid gap-3 sm:grid-cols-3">
              {MODES.map((m) => {
                const selected = m.value === mode;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMode(m.value)}
                    className={cx(
                      'rounded-xl border p-3.5 text-left transition',
                      selected
                        ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-500/30'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    <span
                      className={cx(
                        'flex h-8 w-8 items-center justify-center rounded-lg',
                        m.accent,
                      )}
                    >
                      <m.icon size={16} />
                    </span>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{m.label}</p>
                    <p className="mt-1 text-[11px] leading-snug text-slate-500">{m.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="ta-label mb-0">Session duration</span>
              <span className="text-sm font-bold tabular text-primary-600">{duration} min</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-2 w-full accent-primary-600"
            />
            <div className="mt-1 flex justify-between text-[11px] text-slate-400">
              <span>5 min</span>
              <span>30 min</span>
            </div>
          </div>

          {error ? (
            <p className="rounded-lg border border-rejected-100 bg-rejected-50 px-3 py-2 text-sm text-rejected-700">
              {error}
            </p>
          ) : null}

          <Button size="lg" className="w-full" onClick={handleLaunch}>
            <Play size={17} />
            Launch live session
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <ShieldCheck size={18} />
          </span>
          <h3 className="mt-3 text-sm font-bold text-slate-900">On launch</h3>
          <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
            {[
              'A unique 6-character token is generated and rotates each session.',
              'A scannable QR code and copyable code appear for the room.',
              'A countdown starts and expires the token automatically.',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                {t}
              </li>
            ))}
          </ul>
        </Card>

        {course ? (
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">{course.code}</h3>
              <Badge tone="neutral">{course.enrolledStudentIds.length} enrolled</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">{course.title}</p>
            <dl className="mt-3 space-y-1.5 text-xs text-slate-500">
              <div className="flex justify-between">
                <dt>Room</dt>
                <dd className="font-medium text-slate-700">{course.room}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Schedule</dt>
                <dd className="font-medium text-slate-700">{course.schedule}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Instructor</dt>
                <dd className="font-medium text-slate-700">
                  {getProfile(db, course.instructorId)?.name ?? '—'}
                </dd>
              </div>
            </dl>
          </Card>
        ) : null}

        <Card className="flex items-center gap-3 border-pending-100 bg-pending-50/50 p-4">
          <Clock3 size={18} className="shrink-0 text-pending-600" />
          <p className="text-xs text-slate-600">
            Sessions are held in-browser for this demo. The token, timer and duplicate guard all
            behave exactly as they would against a live backend.
          </p>
        </Card>
      </div>
    </div>
  );
}
