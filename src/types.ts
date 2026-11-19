// ---------------------------------------------------------------------------
// TrueAttend — Domain model
// ---------------------------------------------------------------------------
// These types mirror the shape of a relational backend (Supabase/Postgres
// tables) so the localStorage adapter in `lib/storage.ts` can be swapped for a
// real API by replacing the persistence functions only.
// ---------------------------------------------------------------------------

export type Role = 'student' | 'instructor';

export type VerificationMode = 'qr_token' | 'credentials' | 'biometric_check';

export type AttendanceStatus = 'present' | 'absent' | 'pending' | 'rejected';

export type SessionStatus = 'active' | 'ended' | 'expired';

export type DisputeStatus = 'pending' | 'approved' | 'rejected';

export type AuditAction =
  | 'session_created'
  | 'session_ended'
  | 'attendance_verified'
  | 'attendance_rejected_duplicate'
  | 'attendance_rejected_expired'
  | 'manual_override'
  | 'dispute_created'
  | 'dispute_approved'
  | 'dispute_rejected'
  | 'access_denied'
  | 'login'
  | 'logout';

// --- profiles ---------------------------------------------------------------
/**
 * A single identity used by both students and instructors. Students carry the
 * extra `studentId` + `pin` fields used by the `credentials` verification mode.
 */
export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Student matricula / roll number, e.g. "STU-1001" */
  studentId?: string;
  /** 4-digit PIN used for the `credentials` verification mode */
  pin?: string;
  department?: string;
  title?: string;
  /** Course ids the student is enrolled in */
  courseIds?: string[];
  avatarColor: string;
}

// --- courses ----------------------------------------------------------------
export interface Course {
  id: string;
  code: string;
  title: string;
  instructorId: string;
  room: string;
  schedule: string;
  enrolledStudentIds: string[];
  /** Tailwind hex used for charts / accents */
  color: string;
}

// --- sessions ---------------------------------------------------------------
export interface Session {
  id: string;
  courseId: string;
  instructorId: string;
  /** 6-char dynamic token students type or scan */
  sessionToken: string;
  verificationMode: VerificationMode;
  startedAt: number;
  expiresAt: number;
  durationMinutes: number;
  status: SessionStatus;
  endedAt?: number;
  /** Optional note the instructor attaches when ending */
  note?: string;
}

// --- attendance_records -----------------------------------------------------
/** A unique `(studentId, sessionId)` pair is enforced by the storage layer. */
export interface AttendanceRecord {
  id: string;
  studentId: string;
  sessionId: string;
  courseId: string;
  status: AttendanceStatus;
  verifiedAt: number;
  method: VerificationMode | 'manual';
  /** Human readable verification detail shown on the receipt / badge */
  verificationNote?: string;
}

// --- audit_logs -------------------------------------------------------------
export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: Role | 'system';
  action: AuditAction;
  targetType: 'session' | 'attendance' | 'dispute' | 'auth';
  targetId?: string;
  reason?: string;
  detail: string;
  timestamp: number;
}

// --- correction_disputes ----------------------------------------------------
export interface CorrectionDispute {
  id: string;
  studentId: string;
  studentName: string;
  sessionId: string;
  courseId: string;
  attendanceRecordId?: string;
  message: string;
  /** The status the student believes is correct */
  requestedStatus: AttendanceStatus;
  status: DisputeStatus;
  createdAt: number;
  resolvedAt?: number;
  resolvedById?: string;
  resolutionNote?: string;
}

// --- aggregate --------------------------------------------------------------
/** The entire persisted database. */
export interface Database {
  version: number;
  profiles: Profile[];
  courses: Course[];
  sessions: Session[];
  attendanceRecords: AttendanceRecord[];
  auditLogs: AuditLog[];
  disputes: CorrectionDispute[];
  /** id of the currently signed-in profile (null = signed out) */
  currentUserId: string | null;
}

// --- engine result ----------------------------------------------------------
export type CheckInErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'SESSION_ENDED'
  | 'TOKEN_INVALID'
  | 'CREDENTIALS_INVALID'
  | 'DUPLICATE'
  | 'UNAUTHORIZED'
  | 'NOT_ENROLLED'
  | 'BIOMETRIC_DENIED';

export interface CheckInSuccess {
  ok: true;
  record: AttendanceRecord;
  session: Session;
}
export interface CheckInFailure {
  ok: false;
  code: CheckInErrorCode;
  message: string;
}
export type CheckInResult = CheckInSuccess | CheckInFailure;
