// ---------------------------------------------------------------------------
// TrueAttend — Verification engine
// ---------------------------------------------------------------------------
// Pure, framework-agnostic functions that encode the business rules of the
// Verify → Record → Monitor workflow. Every mutation is written as a
// "pure-ish" operation: it clones the database, applies the change and returns
// the new database plus a structured result. That makes the exact same code
// path usable by the live app *and* by the Edge-Case Validation Suite, which
// runs against a throwaway clone.
// ---------------------------------------------------------------------------

import type {
  AttendanceRecord,
  AttendanceStatus,
  AuditAction,
  AuditLog,
  CheckInErrorCode,
  CorrectionDispute,
  Database,
  DisputeStatus,
  Profile,
  Session,
  VerificationMode,
} from '../types';
import { DEMO_LIVE_SESSION_ID } from './seed';
import { generateSessionToken, uid } from './utils';

function clone(db: Database): Database {
  return typeof structuredClone === 'function'
    ? structuredClone(db)
    : (JSON.parse(JSON.stringify(db)) as Database);
}

function now0(input?: number): number {
  return input ?? Date.now();
}

function log(
  db: Database,
  actor: { id: string; name: string; role: Profile['role'] | 'system' },
  action: AuditAction,
  targetType: AuditLog['targetType'],
  detail: string,
  opts: { targetId?: string; reason?: string; timestamp?: number } = {},
): AuditLog {
  const entry: AuditLog = {
    id: uid('aud'),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    targetType,
    targetId: opts.targetId,
    reason: opts.reason,
    detail,
    timestamp: opts.timestamp ?? Date.now(),
  };
  db.auditLogs.unshift(entry);
  return entry;
}

const normalize = (v: string) => v.trim().toUpperCase();

/**
 * Appends an audit entry to a (already cloned) database. Exposed so the context
 * layer can record auth + navigation events through the same writer as the
 * engine's own rules.
 */
export function appendAudit(
  db: Database,
  actorId: string,
  action: AuditAction,
  targetType: AuditLog['targetType'],
  detail: string,
  opts: { targetId?: string; reason?: string; timestamp?: number } = {},
): AuditLog | null {
  const actor = findProfile(db, actorId);
  if (!actor) return null;
  return log(db, actor, action, targetType, detail, opts);
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------
export function findProfile(db: Database, id: string): Profile | undefined {
  return db.profiles.find((p) => p.id === id);
}

export function findSession(
  db: Database,
  opts: { sessionId?: string; token?: string },
): Session | undefined {
  if (opts.sessionId) return db.sessions.find((s) => s.id === opts.sessionId);
  if (opts.token) {
    const t = normalize(opts.token);
    return db.sessions.find((s) => normalize(s.sessionToken) === t);
  }
  return undefined;
}

export function hasAttendanceRecord(db: Database, studentId: string, sessionId: string): boolean {
  return db.attendanceRecords.some(
    (r) => r.studentId === studentId && r.sessionId === sessionId,
  );
}

/** A session is "live" only while active and not past its expiry. */
export function isSessionLive(session: Session, at: number): boolean {
  return session.status === 'active' && at < session.expiresAt;
}

export function liveSessions(db: Database, at: number): Session[] {
  return db.sessions.filter((s) => isSessionLive(s, at));
}

/** Recomputes an expired-but-still-'active' session's status in place. */
function settleStatus(session: Session, at: number): void {
  if (session.status === 'active' && at >= session.expiresAt) {
    session.status = 'expired';
  }
}

// ---------------------------------------------------------------------------
// Check-in (the "Verify" + "Record" steps)
// ---------------------------------------------------------------------------
export interface CheckInInput {
  actorId: string;
  sessionId?: string;
  token?: string;
  credentials?: { studentId: string; pin: string };
  biometricConsent?: boolean;
  biometricMatch?: boolean;
  now?: number;
}

export type CheckInOutcome =
  | { ok: true; db: Database; record: AttendanceRecord; session: Session }
  | { ok: false; db: Database; code: CheckInErrorCode; message: string };

export function attemptCheckIn(db: Database, input: CheckInInput): CheckInOutcome {
  const next = clone(db);
  const at = now0(input.now);
  const actor = findProfile(next, input.actorId);

  if (!actor) {
    return { ok: false, db: next, code: 'UNAUTHORIZED', message: 'Unknown account.' };
  }

  // 1) Role guard — only students may check in.
  if (actor.role !== 'student') {
    log(
      next,
      actor,
      'access_denied',
      'attendance',
      `Blocked check-in attempt by ${actor.role} account ${actor.name}.`,
      { timestamp: at },
    );
    return {
      ok: false,
      db: next,
      code: 'UNAUTHORIZED',
      message: 'Only student accounts can check in to a session.',
    };
  }

  // 2) Resolve the session.
  const session = findSession(next, { sessionId: input.sessionId, token: input.token });
  if (!session) {
    return {
      ok: false,
      db: next,
      code: 'SESSION_NOT_FOUND',
      message: 'No session matches that code. Check the 6-character code and try again.',
    };
  }

  if (session.status === 'ended') {
    return {
      ok: false,
      db: next,
      code: 'SESSION_ENDED',
      message: 'This session has already been ended by the instructor.',
    };
  }

  // 3) Expiry guard (the "expired token rejection" edge case).
  if (at >= session.expiresAt) {
    settleStatus(session, at);
    log(
      next,
      actor,
      'attendance_rejected_expired',
      'attendance',
      `Rejected expired check-in for ${actor.name} (session ${session.sessionToken}).`,
      { targetId: session.id, timestamp: at },
    );
    return {
      ok: false,
      db: next,
      code: 'SESSION_EXPIRED',
      message: 'This session token has expired. Ask your instructor for a new session.',
    };
  }

  // 4) Enrolment guard.
  if (actor.courseIds && !actor.courseIds.includes(session.courseId)) {
    return {
      ok: false,
      db: next,
      code: 'NOT_ENROLLED',
      message: 'You are not enrolled in the course for this session.',
    };
  }

  // 5) Mode-specific verification.
  if (session.verificationMode === 'qr_token') {
    if (!input.token || normalize(input.token) !== normalize(session.sessionToken)) {
      return {
        ok: false,
        db: next,
        code: 'TOKEN_INVALID',
        message: 'The session code is incorrect. Scan the QR or retype the 6-character code.',
      };
    }
  } else if (session.verificationMode === 'credentials') {
    const okCreds =
      input.credentials &&
      input.credentials.studentId.trim().toLowerCase() === actor.studentId?.toLowerCase() &&
      input.credentials.pin === actor.pin;
    if (!okCreds) {
      return {
        ok: false,
        db: next,
        code: 'CREDENTIALS_INVALID',
        message: 'Student ID or PIN is incorrect.',
      };
    }
  } else if (session.verificationMode === 'biometric_check') {
    if (!input.biometricConsent || !input.biometricMatch) {
      return {
        ok: false,
        db: next,
        code: 'BIOMETRIC_DENIED',
        message: 'Face check was not completed or consent was not given.',
      };
    }
  }

  // 6) Duplicate guard — enforce unique (student_id, session_id).
  if (hasAttendanceRecord(next, actor.id, session.id)) {
    log(
      next,
      actor,
      'attendance_rejected_duplicate',
      'attendance',
      `Rejected duplicate check-in for ${actor.name} (session ${session.sessionToken}).`,
      { targetId: session.id, timestamp: at },
    );
    return {
      ok: false,
      db: next,
      code: 'DUPLICATE',
      message: 'You have already checked in to this session. Duplicate records are blocked.',
    };
  }

  // 7) Record it.
  const record: AttendanceRecord = {
    id: uid('att'),
    studentId: actor.id,
    sessionId: session.id,
    courseId: session.courseId,
    status: 'present',
    verifiedAt: at,
    method: session.verificationMode,
    verificationNote:
      session.verificationMode === 'qr_token'
        ? 'Dynamic QR / token verified'
        : session.verificationMode === 'credentials'
          ? 'Student ID + PIN verified'
          : 'Webcam face check verified',
  };
  next.attendanceRecords.push(record);
  log(next, actor, 'attendance_verified', 'attendance', `${actor.name} verified via ${record.verificationNote}.`, {
    targetId: record.id,
    timestamp: at,
  });

  return { ok: true, db: next, record, session };
}

// ---------------------------------------------------------------------------
// Manual override (audit-logged, reason mandatory)
// ---------------------------------------------------------------------------
export interface OverrideInput {
  actorId: string;
  sessionId: string;
  studentId: string;
  newStatus: AttendanceStatus;
  reason: string;
  now?: number;
}

export type OverrideOutcome =
  | { ok: true; db: Database; record: AttendanceRecord; auditId: string }
  | { ok: false; code: 'REASON_REQUIRED' | 'NOT_FOUND'; message: string };

export function manualOverride(db: Database, input: OverrideInput): OverrideOutcome {
  const next = clone(db);
  const at = now0(input.now);

  if (!input.reason || !input.reason.trim()) {
    return {
      ok: false,
      code: 'REASON_REQUIRED',
      message: 'A reason is required for every manual override.',
    };
  }

  const actor = findProfile(next, input.actorId);
  if (!actor) return { ok: false, code: 'NOT_FOUND', message: 'Unknown account.' };

  const session = next.sessions.find((s) => s.id === input.sessionId);
  const student = findProfile(next, input.studentId);
  if (!session || !student) {
    return { ok: false, code: 'NOT_FOUND', message: 'Session or student not found.' };
  }

  let record = next.attendanceRecords.find(
    (r) => r.studentId === input.studentId && r.sessionId === input.sessionId,
  );
  const previous = record?.status;
  if (!record) {
    record = {
      id: uid('att'),
      studentId: input.studentId,
      sessionId: input.sessionId,
      courseId: session.courseId,
      status: input.newStatus,
      verifiedAt: at,
      method: 'manual',
      verificationNote: `Manually set by ${actor.name}`,
    };
    next.attendanceRecords.push(record);
  } else {
    record.status = input.newStatus;
    record.method = 'manual';
    record.verifiedAt = at;
    record.verificationNote = `Manually set by ${actor.name}`;
  }

  const entry = log(
    next,
    actor,
    'manual_override',
    'attendance',
    `${actor.name} manually set ${student.name} to ${input.newStatus}${previous ? ` (was ${previous})` : ''}.`,
    { targetId: record.id, reason: input.reason.trim(), timestamp: at },
  );

  return { ok: true, db: next, record, auditId: entry.id };
}

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------
export function createDispute(
  db: Database,
  input: {
    studentId: string;
    sessionId: string;
    message: string;
    requestedStatus: AttendanceStatus;
    now?: number;
  },
): { db: Database; dispute: CorrectionDispute | null; error?: string } {
  const next = clone(db);
  const at = now0(input.now);
  const student = findProfile(next, input.studentId);
  const session = next.sessions.find((s) => s.id === input.sessionId);
  if (!student || !session) return { db: next, dispute: null, error: 'Session or student not found.' };
  if (!input.message.trim()) return { db: next, dispute: null, error: 'Please describe the issue.' };

  const record = next.attendanceRecords.find(
    (r) => r.studentId === input.studentId && r.sessionId === input.sessionId,
  );

  const dispute: CorrectionDispute = {
    id: uid('dsp'),
    studentId: student.id,
    studentName: student.name,
    sessionId: session.id,
    courseId: session.courseId,
    attendanceRecordId: record?.id,
    message: input.message.trim(),
    requestedStatus: input.requestedStatus,
    status: 'pending',
    createdAt: at,
  };
  next.disputes.unshift(dispute);
  log(next, student, 'dispute_created', 'dispute', `${student.name} requested a record review.`, {
    targetId: dispute.id,
    timestamp: at,
  });
  return { db: next, dispute };
}

export function resolveDispute(
  db: Database,
  input: {
    disputeId: string;
    actorId: string;
    decision: Extract<DisputeStatus, 'approved' | 'rejected'>;
    note?: string;
    now?: number;
  },
): { db: Database; ok: boolean } {
  const next = clone(db);
  const at = now0(input.now);
  const actor = findProfile(next, input.actorId);
  const dispute = next.disputes.find((d) => d.id === input.disputeId);
  if (!dispute || !actor) return { db: next, ok: false };

  dispute.status = input.decision;
  dispute.resolvedAt = at;
  dispute.resolvedById = actor.id;
  dispute.resolutionNote = input.note?.trim() || undefined;

  if (input.decision === 'approved') {
    let record = next.attendanceRecords.find(
      (r) => r.studentId === dispute.studentId && r.sessionId === dispute.sessionId,
    );
    if (!record) {
      const course = next.courses.find((c) => c.id === dispute.courseId);
      record = {
        id: uid('att'),
        studentId: dispute.studentId,
        sessionId: dispute.sessionId,
        courseId: dispute.courseId ?? course?.id ?? '',
        status: dispute.requestedStatus,
        verifiedAt: at,
        method: 'manual',
        verificationNote: `Corrected via dispute by ${actor.name}`,
      };
      next.attendanceRecords.push(record);
    } else {
      record.status = dispute.requestedStatus;
      record.method = 'manual';
      record.verificationNote = `Corrected via dispute by ${actor.name}`;
    }
    dispute.attendanceRecordId = record.id;
  }

  log(
    next,
    actor,
    input.decision === 'approved' ? 'dispute_approved' : 'dispute_rejected',
    'dispute',
    `${actor.name} ${input.decision} ${dispute.studentName}'s correction request.`,
    { targetId: dispute.id, reason: input.note?.trim(), timestamp: at },
  );

  return { db: next, ok: true };
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------
export function createSession(
  db: Database,
  input: {
    courseId: string;
    instructorId: string;
    verificationMode: VerificationMode;
    durationMinutes: number;
    now?: number;
  },
): { db: Database; session: Session } {
  const next = clone(db);
  const at = now0(input.now);
  const instructor = findProfile(next, input.instructorId);
  const course = next.courses.find((c) => c.id === input.courseId);

  const session: Session = {
    id: uid('ses'),
    courseId: input.courseId,
    instructorId: input.instructorId,
    sessionToken: generateSessionToken(),
    verificationMode: input.verificationMode,
    startedAt: at,
    expiresAt: at + input.durationMinutes * 60_000,
    durationMinutes: input.durationMinutes,
    status: 'active',
  };
  next.sessions.unshift(session);

  if (instructor) {
    log(
      next,
      instructor,
      'session_created',
      'session',
      `${instructor.name} launched a live session for ${course?.code ?? input.courseId} (${input.verificationMode}, ${input.durationMinutes} min).`,
      { targetId: session.id, timestamp: at },
    );
  }
  return { db: next, session };
}

export function endSession(
  db: Database,
  input: { sessionId: string; actorId: string; note?: string; now?: number },
): { db: Database; ok: boolean } {
  const next = clone(db);
  const at = now0(input.now);
  const session = next.sessions.find((s) => s.id === input.sessionId);
  const actor = findProfile(next, input.actorId);
  if (!session) return { db: next, ok: false };

  // Any enrolled student who never checked in is recorded absent on close.
  const course = next.courses.find((c) => c.id === session.courseId);
  course?.enrolledStudentIds.forEach((studentId) => {
    if (!hasAttendanceRecord(next, studentId, session.id)) {
      next.attendanceRecords.push({
        id: uid('att'),
        studentId,
        sessionId: session.id,
        courseId: session.courseId,
        status: 'absent',
        verifiedAt: at,
        method: 'manual',
        verificationNote: 'No check-in recorded',
      });
    }
  });

  session.status = 'ended';
  session.endedAt = at;
  if (input.note) session.note = input.note;

  if (actor) {
    log(next, actor, 'session_ended', 'session', `${actor.name} ended the session.`, {
      targetId: session.id,
      reason: input.note,
      timestamp: at,
    });
  }
  return { db: next, ok: true };
}

/**
 * Bootstrap helper: the seeded live session's clock is refreshed on load so the
 * demo always has one live session to interact with, regardless of when it is
 * opened. Historical sessions and existing check-ins are untouched.
 */
export function refreshDemoLiveSession(db: Database, at: number = Date.now()): Database {
  const next = clone(db);
  const live = next.sessions.find((s) => s.id === DEMO_LIVE_SESSION_ID);
  if (!live) {
    const { db: created } = createSession(next, {
      courseId: 'crs_cs201',
      instructorId: next.courses[0]?.instructorId ?? '',
      verificationMode: 'qr_token',
      durationMinutes: 12,
      now: at,
    });
    return created;
  }
  if (live.expiresAt <= at || live.status !== 'active') {
    live.status = 'active';
    live.startedAt = at - 3 * 60_000;
    live.expiresAt = at + 9 * 60_000;
    live.durationMinutes = 12;
    live.endedAt = undefined;
    live.sessionToken = generateSessionToken();
  }
  return next;
}
