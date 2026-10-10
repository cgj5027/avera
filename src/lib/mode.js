/**
 * Data-mode selection (Stage 0) plus the Demo Mode workspace (Stage 3B).
 * The mode lives in sessionStorage; the demo workspace (selected profile and
 * its Plaid Sandbox item, if any) lives in localStorage so the persistent
 * indicator and reset survive reloads. Neither stores financial data.
 */
import { DEMO_PROFILES } from '@/services/demoProfiles';

const KEY = 'avera_data_mode';
const WORKSPACE_KEY = 'avera_demo_workspace';

export const DATA_MODES = {
  demo: { indicator: 'Demo Mode' },
  sandbox: { indicator: 'Plaid Sandbox — Test account' },
  manual: { indicator: 'Manual' },
};

const listeners = new Set();
function emit() {
  for (const listener of listeners) listener();
}

export function getDataMode() {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setDataMode(mode) {
  if (!DATA_MODES[mode]) return;
  try {
    sessionStorage.setItem(KEY, mode);
  } catch {
    /* storage unavailable — mode stays ephemeral */
  }
  emit();
}

export function clearDataMode() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

/** The active demo workspace: { profile, plaid_item_id } or null. */
export function getDemoWorkspace() {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && DEMO_PROFILES[parsed.profile] ? parsed : null;
  } catch {
    return null;
  }
}

export function setDemoWorkspace(workspace) {
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
  } catch {
    /* storage unavailable — workspace stays ephemeral */
  }
  emit();
}

export function clearDemoWorkspace() {
  try {
    localStorage.removeItem(WORKSPACE_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

/** Subscribe to mode/workspace changes (used by the persistent demo bar). */
export function subscribeToModeChanges(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hasChosenMode() {
  return Boolean(getDataMode());
}

export function modeLabel(mode) {
  if (mode === 'demo') {
    const ws = getDemoWorkspace();
    const profile = ws ? DEMO_PROFILES[ws.profile] : null;
    return profile ? `Demo Mode — ${profile.label}` : 'Demo Mode';
  }
  return DATA_MODES[mode]?.indicator ?? 'Demo Mode';
}