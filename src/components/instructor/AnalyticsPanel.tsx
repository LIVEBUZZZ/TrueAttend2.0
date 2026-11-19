import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Download, FileText, Printer, TrendingUp } from 'lucide-react';
import { Button, Card, CardHeader, StatCard } from '../ui';
import { useApp } from '../../context/AppContext';
import {
  courseAttendanceSeries,
  getCourse,
  getProfile,
  getSession,
  sessionTrend,
} from '../../lib/selectors';
import { downloadCsv, toCsv } from '../../lib/csv';
import { formatDateTime, formatTime, pct } from '../../lib/utils';

export function AnalyticsPanel() {
  const { db, currentUser } = useApp();
  const courses = useMemo(
    () => db.courses.filter((c) => c.instructorId === currentUser?.id),
    [db.courses, currentUser?.id],
  );
  const [trendCourse, setTrendCourse] = useState(courses[0]?.id ?? '');

  const series = useMemo(() => courseAttendanceSeries(db, courses), [db, courses]);
  const trend = useMemo(
    () => (trendCourse ? sessionTrend(db, trendCourse, 6) : []),
    [db, trendCourse],
  );

  const totalPresent = series.reduce((a, s) => a + s.present, 0);
  const totalSlots = series.reduce((a, s) => a + s.total, 0);
  const overallRate = pct(totalPresent, totalSlots);
  const trendCourseObj = getCourse(db, trendCourse);

  const exportAll = () => {
    const rows = db.attendanceRecords
      .filter((r) => courses.some((c) => c.id === r.courseId))
      .sort((a, b) => b.verifiedAt - a.verifiedAt)
      .map((record) => {
        const course = getCourse(db, record.courseId);
        const session = getSession(db, record.sessionId);
        const student = getProfile(db, record.studentId);
        return {
          course: course?.code ?? '',
          studentId: student?.studentId ?? '',
          student: student?.name ?? '',
          session: session ? formatDateTime(session.startedAt) : '',
          status: record.status,
          verifiedAt: record.status === 'present' ? formatTime(record.verifiedAt) : '—',
          method: record.method,
        };
      });
    const csv = toCsv(rows, [
      { header: 'Course', value: (r) => r.course },
      { header: 'Student ID', value: (r) => r.studentId },
      { header: 'Student', value: (r) => r.student },
      { header: 'Session', value: (r) => r.session },
      { header: 'Status', value: (r) => r.status },
      { header: 'Verified At', value: (r) => r.verifiedAt },
      { header: 'Method', value: (r) => r.method },
    ]);
    downloadCsv('trueattend-attendance-export.csv', csv);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Courses" value={courses.length} hint="Taught by you" />
        <StatCard label="Check-ins" value={totalPresent} tone="verified" hint="Across all courses" />
        <StatCard label="Slots" value={totalSlots} tone="neutral" hint="Student × session" />
        <StatCard
          label="Overall rate"
          value={`${overallRate}%`}
          tone="primary"
          icon={<TrendingUp size={14} />}
          hint="Present ÷ slots"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            icon={<BarChart3 size={16} />}
            title="Attendance by course"
            subtitle="Aggregate present rate across recorded sessions."
          />
          <div className="p-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    unit="%"
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(79,70,229,0.06)' }}
                    formatter={(v: number) => [`${v}%`, 'Attendance']}
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid #E2E8F0',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {series.map((s) => (
                      <Cell key={s.code} fill={s.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            icon={<TrendingUp size={16} />}
            title="Session trend"
            subtitle="Attendance rate across the most recent sessions."
            action={
              <select
                className="ta-input w-auto text-xs"
                value={trendCourse}
                onChange={(e) => setTrendCourse(e.target.value)}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
            }
          />
          <div className="p-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    unit="%"
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, 'Attendance']}
                    contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke={trendCourseObj?.color ?? '#4F46E5'}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: trendCourseObj?.color ?? '#4F46E5' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <FileText size={18} />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">Export &amp; reporting</p>
            <p className="text-xs text-slate-500">
              Download the full attendance ledger or print a printable summary for records.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <Button variant="outline" onClick={exportAll}>
            <Download size={15} />
            Export CSV
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={15} />
            Print Summary
          </Button>
        </div>
      </Card>

      {/* Printable summary */}
      <Card className="p-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <p className="text-sm font-bold text-slate-900">Summary report</p>
            <p className="text-xs text-slate-500">
              Generated {formatDateTime(Date.now())} · {currentUser?.name}
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">TrueAttend</span>
        </div>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-2">Course</th>
              <th className="py-2">Title</th>
              <th className="py-2 text-right">Present</th>
              <th className="py-2 text-right">Slots</th>
              <th className="py-2 text-right">Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {series.map((s) => {
              const course = courses.find((c) => c.code === s.code);
              return (
                <tr key={s.code}>
                  <td className="py-2 font-medium text-slate-800">{s.code}</td>
                  <td className="py-2 text-slate-600">{course?.title}</td>
                  <td className="py-2 text-right tabular text-slate-700">{s.present}</td>
                  <td className="py-2 text-right tabular text-slate-700">{s.total}</td>
                  <td className="py-2 text-right tabular font-semibold text-slate-900">{s.rate}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
