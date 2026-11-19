import { useState } from 'react';
import QRCode from 'react-qr-code';
import {
  Check,
  Clock3,
  Copy,
  ExternalLink,
  PauseCircle,
  QrCode,
  Radio,
  Users,
} from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Modal, Progress } from '../ui';
import { ModeIcon, MODE_LABEL } from '../StatusBadge';
import { useApp } from '../../context/AppContext';
import { useNow } from '../../hooks/useNow';
import { getCourse } from '../../lib/selectors';
import { sessionKPIs } from '../../lib/selectors';
import { cx, formatCountdown, remaining } from '../../lib/utils';

export function LiveSessions({ onOpenMonitor }: { onOpenMonitor: (sessionId: string) => void }) {
  const { db, currentUser, endSessionAction } = useApp();
  const now = useNow(1000);

  const [ending, setEnding] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const sessions = db.sessions
    .filter((s) => s.instructorId === currentUser?.id && s.status === 'active' && now < s.expiresAt)
    .sort((a, b) => b.startedAt - a.startedAt);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  const confirmEnd = () => {
    if (!ending) return;
    endSessionAction(ending, note || undefined);
    setEnding(null);
    setNote('');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Active sessions</h2>
          <p className="text-sm text-slate-500">
            Share the QR or code with the room. The countdown expires the token automatically.
          </p>
        </div>
        <Badge tone={sessions.length ? 'verified' : 'neutral'}>
          <Radio size={12} />
          {sessions.length} live
        </Badge>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={<QrCode size={26} />}
          title="No active sessions"
          description="Launch a session from the Launcher tab to generate a QR code and 6-character token."
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {sessions.map((session) => {
            const course = getCourse(db, session.courseId);
            const kpis = sessionKPIs(db, session);
            const ms = remaining(session.expiresAt, now);
            const low = ms < 120_000;
            const qrValue = `trueattend://checkin?session=${session.id}&token=${session.sessionToken}`;

            return (
              <Card key={session.id} className="overflow-hidden">
                <CardHeader
                  icon={<Radio size={16} />}
                  title={
                    <span className="flex items-center gap-2">
                      {course?.code ?? 'Session'} · {course?.title}
                    </span>
                  }
                  subtitle={MODE_LABEL[session.verificationMode]}
                  action={
                    <Badge tone="verified">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-verified-500" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-verified-500" />
                      </span>
                      Live
                    </Badge>
                  }
                />
                <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr]">
                  <div className="flex flex-col items-center gap-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <QRCode value={qrValue} size={148} level="M" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                      <ModeIcon mode={session.verificationMode} size={12} />
                      Scannable in the room
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Session code
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-3xl font-extrabold tracking-[0.28em] text-slate-900">
                          {session.sessionToken}
                        </span>
                        <button
                          onClick={() => copy(session.sessionToken)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                          title="Copy code"
                        >
                          {copied === session.sessionToken ? (
                            <Check size={15} className="text-verified-600" />
                          ) : (
                            <Copy size={15} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div
                      className={cx(
                        'flex items-center justify-between rounded-lg border px-3.5 py-2.5',
                        low
                          ? 'border-rejected-100 bg-rejected-50'
                          : 'border-slate-200 bg-slate-50',
                      )}
                    >
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <Clock3 size={14} className={low ? 'text-rejected-600' : 'text-slate-500'} />
                        Expires in
                      </span>
                      <span
                        className={cx(
                          'text-xl font-extrabold tabular',
                          low ? 'text-rejected-600' : 'text-slate-900',
                        )}
                      >
                        {formatCountdown(ms)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-verified-50 py-2">
                        <p className="text-lg font-bold tabular text-verified-700">{kpis.present}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-verified-600">
                          Present
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-100 py-2">
                        <p className="text-lg font-bold tabular text-slate-700">{kpis.absent}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Absent
                        </p>
                      </div>
                      <div className="rounded-lg bg-primary-50 py-2">
                        <p className="text-lg font-bold tabular text-primary-700">
                          {kpis.attendanceRate}%
                        </p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-600">
                          Rate
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Users size={12} />
                          {kpis.present} of {kpis.total} checked in
                        </span>
                        <span>{kpis.attendanceRate}%</span>
                      </div>
                      <Progress value={kpis.attendanceRate} tone="verified" />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenMonitor(session.id)}
                      >
                        <ExternalLink size={14} />
                        Open monitor
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setEnding(session.id)}
                      >
                        <PauseCircle size={14} />
                        End session
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(ending)}
        onClose={() => {
          setEnding(null);
          setNote('');
        }}
        title="End live session?"
        subtitle="Unrecorded students are marked absent. The session is closed permanently."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setEnding(null);
                setNote('');
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmEnd}>
              <PauseCircle size={15} />
              End session
            </Button>
          </>
        }
      >
        <label className="block">
          <span className="ta-label">Closing note (optional)</span>
          <textarea
            className="ta-input min-h-[80px] resize-y"
            placeholder="e.g. Covered lecture 6 — attendance captured before the break."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </Modal>
    </div>
  );
}
