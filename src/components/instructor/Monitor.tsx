import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Download,
  Gauge,
  Radio,
  Search,
  UserRoundPen,
  Users,
  XCircle,
} from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Modal, StatCard } from '../ui';
import { MethodBadge, ModeIcon, StatusBadge, MODE_LABEL } from '../StatusBadge';
import { useApp } from '../../context/AppContext';
import { useNow } from '../../hooks/useNow';
import { courseStudents, getCourse, getSession, sessionKPIs } from '../../lib/selectors';
import { downloadCsv, toCsv } from '../../lib/csv';
import type { AttendanceStatus } from '../../types';
import { cx, formatTime } from '../../lib/utils';

const OVERRIDE_STATUSES: AttendanceStatus[] = ['present', 'absent', 'pending', 'rejected'];

export function Monitor({
  sessionId,
  onSelectSession,
}: {
  sessionId: string | null;
  onSelectSession: (id: string) => void;
}) {
  const { db, currentUser, override } = useApp();
  const now = useNow(1000);

  const instructorSessions = useMemo(
    () =>
      db.sessions
        .filter((s) => s.instructorId === currentUser?.id)
        .sort((a, b) => b.startedAt - a.startedAt),
    [db.sessions, currentUser?.id],
  );

  // Default to a live session when nothing is selected.
  useEffect(() => {
    if (sessionId) return;
    const live = instructorSessions.find((s) => s.status === 'active' && now < s.expiresAt);
    if (live) onSelectSession(live.id);
    else if (instructorSessions[0]) onSelectSession(instructorSessions[0].id);
  }, [sessionId, instructorSessions, now, onSelectSession]);

  const session = getSession(db, sessionId ?? undefined) ?? instructorSessions[0];
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<{ studentId: string; name: string } | null>(null);
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('present');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const course = getCourse(db, session?.courseId);
  const kpis = session ? sessionKPIs(db, session) : null;

  const roster = useMemo(() => {
    if (!session) return [];
    const students = courseStudents(db, session.courseId);
    return students
      .map((student) => {
        const record = db.attendanceRecords.find(
          (r) => r.studentId === student.id && r.sessionId === session.id,
        );
        return { student, record };
      })
      .filter(({ student }) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          student.name.toLowerCase().includes(q) ||
          (student.studentId ?? '').toLowerCase().includes(q)
        );
      });
  }, [db, session, query]);

  const openOverride = (studentId: string, name: string, current?: AttendanceStatus) => {
    setTarget({ studentId, name });
    setNewStatus(current === 'present' ? 'absent' : 'present');
    setReason('');
    setFormError(null);
  };

  const submitOverride = () => {
    if (!session || !target) return;
    if (!reason.trim()) {
      setFormError('A reason is mandatory for every manual override.');
      return;
    }
    const result = override({
      sessionId: session.id,
      studentId: target.studentId,
      newStatus,
      reason,
    });
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setBanner(`${target.name} set to ${newStatus} — written to the audit log.`);
    setTarget(null);
    setReason('');
    window.setTimeout(() => setBanner(null), 4000);
  };

  const exportRoster = () => {
    if (!session) return;
    const rows = courseStudents(db, session.courseId).map((student) => {
      const record = db.attendanceRecords.find(
        (r) => r.studentId === student.id && r.sessionId === session.id,
      );
      return {
        studentId: student.studentId ?? '',
        name: student.name,
        status: record?.status ?? 'absent',
        verifiedAt: record ? formatTime(record.verifiedAt) : '—',
        method: record?.method ?? 'manual',
      };
    });
    const csv = toCsv(rows, [
      { header: 'Student ID', value: (r) => r.studentId },
      { header: 'Name', value: (r) => r.name },
      { header: 'Status', value: (r) => r.status },
      { header: 'Verified At', value: (r) => r.verifiedAt },
      { header: 'Method', value: (r) => r.method },
    ]);
    downloadCsv(`trueattend-${course?.code ?? 'session'}-roster.csv`, csv);
  };

  if (!session || !kpis) {
    return (
      <EmptyState
        icon={<Activity size={26} />}
        title="Nothing to monitor yet"
        description="Launch a session from the Launcher tab and its live roster will appear here."
      />
    );
  }

  const live = session.status === 'active' && now < session.expiresAt;

  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <select
            className="ta-input max-w-xs"
            value={session.id}
            onChange={(e) => onSelectSession(e.target.value)}
          >
            {instructorSessions.map((s) => {
              const c = getCourse(db, s.courseId);
              const isLive = s.status === 'active' && now < s.expiresAt;
              return (
                <option key={s.id} value={s.id}>
                  {isLive ? '● ' : ''}
                  {c?.code} · {new Date(s.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  {isLive ? ` · ${s.sessionToken}` : ''}
                </option>
              );
            })}
          </select>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">{course?.title}</p>
            <p className="text-xs text-slate-500">
              {course?.room} · {MODE_LABEL[session.verificationMode]}
            </p>
          </div>
        </div>
        <Badge tone={live ? 'verified' : 'neutral'}>
          {live ? <Radio size={12} /> : <CheckCircle2 size={12} />}
          {live ? 'Live' : `Ended ${session.endedAt ? formatTime(session.endedAt) : ''}`}
        </Badge>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total"
          value={kpis.total}
          icon={<Users size={14} />}
          tone="neutral"
          hint="Roster size"
        />
        <StatCard
          label="Present"
          value={kpis.present}
          icon={<CheckCircle2 size={14} />}
          tone="verified"
          hint="Verified check-ins"
        />
        <StatCard
          label="Absent"
          value={kpis.absent}
          icon={<XCircle size={14} />}
          tone="rejected"
          hint="No check-in recorded"
        />
        <StatCard
          label="Attendance"
          value={`${kpis.attendanceRate}%`}
          icon={<Gauge size={14} />}
          tone="primary"
          hint={`${kpis.present} of ${kpis.total}`}
        />
      </div>

      {banner ? (
        <div className="rounded-lg border border-verified-100 bg-verified-50 px-4 py-2.5 text-sm text-verified-700">
          {banner}
        </div>
      ) : null}

      {/* Roster */}
      <Card>
        <CardHeader
          icon={<Activity size={16} />}
          title="Student roster"
          subtitle="Search, review verification badges and override with a logged reason."
          action={
            <Button variant="outline" size="sm" onClick={exportRoster}>
              <Download size={14} />
              Export CSV
            </Button>
          }
        />
        <div className="border-b border-slate-200 p-3">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="ta-input pl-9"
              placeholder="Search by name or student ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Student</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Verified at</th>
                <th className="px-4 py-2.5">Method</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roster.map(({ student, record }) => (
                <tr key={student.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={student.name} color={student.avatarColor} size={32} />
                      <div>
                        <p className="font-medium text-slate-900">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.studentId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={record?.status ?? 'absent'} />
                  </td>
                  <td className="px-4 py-3 tabular text-slate-600">
                    {record && record.status !== 'absent' ? (
                      formatTime(record.verifiedAt)
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {record && record.status !== 'absent' ? (
                      <MethodBadge method={record.method} />
                    ) : (
                      <span className="text-xs text-slate-400">No check-in</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openOverride(student.id, student.name, record?.status)}
                    >
                      <UserRoundPen size={14} />
                      Override
                    </Button>
                  </td>
                </tr>
              ))}
              {roster.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                    No students match “{query}”.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Override modal */}
      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title="Manual override"
        subtitle={`${target?.name} · ${course?.code ?? ''}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitOverride} disabled={!reason.trim()}>
              <UserRoundPen size={15} />
              Save override
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-pending-100 bg-pending-50 px-3 py-2.5 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <ModeIcon mode={session.verificationMode} size={13} />
              This action is permanent and writes an immutable audit entry.
            </span>
          </div>

          <Field label="New status">
            <select
              className="ta-input"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as AttendanceStatus)}
            >
              {OVERRIDE_STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Reason (mandatory)" hint="Stored with your name and a timestamp in the Audit Log.">
            <textarea
              className={cx('ta-input min-h-[90px] resize-y', formError && 'border-rejected-400')}
              placeholder="e.g. Verified in-person after device failure — student present."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setFormError(null);
              }}
            />
          </Field>

          {formError ? (
            <p className="rounded-lg border border-rejected-100 bg-rejected-50 px-3 py-2 text-sm text-rejected-700">
              {formError}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
