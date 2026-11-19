import { useState } from 'react';
import {
  BarChart3,
  Rocket,
  Radio,
  Activity,
  Scale,
  ScrollText,
  CalendarClock,
} from 'lucide-react';
import { Badge } from '../components/ui';
import { SessionLauncher } from '../components/instructor/SessionLauncher';
import { LiveSessions } from '../components/instructor/LiveSessions';
import { Monitor } from '../components/instructor/Monitor';
import { DisputesPanel } from '../components/instructor/DisputesPanel';
import { AuditLogPanel } from '../components/instructor/AuditLogPanel';
import { AnalyticsPanel } from '../components/instructor/AnalyticsPanel';
import { useApp } from '../context/AppContext';
import { useNow } from '../hooks/useNow';
import { cx } from '../lib/utils';

type Tab = 'launcher' | 'live' | 'monitor' | 'disputes' | 'audit' | 'analytics';

const TABS: Array<{ id: Tab; label: string; icon: typeof Rocket }> = [
  { id: 'launcher', label: 'Launcher', icon: Rocket },
  { id: 'live', label: 'Live Session', icon: Radio },
  { id: 'monitor', label: 'Monitor', icon: Activity },
  { id: 'disputes', label: 'Disputes', icon: Scale },
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function InstructorConsole() {
  const { db, currentUser } = useApp();
  const now = useNow(1000);
  const [tab, setTab] = useState<Tab>('launcher');
  const [monitorSessionId, setMonitorSessionId] = useState<string | null>(null);

  const liveCount = db.sessions.filter(
    (s) => s.instructorId === currentUser?.id && s.status === 'active' && now < s.expiresAt,
  ).length;
  const pendingDisputes = db.disputes.filter((d) => d.status === 'pending').length;

  const openMonitor = (sessionId: string) => {
    setMonitorSessionId(sessionId);
    setTab('monitor');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary-600">Instructor Console</p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900">
            Good to see you, {currentUser?.name.split(' ').slice(-1)[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Launch sessions, watch attendance land in real time and keep every record accountable.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={liveCount ? 'verified' : 'neutral'}>
            <Radio size={12} />
            {liveCount} live session{liveCount === 1 ? '' : 's'}
          </Badge>
          {pendingDisputes > 0 ? (
            <Badge tone="pending">
              <Scale size={12} />
              {pendingDisputes} dispute{pendingDisputes === 1 ? '' : 's'}
            </Badge>
          ) : null}
          <Badge tone="neutral">
            <CalendarClock size={12} />
            {db.courses.filter((c) => c.instructorId === currentUser?.id).length} courses
          </Badge>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              'flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition',
              tab === t.id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            <t.icon size={15} />
            {t.label}
            {t.id === 'live' && liveCount > 0 ? (
              <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-verified-100 px-1.5 text-[10px] font-bold text-verified-700">
                {liveCount}
              </span>
            ) : null}
            {t.id === 'disputes' && pendingDisputes > 0 ? (
              <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-pending-100 px-1.5 text-[10px] font-bold text-pending-700">
                {pendingDisputes}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {tab === 'launcher' ? <SessionLauncher onLaunched={() => setTab('live')} /> : null}
        {tab === 'live' ? <LiveSessions onOpenMonitor={openMonitor} /> : null}
        {tab === 'monitor' ? (
          <Monitor sessionId={monitorSessionId} onSelectSession={setMonitorSessionId} />
        ) : null}
        {tab === 'disputes' ? <DisputesPanel /> : null}
        {tab === 'audit' ? <AuditLogPanel /> : null}
        {tab === 'analytics' ? <AnalyticsPanel /> : null}
      </div>
    </div>
  );
}
