import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  Eye,
  History,
  MessageSquarePlus,
  Plus,
  Scale,
} from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Modal } from '../ui';
import { MethodBadge, StatusBadge } from '../StatusBadge';
import { ReceiptCard } from './ReceiptCard';
import { useApp } from '../../context/AppContext';
import { getCourse, getSession, studentRecords } from '../../lib/selectors';
import type { AttendanceRecord } from '../../types';
import { formatDate, formatDateTime, formatTime } from '../../lib/utils';

export function HistoryPanel() {
  const { db, currentUser, fileDispute } = useApp();
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [viewRecord, setViewRecord] = useState<AttendanceRecord | null>(null);

  const records = useMemo(
    () => (currentUser ? studentRecords(db, currentUser.id) : []),
    [db, currentUser],
  );

  const myDisputes = useMemo(
    () => db.disputes.filter((d) => d.studentId === currentUser?.id),
    [db.disputes, currentUser?.id],
  );

  // The distinct sessions this student has a record for (for the review picker).
  const reviewableSessions = useMemo(() => {
    const ids = Array.from(new Set(records.map((r) => r.sessionId)));
    return ids
      .map((id) => getSession(db, id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .sort((a, b) => b.startedAt - a.startedAt);
  }, [records, db]);

  const openReview = (sessionId?: string) => {
    setReviewFor(sessionId ?? reviewableSessions[0]?.id ?? null);
    setMessage('');
    setError(null);
    setReviewOpen(true);
  };

  const submitReview = () => {
    if (!reviewFor) {
      setError('Select the session you want reviewed.');
      return;
    }
    if (!message.trim()) {
      setError('Please describe what happened.');
      return;
    }
    const res = fileDispute({ sessionId: reviewFor, message, requestedStatus: 'present' });
    if (!res.ok) {
      setError(res.error ?? 'Unable to submit the request.');
      return;
    }
    setReviewOpen(false);
  };

  const viewSession = viewRecord ? getSession(db, viewRecord.sessionId) : undefined;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          icon={<History size={16} />}
          title="Attendance history"
          subtitle="Every recorded session, with a receipt for each verified check-in."
          action={
            <Button variant="outline" size="sm" onClick={() => openReview()}>
              <MessageSquarePlus size={14} />
              Request record review
            </Button>
          }
        />
        {records.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<CalendarDays size={24} />}
              title="No attendance records yet"
              description="Check in to a live session and it will appear here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Course</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Verified</th>
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => {
                  const course = getCourse(db, record.courseId);
                  const session = getSession(db, record.sessionId);
                  const hasOpenDispute = myDisputes.some(
                    (d) => d.sessionId === record.sessionId && d.status === 'pending',
                  );
                  return (
                    <tr key={record.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-slate-600">
                        {session ? formatDate(session.startedAt) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{course?.code}</p>
                        <p className="text-xs text-slate-500">{course?.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="px-4 py-3 tabular text-slate-600">
                        {record.status === 'present' ? formatTime(record.verifiedAt) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {record.status === 'absent' ? (
                          <span className="text-xs text-slate-400">No check-in</span>
                        ) : (
                          <MethodBadge method={record.method} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {record.status === 'present' ? (
                            <Button variant="ghost" size="sm" onClick={() => setViewRecord(record)}>
                              <Eye size={14} />
                              Receipt
                            </Button>
                          ) : null}
                          {hasOpenDispute ? (
                            <Badge tone="pending">
                              <Scale size={12} />
                              Under review
                            </Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openReview(record.sessionId)}
                            >
                              <MessageSquarePlus size={14} />
                              Review
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {myDisputes.length > 0 ? (
        <Card>
          <CardHeader
            icon={<Scale size={16} />}
            title="My correction requests"
            subtitle="Submitted reviews and their outcome."
          />
          <ul className="divide-y divide-slate-100">
            {myDisputes
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((d) => {
                const session = getSession(db, d.sessionId);
                const course = getCourse(db, d.courseId);
                return (
                  <li key={d.id} className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-5">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {course?.code} · {session ? formatDateTime(session.startedAt) : '—'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{d.message}</p>
                      {d.resolutionNote ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Instructor note: “{d.resolutionNote}”
                        </p>
                      ) : null}
                    </div>
                    <Badge
                      tone={
                        d.status === 'pending'
                          ? 'pending'
                          : d.status === 'approved'
                            ? 'verified'
                            : 'rejected'
                      }
                    >
                      {d.status}
                    </Badge>
                  </li>
                );
              })}
          </ul>
        </Card>
      ) : null}

      {/* Request review modal */}
      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Request record review"
        subtitle="Ask your instructor to correct a session record."
        footer={
          <>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitReview}>
              <MessageSquarePlus size={15} />
              Submit request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Session">
            <select
              className="ta-input"
              value={reviewFor ?? ''}
              onChange={(e) => setReviewFor(e.target.value)}
            >
              {reviewableSessions.map((s) => {
                const c = getCourse(db, s.courseId);
                return (
                  <option key={s.id} value={s.id}>
                    {c?.code} · {formatDateTime(s.startedAt)} · {s.sessionToken}
                  </option>
                );
              })}
            </select>
          </Field>
          <Field label="What happened?" hint="Be specific — your instructor reviews this alongside the audit log.">
            <textarea
              className="ta-input min-h-[110px] resize-y"
              placeholder="e.g. My phone died before I could scan the code, but I was in the room."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError(null);
              }}
            />
          </Field>
          {error ? (
            <p className="rounded-lg border border-rejected-100 bg-rejected-50 px-3 py-2 text-sm text-rejected-700">
              {error}
            </p>
          ) : null}
          <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            <Plus size={12} />
            Your request is logged and appears in the instructor&apos;s Disputes queue.
          </p>
        </div>
      </Modal>

      {/* Receipt modal */}
      <Modal
        open={Boolean(viewRecord)}
        onClose={() => setViewRecord(null)}
        title="Digital receipt"
        subtitle="Your verified attendance proof."
        size="md"
      >
        {viewRecord && viewSession && currentUser ? (
          <ReceiptCard
            record={viewRecord}
            session={viewSession}
            course={getCourse(db, viewSession.courseId)}
            student={currentUser}
          />
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
            <BadgeCheck size={16} /> Session details unavailable for this record.
          </div>
        )}
      </Modal>
    </div>
  );
}
