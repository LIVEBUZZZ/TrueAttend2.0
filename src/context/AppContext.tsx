// ---------------------------------------------------------------------------
// TrueAttend — application context (auth + data store)
// ---------------------------------------------------------------------------

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AttendanceStatus,
  Database,
  DisputeStatus,
  Profile,
  Role,
  Session,
  VerificationMode,
} from '../types';
import {
  appendAudit,
  attemptCheckIn,
  createDispute,
  createSession,
  endSession,
  manualOverride,
  resolveDispute,
  type CheckInInput,
  type CheckInOutcome,
  type OverrideInput,
  type OverrideOutcome,
} from '../lib/engine';
import { loadDatabase, resetDatabase, saveDatabase } from '../lib/storage';

interface AppContextValue {
  db: Database;
  currentUser: Profile | null;
  // auth
  login: (email: string, role?: Role) => { ok: boolean; error?: string };
  loginAs: (userId: string) => void;
  logout: () => void;
  // instructor actions
  launchSession: (
    courseId: string,
    verificationMode: VerificationMode,
    durationMinutes: number,
  ) => Session;
  endSessionAction: (sessionId: string, note?: string) => void;
  override: (input: Omit<OverrideInput, 'actorId'>) => OverrideOutcome;
  resolveDisputeAction: (
    disputeId: string,
    decision: Extract<DisputeStatus, 'approved' | 'rejected'>,
    note?: string,
  ) => void;
  // student actions
  checkIn: (input: Omit<CheckInInput, 'actorId'>) => CheckInOutcome;
  fileDispute: (input: {
    sessionId: string;
    message: string;
    requestedStatus: AttendanceStatus;
  }) => { ok: boolean; error?: string };
  // utility
  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => loadDatabase());

  const commit = useCallback((next: Database) => {
    setDb(next);
    saveDatabase(next);
  }, []);

  const currentUser = useMemo(
    () => db.profiles.find((p) => p.id === db.currentUserId) ?? null,
    [db.profiles, db.currentUserId],
  );

  // --- auth ---------------------------------------------------------------
  const login = useCallback(
    (email: string, role?: Role) => {
      const user = db.profiles.find(
        (p) => p.email.toLowerCase() === email.trim().toLowerCase(),
      );
      if (!user) return { ok: false, error: 'No account found for that email address.' };
      if (role && user.role !== role) {
        return { ok: false, error: `That address is registered as a ${user.role} account.` };
      }
      const next: Database = { ...db, currentUserId: user.id };
      appendAudit(next, user.id, 'login', 'auth', `${user.name} signed in as ${user.role}.`);
      commit(next);
      return { ok: true };
    },
    [db, commit],
  );

  const loginAs = useCallback(
    (userId: string) => {
      const user = db.profiles.find((p) => p.id === userId);
      if (!user) return;
      const next: Database = { ...db, currentUserId: user.id };
      appendAudit(next, user.id, 'login', 'auth', `${user.name} entered via the demo switcher.`);
      commit(next);
    },
    [db, commit],
  );

  const logout = useCallback(() => {
    const next: Database = { ...db, currentUserId: null };
    if (db.currentUserId) {
      appendAudit(next, db.currentUserId, 'logout', 'auth', `Signed out.`);
    }
    commit(next);
  }, [db, commit]);

  // --- instructor ---------------------------------------------------------
  const launchSession = useCallback(
    (courseId: string, verificationMode: VerificationMode, durationMinutes: number) => {
      const { db: next, session } = createSession(db, {
        courseId,
        instructorId: db.currentUserId ?? '',
        verificationMode,
        durationMinutes,
      });
      commit(next);
      return session;
    },
    [db, commit],
  );

  const endSessionAction = useCallback(
    (sessionId: string, note?: string) => {
      const { db: next } = endSession(db, { sessionId, actorId: db.currentUserId ?? '', note });
      commit(next);
    },
    [db, commit],
  );

  const override = useCallback(
    (input: Omit<OverrideInput, 'actorId'>) => {
      const outcome = manualOverride(db, { ...input, actorId: db.currentUserId ?? '' });
      if (outcome.ok) commit(outcome.db);
      return outcome;
    },
    [db, commit],
  );

  const resolveDisputeAction = useCallback(
    (disputeId: string, decision: Extract<DisputeStatus, 'approved' | 'rejected'>, note?: string) => {
      const { db: next } = resolveDispute(db, {
        disputeId,
        actorId: db.currentUserId ?? '',
        decision,
        note,
      });
      commit(next);
    },
    [db, commit],
  );

  // --- student ------------------------------------------------------------
  const checkIn = useCallback(
    (input: Omit<CheckInInput, 'actorId'>) => {
      const outcome = attemptCheckIn(db, { ...input, actorId: db.currentUserId ?? '' });
      commit(outcome.db);
      return outcome;
    },
    [db, commit],
  );

  const fileDispute = useCallback(
    (input: { sessionId: string; message: string; requestedStatus: AttendanceStatus }) => {
      const { db: next, dispute, error } = createDispute(db, {
        ...input,
        studentId: db.currentUserId ?? '',
      });
      if (error || !dispute) return { ok: false, error };
      commit(next);
      return { ok: true };
    },
    [db, commit],
  );

  // --- utility ------------------------------------------------------------
  const resetDemo = useCallback(() => {
    commit(resetDatabase());
  }, [commit]);

  const value: AppContextValue = {
    db,
    currentUser,
    login,
    loginAs,
    logout,
    launchSession,
    endSessionAction,
    override,
    resolveDisputeAction,
    checkIn,
    fileDispute,
    resetDemo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
