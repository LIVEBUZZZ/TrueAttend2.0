// ---------------------------------------------------------------------------
// TrueAttend — derived data selectors
// ---------------------------------------------------------------------------

import type {
  AttendanceRecord,
  Course,
  Database,
  Profile,
  Session,
} from '../types';
import { isSessionLive } from './engine';
import { pct } from './utils';

export function getCourse(db: Database, id: string | undefined): Course | undefined {
  return id ? db.courses.find((c) => c.id === id) : undefined;
}

export function getProfile(db: Database, id: string | undefined): Profile | undefined {
  return id ? db.profiles.find((p) => p.id === id) : undefined;
}

export function getSession(db: Database, id: string | undefined): Session | undefined {
  return id ? db.sessions.find((s) => s.id === id) : undefined;
}

export function courseStudents(db: Database, courseId: string): Profile[] {
  const course = getCourse(db, courseId);
  if (!course) return [];
  return course.enrolledStudentIds
    .map((id) => getProfile(db, id))
    .filter((p): p is Profile => Boolean(p));
}

export interface SessionKPIs {
  total: number;
  present: number;
  absent: number;
  pending: number;
  rejected: number;
  attendanceRate: number;
}

/** KPIs for a single session, counted against the course roster. */
export function sessionKPIs(db: Database, session: Session): SessionKPIs {
  const roster = courseStudents(db, session.courseId);
  const records = db.attendanceRecords.filter((r) => r.sessionId === session.id);
  const byStudent = new Map(records.map((r) => [r.studentId, r]));

  let present = 0;
  let pending = 0;
  let rejected = 0;
  roster.forEach((student) => {
    const rec = byStudent.get(student.id);
    if (rec?.status === 'present') present += 1;
    else if (rec?.status === 'pending') pending += 1;
    else if (rec?.status === 'rejected') rejected += 1;
  });
  const total = roster.length;
  const absent = Math.max(0, total - present - pending - rejected);
  return { total, present, absent, pending, rejected, attendanceRate: pct(present, total) };
}

/** Student's own attendance percentage for one course. */
export function studentCourseStats(
  db: Database,
  studentId: string,
  courseId: string,
): { attended: number; held: number; rate: number } {
  const heldSessions = db.sessions.filter((s) => s.courseId === courseId && s.status !== 'active');
  const records = db.attendanceRecords.filter(
    (r) => r.studentId === studentId && r.courseId === courseId,
  );
  const present = records.filter((r) => r.status === 'present').length;
  const held = Math.max(heldSessions.length, present);
  return { attended: present, held, rate: pct(present, held) };
}

export function overallStudentStats(
  db: Database,
  studentId: string,
): { attended: number; held: number; rate: number } {
  const student = getProfile(db, studentId);
  const courseIds = student?.courseIds ?? [];
  let attended = 0;
  let held = 0;
  courseIds.forEach((cid) => {
    const s = studentCourseStats(db, studentId, cid);
    attended += s.attended;
    held += s.held;
  });
  return { attended, held, rate: pct(attended, held) };
}

export function studentRecords(db: Database, studentId: string): AttendanceRecord[] {
  return db.attendanceRecords
    .filter((r) => r.studentId === studentId)
    .sort((a, b) => b.verifiedAt - a.verifiedAt);
}

/** Live (active + unexpired) sessions the student is enrolled in. */
export function studentLiveSessions(db: Database, studentId: string, at: number): Session[] {
  const student = getProfile(db, studentId);
  const courseIds = student?.courseIds ?? [];
  return db.sessions
    .filter((s) => isSessionLive(s, at) && courseIds.includes(s.courseId))
    .sort((a, b) => b.startedAt - a.startedAt);
}

export function instructorActiveSessions(db: Database, instructorId: string, at: number): Session[] {
  return db.sessions
    .filter((s) => s.instructorId === instructorId && isSessionLive(s, at))
    .sort((a, b) => b.startedAt - a.startedAt);
}

/** Per-course attendance rate for the analytics chart. */
export function courseAttendanceSeries(
  db: Database,
  courses: Course[],
): Array<{ name: string; code: string; rate: number; present: number; total: number; color: string }> {
  return courses.map((course) => {
    const withdrawn = db.sessions.filter(
      (s) => s.courseId === course.id && s.status !== 'active',
    );
    let present = 0;
    let total = 0;
    withdrawn.forEach((session) => {
      const k = sessionKPIs(db, session);
      present += k.present;
      total += k.total;
    });
    return {
      name: course.code,
      code: course.code,
      rate: pct(present, total),
      present,
      total,
      color: course.color,
    };
  });
}

/** Attendance trend across the most recent sessions of a course. */
export function sessionTrend(
  db: Database,
  courseId: string,
  limit = 6,
): Array<{ name: string; rate: number; present: number; total: number }> {
  return db.sessions
    .filter((s) => s.courseId === courseId && s.status !== 'active')
    .sort((a, b) => a.startedAt - b.startedAt)
    .slice(-limit)
    .map((session) => {
      const k = sessionKPIs(db, session);
      return {
        name: new Date(session.startedAt).toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
        }),
        rate: k.attendanceRate,
        present: k.present,
        total: k.total,
      };
    });
}
