import { useMemo } from 'react';
import { BookOpen, CalendarCheck, Percent, Trophy } from 'lucide-react';
import { Badge, Card, CardHeader, Progress, StatCard } from '../ui';
import { useApp } from '../../context/AppContext';
import { getCourse, overallStudentStats, studentCourseStats } from '../../lib/selectors';
import { cx } from '../../lib/utils';

function Ring({ value }: { value: number }) {
  const size = 176;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  const tone = value >= 85 ? '#10B981' : value >= 70 ? '#F59E0B' : '#EF4444';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold tabular text-slate-900">{value}%</span>
        <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Overall
        </span>
      </div>
    </div>
  );
}

export function StatsPanel() {
  const { db, currentUser } = useApp();

  const overall = useMemo(
    () => (currentUser ? overallStudentStats(db, currentUser.id) : { attended: 0, held: 0, rate: 0 }),
    [db, currentUser],
  );

  const courseStats = useMemo(() => {
    if (!currentUser?.courseIds) return [];
    return currentUser.courseIds.map((cid) => {
      const course = getCourse(db, cid);
      const stats = studentCourseStats(db, currentUser.id, cid);
      return { course, stats };
    });
  }, [db, currentUser]);

  const bestCourse = [...courseStats].sort((a, b) => b.stats.rate - a.stats.rate)[0];
  const rateTone = overall.rate >= 85 ? 'verified' : overall.rate >= 70 ? 'pending' : 'rejected';

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center justify-center gap-3 p-6">
          <Ring value={overall.rate} />
          <Badge tone={rateTone}>
            {overall.rate >= 85
              ? 'Excellent standing'
              : overall.rate >= 70
                ? 'Meets requirement'
                : 'Below requirement'}
          </Badge>
          <p className="text-center text-xs text-slate-500">
            {overall.attended} verified of {overall.held} recorded sessions
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="Attended"
            value={overall.attended}
            tone="verified"
            icon={<CalendarCheck size={14} />}
            hint="Verified check-ins"
          />
          <StatCard
            label="Sessions"
            value={overall.held}
            tone="neutral"
            icon={<BookOpen size={14} />}
            hint="Across your courses"
          />
          <StatCard
            label="Rate"
            value={`${overall.rate}%`}
            tone="primary"
            icon={<Percent size={14} />}
            hint="Present ÷ sessions"
          />
          <Card className="col-span-2 flex items-center gap-3 p-4 sm:col-span-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Trophy size={17} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {bestCourse?.course
                  ? `Strongest in ${bestCourse.course.code}`
                  : 'No course data yet'}
              </p>
              <p className="text-xs text-slate-500">
                {bestCourse?.course
                  ? `${bestCourse.stats.rate}% attendance across ${bestCourse.stats.held} sessions.`
                  : 'Enroll in a course to start tracking attendance.'}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          icon={<BookOpen size={16} />}
          title="Per-course progress"
          subtitle="Your attendance rate for each enrolled course."
        />
        <div className="divide-y divide-slate-100">
          {courseStats.map(({ course, stats }) => {
            if (!course) return null;
            const tone = stats.rate >= 85 ? 'verified' : stats.rate >= 70 ? 'pending' : 'rejected';
            return (
              <div key={course.id} className="p-4 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-9 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: course.color }}
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {course.code} · {course.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {stats.attended} of {stats.held} sessions · {course.schedule}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cx(
                      'shrink-0 text-lg font-extrabold tabular',
                      tone === 'verified'
                        ? 'text-verified-600'
                        : tone === 'pending'
                          ? 'text-pending-600'
                          : 'text-rejected-600',
                    )}
                  >
                    {stats.rate}%
                  </span>
                </div>
                <Progress value={stats.rate} tone={tone} className="mt-3" />
              </div>
            );
          })}
          {courseStats.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No enrolled courses.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
