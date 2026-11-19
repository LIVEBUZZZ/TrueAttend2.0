import { useState } from 'react';
import { CalendarClock, History, QrCode, TrendingUp } from 'lucide-react';
import { Badge } from '../components/ui';
import { CheckInFlow } from '../components/student/CheckInFlow';
import { StatsPanel } from '../components/student/StatsPanel';
import { HistoryPanel } from '../components/student/HistoryPanel';
import { useApp } from '../context/AppContext';
import { useNow } from '../hooks/useNow';
import { overallStudentStats, studentLiveSessions } from '../lib/selectors';
import { cx } from '../lib/utils';

type Tab = 'checkin' | 'stats' | 'history';

const TABS: Array<{ id: Tab; label: string; icon: typeof QrCode }> = [
  { id: 'checkin', label: 'Check In', icon: QrCode },
  { id: 'stats', label: 'My Stats', icon: TrendingUp },
  { id: 'history', label: 'History', icon: History },
];

export default function StudentPortal() {
  const { db, currentUser } = useApp();
  const now = useNow(1000);
  const [tab, setTab] = useState<Tab>('checkin');

  const live = currentUser ? studentLiveSessions(db, currentUser.id, now) : [];
  const overall = currentUser
    ? overallStudentStats(db, currentUser.id)
    : { attended: 0, held: 0, rate: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary-600">Student Portal</p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900">
            Hi {currentUser?.name.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Check in to a live session in seconds and keep your own attendance record.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {live.length > 0 ? (
            <Badge tone="verified">
              <QrCode size={12} />
              {live.length} live session{live.length === 1 ? '' : 's'}
            </Badge>
          ) : (
            <Badge tone="neutral">
              <CalendarClock size={12} />
              No live sessions
            </Badge>
          )}
          <Badge tone={overall.rate >= 85 ? 'verified' : overall.rate >= 70 ? 'pending' : 'rejected'}>
            <TrendingUp size={12} />
            {overall.rate}% attendance
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
            {t.id === 'checkin' && live.length > 0 ? (
              <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-verified-100 px-1.5 text-[10px] font-bold text-verified-700">
                {live.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {tab === 'checkin' ? <CheckInFlow onGoToHistory={() => setTab('history')} /> : null}
        {tab === 'stats' ? <StatsPanel /> : null}
        {tab === 'history' ? <HistoryPanel /> : null}
      </div>
    </div>
  );
}
