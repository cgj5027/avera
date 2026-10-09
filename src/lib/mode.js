/**
 * Data-mode selection for the Stage 0 onboarding flow.
 * Stored in sessionStorage only — nothing is persisted to the database
 * and no Plaid connection is made in Stage 0.
 */
const KEY = 'avera_data_mode';

export const DATA_MODES = {
  demo: { indicator: 'Demo data' },
  sandbox: { indicator: 'Plaid Sandbox — Test account' },
  manual: { indicator: 'Manual' },
};

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
}

export function hasChosenMode() {
  return Boolean(getDataMode());
}

export function modeLabel(mode) {
  return DATA_MODES[mode]?.indicator ?? 'Demo data';
}