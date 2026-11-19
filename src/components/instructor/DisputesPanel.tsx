import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Inbox,
  MessageSquareWarning,
  Scale,
  XCircle,
} from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Modal, StatCard } from '../ui';
import { useApp } from '../../context/AppContext';
import { getCourse, getSession } from '../../lib/selectors';
import type { CorrectionDispute } from '../../types';
import { cx, formatDateTime } from '../../lib/utils';

type Filter = 'pending' | 'all';

export function DisputesPanel() {
  const { db, currentUser, resolveDisputeAction } = useApp();
  const [filter, setFilter] = useState<Filter>('pending');
  const [target, setTarget] = useState<CorrectionDispute | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [note, setNote] = useState('');

  // Disputes for this instructor's courses only.
  const courseIds = useMemo(
    () => db.courses.filter((c) => c.instructorId === currentUser?.id).map((c) => c.id),
    [db.courses, currentUser?.id],
  );

  const disputes = useMemo(
    () =>
      db.disputes
        .filter((d) => courseIds.includes(d.courseId))
        .filter((d) => (filter === 'pending' ? d.status === 'pending' : true))
        .sort((a, b) => b.createdAt - a.createdAt),
    [db.disputes, courseIds, filter],
  );

  const pendingCount = db.disputes.filter(
    (d) => courseIds.includes(d.courseId) && d.status === 'pending',
  ).length;
  const approvedCount = db.disputes.filter(
    (d) => courseIds.includes(d.courseId) && d.status === 'approved',
  ).length;
  const rejectedCount = db.disputes.filter(
    (d) => courseIds.includes(d.courseId) && d.status === 'rejected',
  ).length;

  const openResolve = (dispute: CorrectionDispute, d: 'approved' | 'rejected') => {
    setTarget(dispute);
    setDecision(d);
    setNote('');
  };

  const confirm = () => {
    if (!target) return;
    resolveDisputeAction(target.id, decision, note || undefined);
    setTarget(null);
    setNote('');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Pending" value={pendingCount} tone="pending" icon={<Inbox size={14} />} />
        <StatCard label="Approved" value={approvedCount} tone="verified" icon={<CheckCircle2 size={14} />} />
        <StatCard label="Rejected" value={rejectedCount} tone="rejected" icon={<XCircle size={14} />} />
      </div>

      <Card>
        <CardHeader
          icon={<Scale size={16} />}
          title="Correction disputes"
          subtitle="Approve to update the record, or reject with an explanatory note."
          action={
            <div className="flex rounded-lg border border-slate-200 p-0.5">
              {(['pending', 'all'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cx(
                    'rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition',
                    filter === f ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          }
        />

        {disputes.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<Inbox size={24} />}
              title={filter === 'pending' ? 'No pending disputes' : 'No disputes yet'}
              description="Student correction requests will appear here for review."
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {disputes.map((dispute) => {
              const course = getCourse(db, dispute.courseId);
              const session = getSession(db, dispute.sessionId);
              const student = db.profiles.find((p) => p.id === dispute.studentId);
              return (
                <li key={dispute.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Avatar
                        name={dispute.studentName}
                        color={student?.avatarColor ?? '#64748B'}
                        size={38}
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{dispute.studentName}</p>
                        <p className="text-xs text-slate-500">
                          {course?.code} · {session ? formatDateTime(session.startedAt) : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone="info">Requests {dispute.requestedStatus}</Badge>
                      <Badge
                        tone={
                          dispute.status === 'pending'
                            ? 'pending'
                            : dispute.status === 'approved'
                              ? 'verified'
                              : 'rejected'
                        }
                      >
                        {dispute.status}
                      </Badge>
                    </div>
                  </div>

                  <p className="mt-3 flex gap-2 rounded-lg bg-slate-50 px-3.5 py-3 text-sm text-slate-700">
                    <MessageSquareWarning size={15} className="mt-0.5 shrink-0 text-slate-400" />
                    {dispute.message}
                  </p>

                  {dispute.status === 'pending' ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="success" size="sm" onClick={() => openResolve(dispute, 'approved')}>
                        <CheckCircle2 size={14} />
                        Approve &amp; update record
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openResolve(dispute, 'rejected')}>
                        <XCircle size={14} />
                        Reject
                      </Button>
                      <span className="ml-auto self-center text-xs text-slate-400">
                        Submitted {formatDateTime(dispute.createdAt)}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>
                        Resolved {dispute.resolvedAt ? formatDateTime(dispute.resolvedAt) : ''} by{' '}
                        {db.profiles.find((p) => p.id === dispute.resolvedById)?.name ?? '—'}
                      </span>
                      {dispute.resolutionNote ? (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">
                          “{dispute.resolutionNote}”
                        </span>
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={decision === 'approved' ? 'Approve correction' : 'Reject correction'}
        subtitle={target ? `${target.studentName} · requested ${target.requestedStatus}` : ''}
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button variant={decision === 'approved' ? 'success' : 'danger'} onClick={confirm}>
              {decision === 'approved' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              Confirm {decision}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {decision === 'approved' ? (
            <p className="rounded-lg border border-verified-100 bg-verified-50 px-3.5 py-2.5 text-sm text-verified-700">
              Approving sets {target?.studentName}&apos;s record to <strong>{target?.requestedStatus}</strong>{' '}
              and logs the change to the audit trail.
            </p>
          ) : (
            <p className="rounded-lg border border-rejected-100 bg-rejected-50 px-3.5 py-2.5 text-sm text-rejected-700">
              The record stays as-is. The rejection and your note are logged.
            </p>
          )}
          <Field label="Resolution note (optional)">
            <textarea
              className="ta-input min-h-[90px] resize-y"
              placeholder="Explain your decision for the audit trail…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
