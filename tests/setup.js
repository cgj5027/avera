import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => {cleanup();localStorage.clear();sessionStorage.clear();});
// jsdom has no layout observer; real chart layout is exercised by browser-smoke.cjs.
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
// The OTP widget probes for password-manager overlays; jsdom has no hit testing.
document.elementFromPoint = () => null;
