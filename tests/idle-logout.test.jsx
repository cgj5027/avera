import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleLogout, activityKey, IDLE_TIMEOUT_MS } from '../src/lib/useIdleLogout';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-12T12:00:00Z')); });
afterEach(() => { vi.useRealTimers(); });
it('signs out at 15 minutes and cancels its timer on unmount', () => {
  const logout = vi.fn();
  const view = renderHook(() => useIdleLogout('a', logout));
  act(() => vi.advanceTimersByTime(IDLE_TIMEOUT_MS - 1));
  expect(logout).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(logout).toHaveBeenCalledTimes(1);
  view.unmount();
  act(() => vi.advanceTimersByTime(IDLE_TIMEOUT_MS));
  expect(logout).toHaveBeenCalledTimes(1);
});
it('keyboard activity extends the deadline, but focus does not', () => {
  const logout = vi.fn();
  renderHook(() => useIdleLogout('a', logout));
  act(() => vi.advanceTimersByTime(10 * 60 * 1000));
  act(() => window.dispatchEvent(new KeyboardEvent('keydown')));
  act(() => vi.advanceTimersByTime(10 * 60 * 1000));
  act(() => window.dispatchEvent(new Event('focus')));
  expect(logout).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(5 * 60 * 1000));
  expect(logout).toHaveBeenCalledTimes(1);
});
it('expires an old session after reload and on returning from a suspended tab', () => {
  const logout = vi.fn();
  localStorage.setItem(activityKey('a'), String(Date.now() - IDLE_TIMEOUT_MS));
  const view = renderHook(() => useIdleLogout('a', logout));
  expect(logout).toHaveBeenCalledTimes(1);
  view.unmount(); localStorage.clear(); logout.mockClear();
  renderHook(() => useIdleLogout('a', logout));
  vi.setSystemTime(Date.now() + IDLE_TIMEOUT_MS);
  act(() => window.dispatchEvent(new Event('focus')));
  expect(logout).toHaveBeenCalledTimes(1);
});
it('shares activity and sign-out across tabs', () => {
  const logout = vi.fn();
  renderHook(() => useIdleLogout('a', logout));
  act(() => vi.advanceTimersByTime(10 * 60 * 1000));
  act(() => window.dispatchEvent(new StorageEvent('storage', {key: activityKey('a'), newValue: String(Date.now())})));
  act(() => vi.advanceTimersByTime(10 * 60 * 1000));
  expect(logout).not.toHaveBeenCalled();
  act(() => window.dispatchEvent(new StorageEvent('storage', {key: activityKey('a'), newValue: null})));
  expect(logout).toHaveBeenCalledTimes(1);
});
it('does not track signed-out visitors', () => {
  const logout = vi.fn();
  renderHook(() => useIdleLogout(null, logout));
  act(() => vi.advanceTimersByTime(IDLE_TIMEOUT_MS));
  expect(logout).not.toHaveBeenCalled();
});
