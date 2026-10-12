import { useEffect } from 'react';

export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const activityKey = userId => `avera_last_activity:${userId}`;

export function clearActivity(userId) {
  try { localStorage.removeItem(activityKey(userId)); } catch { /* Storage may be disabled. */ }
}

/** Share activity across tabs; reloads and returning to a tab do not extend a session. */
export function useIdleLogout(userId, logout) {
  useEffect(() => {
    if (!userId) return;
    const key = activityKey(userId);
    let stored;
    try { stored = Number(localStorage.getItem(key)); } catch { /* Keep an in-memory deadline. */ }
    let lastActivity = stored || Date.now();
    const persist = () => {
      try { localStorage.setItem(key, String(lastActivity)); } catch { /* Timeout still works in this tab. */ }
    };
    let timer;
    let ended = false;
    const expire = () => {
      if (ended) return;
      ended = true;
      clearTimeout(timer);
      logout();
    };
    const check = () => {
      clearTimeout(timer);
      const remaining = IDLE_TIMEOUT_MS - (Date.now() - lastActivity);
      if (remaining <= 0) expire();
      else timer = setTimeout(check, remaining);
    };
    const activity = () => {
      if (ended) return;
      // Do not revive an expired session when a suspended tab receives input.
      if (Date.now() - lastActivity >= IDLE_TIMEOUT_MS) return expire();
      if (Date.now() - lastActivity < 1000) return;
      lastActivity = Date.now();
      persist();
      check();
    };
    const storage = event => {
      if (event.key !== key || ended) return;
      if (event.newValue === null) return expire();
      const value = Number(event.newValue);
      if (Number.isFinite(value) && value > lastActivity) lastActivity = value;
      check();
    };
    const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
    persist();
    check();
    events.forEach(event => window.addEventListener(event, activity, {passive: true, capture: true}));
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('storage', storage);
    return () => {
      clearTimeout(timer);
      events.forEach(event => window.removeEventListener(event, activity, true));
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('storage', storage);
    };
  }, [userId, logout]);
}
