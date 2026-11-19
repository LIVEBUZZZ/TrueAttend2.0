// ---------------------------------------------------------------------------
// TrueAttend — persistence adapter
// ---------------------------------------------------------------------------
// A tiny repository layer over `localStorage`. Every read/write goes through
// this module, so swapping to a hosted backend (e.g. Supabase) means
// re-implementing just these few functions and pointing the context at them —
// no component changes required.
// ---------------------------------------------------------------------------

import type { Database } from '../types';
import { refreshDemoLiveSession } from './engine';
import { buildSeedDatabase, DB_VERSION } from './seed';

const STORAGE_KEY = 'trueattend.db.v1';
const ACTIVE_SESSION_TAB = 'trueattend.activeTab';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function parse(raw: string | null): Database | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Database;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.profiles)) return null;
    if (parsed.version !== DB_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Loads the database from localStorage, seeding it on first run and keeping the
 * demo live-session window fresh on every load.
 */
export function loadDatabase(): Database {
  if (!isBrowser()) return buildSeedDatabase();

  const existing = parse(window.localStorage.getItem(STORAGE_KEY));
  if (!existing) {
    const seeded = refreshDemoLiveSession(buildSeedDatabase());
    saveDatabase(seeded);
    return seeded;
  }

  const refreshed = refreshDemoLiveSession(existing);
  // Persist only when the refresh actually changed the live session window.
  saveDatabase(refreshed);
  return refreshed;
}

export function saveDatabase(db: Database): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    // Storage may be full or blocked (private mode); fail soft.
    console.warn('[TrueAttend] Unable to persist database:', err);
  }
}

export function resetDatabase(): Database {
  const seeded = refreshDemoLiveSession(buildSeedDatabase());
  saveDatabase(seeded);
  return seeded;
}

export function clearDatabase(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// --- cross-tab focus tracking (used to pick the "active" evaluation tab) -----
export function setActiveTab(tab: string): void {
  if (!isBrowser()) return;
  window.sessionStorage.setItem(ACTIVE_SESSION_TAB, tab);
}

export function getActiveTab(): string | null {
  if (!isBrowser()) return null;
  return window.sessionStorage.getItem(ACTIVE_SESSION_TAB);
}
