import { BadgeCheck, CalendarClock, Hash, MapPin, ShieldCheck } from 'lucide-react';
import { Badge } from '../ui';
import { ModeIcon, MODE_LABEL } from '../StatusBadge';
import type { AttendanceRecord, Course, Profile, Session } from '../../types';
import { formatDateTime, formatTime } from '../../lib/utils';

/**
 * The timestamped "Attendance Verified" digital receipt shown at the end of the
 * check-in flow and re-openable from history.
 */
export function ReceiptCard({
  record,
  session,
  course,
  student,
}: {
  record: AttendanceRecord;
  session: Session;
  course?: Course;
  student: Profile;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="relative bg-gradient-to-br from-verified-600 to-emerald-600 px-5 py-6 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <BadgeCheck size={26} />
          </span>
          <div>
            <p className="text-lg font-extrabold tracking-tight">Attendance Verified</p>
            <p className="text-xs text-emerald-50">TrueAttend digital receipt</p>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full border-4 border-white/15" />
        <div className="pointer-events-none absolute -bottom-8 right-8 h-20 w-20 rounded-full border-4 border-white/10" />
      </div>

      <div className="space-y-4 px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">{student.name}</p>
            <p className="text-xs text-slate-500">
              {student.studentId} · {student.department}
            </p>
          </div>
          <Badge tone="verified">
            <ShieldCheck size={12} />
            Verified
          </Badge>
        </div>

        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-200 sm:grid-cols-2">
          <div className="bg-white p-3.5">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <CalendarClock size={12} /> Course
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-800">
              {course?.code} · {course?.title}
            </dd>
          </div>
          <div className="bg-white p-3.5">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <MapPin size={12} /> Room
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-800">{course?.room ?? '—'}</dd>
          </div>
          <div className="bg-white p-3.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Verified at
            </dt>
            <dd className="mt-1 text-sm font-semibold tabular text-slate-800">
              {formatDateTime(record.verifiedAt)}
            </dd>
          </div>
          <div className="bg-white p-3.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Session code
            </dt>
            <dd className="mt-1 font-mono text-sm font-semibold tracking-widest text-slate-800">
              {session.sessionToken}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <ModeIcon mode={record.method} size={13} />
            {record.method === 'manual' ? 'Manual entry' : MODE_LABEL[record.method]}
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
            <Hash size={12} />
            {record.id}
          </span>
        </div>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
          Session {formatTime(session.startedAt)}–{formatTime(session.expiresAt)}. This receipt is
          issued from the attendance ledger and can be re-verified by your instructor at any time.
        </p>
      </div>
    </div>
  );
}
