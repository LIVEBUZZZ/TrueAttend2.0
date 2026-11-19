import { useMemo, useState } from 'react';
import {
  AlertOctagon,
  Ban,
  CircleSlash,
  FileClock,
  LogIn,
  LogOut,
  Play,
  PlusCircle,
  ScrollText,
  ShieldCheck,
  StopCircle,
  TriangleAlert,
  UserRoundPen,
} from 'lucide-react';
import { Badge, Card, CardHeader, EmptyState, type BadgeTone } from '../ui';
import { useApp } from '../../context/AppContext';
import type { AuditAction, AuditLog } from '../../types';
import { formatDateTime } from '../../lib/utils';

const ACTION_META: Record<AuditAction, { label: string; tone: BadgeTone; icon: typeof ScrollText }> = {
  session_created: { label: 'Session launched', tone: 'primary', icon: Play },
  session_ended: { label: 'Session ended', tone: 'neutral', icon: StopCircle },
  attendance_verified: { label: 'Attendance verified', tone: 'verified', icon: ShieldCheck },
  attendance_rejected_duplicate: { label: 'Duplicate blocked', tone: 'pending', icon: CircleSlash },
  attendance_rejected_expired: { label: 'Expired token blocked', tone: 'pending', icon: TriangleAlert },
  manual_override: { label: 'Manual override', tone: 'pending', icon: UserRoundPen },
  dispute_created: { label: 'Dispute filed', tone: 'info', icon: PlusCircle },
  dispute_approved: { label: 'Dispute approved', tone: 'verified', icon: ShieldCheck },
  dispute_rejected: { label: 'Dispute rejected', tone: 'rejected', icon: Ban },
  access_denied: { label: 'Access denied', tone: 'rejected', icon: AlertOctagon },
  login: { label: 'Sign in', tone: 'neutral', icon: LogIn },
  logout: { label: 'Sign out', tone: 'neutral', icon: LogOut },
};

export function AuditLogPanel() {
  const { db } = useApp();
  const [action, setAction] = useState<'all' | AuditAction>('all');

  const logs = useMemo(
    () =>
      db.auditLogs
        .filter((l) => (action === 'all' ? true : l.action === action))
        .sort((a, b) => b.timestamp - a.timestamp),
    [db.auditLogs, action],
  );

  const presentActions = useMemo(
    () => Array.from(new Set(db.auditLogs.map((l) => l.action))),
    [db.auditLogs],
  );

  return (
    <Card>
      <CardHeader
        icon={<ScrollText size={16} />}
        title="Audit log"
        subtitle="An append-only record of every session event, verification and override."
        action={
          <select
            className="ta-input w-auto text-xs"
            value={action}
            onChange={(e) => setAction(e.target.value as typeof action)}
          >
            <option value="all">All actions</option>
            {presentActions.map((a) => (
              <option key={a} value={a}>
                {ACTION_META[a].label}
              </option>
            ))}
          </select>
        }
      />

      {logs.length === 0 ? (
        <div className="p-5">
          <EmptyState icon={<FileClock size={24} />} title="No audit entries" />
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {logs.map((log: AuditLog) => {
            const meta = ACTION_META[log.action];
            return (
              <li key={log.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                <Badge tone={meta.tone} className="mt-0.5 shrink-0">
                  <meta.icon size={12} />
                  {meta.label}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">{log.detail}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                    <span>
                      <span className="font-medium text-slate-500">{log.actorName}</span> ·{' '}
                      {log.actorRole}
                    </span>
                    <span className="tabular">{formatDateTime(log.timestamp)}</span>
                    {log.targetId ? (
                      <span className="font-mono text-[10px] text-slate-400">{log.targetId}</span>
                    ) : null}
                  </p>
                  {log.reason ? (
                    <p className="mt-1.5 rounded-md border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                      Reason: {log.reason}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
