// @vitest-environment happy-dom
/**
 * Theme-toggle behaviour (AppProvider.toggleTheme). Guards the 2026-07-17
 * unification: the circular reveal is now ONE real View Transition on every
 * device (the mobile-only solid-overlay `themeRipple` and its coarse-pointer
 * gate are gone), with a token-morph fallback for reduced-motion / no-origin /
 * no-VT-support. Needs a DOM → happy-dom (scoped to this file); the pure suites
 * stay on node.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppProvider, useApp } from './app';

// api.me() must not touch the network — resolve to "anonymous".
vi.mock('../lib/api', () => ({
  api: { me: vi.fn().mockResolvedValue({ authenticated: false }) },
  ApiRequestError: class ApiRequestError extends Error {
    status = 0;
  },
  setCsrfToken: vi.fn(),
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type MediaOpts = { reduced?: boolean; coarse?: boolean; prefersDark?: boolean };
function mockMatchMedia(opts: MediaOpts = {}) {
  const impl = (q: string) =>
    ({
      matches: q.includes('prefers-color-scheme: dark')
        ? !!opts.prefersDark
        : q.includes('prefers-reduced-motion')
          ? !!opts.reduced
          : q.includes('max-width: 768px') || q.includes('pointer: coarse')
            ? !!opts.coarse
            : false,
      media: q,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
  window.matchMedia = impl as typeof window.matchMedia;
  (globalThis as unknown as { matchMedia: typeof window.matchMedia }).matchMedia = impl as typeof window.matchMedia;
}

const mounted: Root[] = [];
const startVT = vi.fn((cb: () => void) => {
  cb(); // flip synchronously, as the real API does inside the callback
  return { ready: Promise.resolve(), finished: Promise.resolve() };
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('zk-theme', 'light'); // deterministic starting theme
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-morph');
  document.documentElement.className = '';
  mockMatchMedia({});
  startVT.mockClear();
  (document as unknown as { startViewTransition?: unknown }).startViewTransition = startVT;
  // WAAPI on the root: the reveal calls documentElement.animate() after vt.ready.
  (document.documentElement as unknown as { animate: () => { finished: Promise<void> } }).animate = () => ({
    finished: Promise.resolve(),
  });
});

afterEach(() => {
  act(() => mounted.splice(0).forEach((r) => r.unmount()));
  delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  vi.restoreAllMocks();
});

function renderApp() {
  const ref: { current: ReturnType<typeof useApp> | null } = { current: null };
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Probe() {
    ref.current = useApp();
    return null;
  }
  const root = createRoot(document.createElement('div'));
  mounted.push(root);
  act(() =>
    root.render(
      createElement(QueryClientProvider, { client: qc }, createElement(AppProvider, null, createElement(Probe))),
    ),
  );
  return ref;
}

const theme = () => document.documentElement.getAttribute('data-theme');
const hasFullscreenOverlay = () =>
  [...document.querySelectorAll('div')].some((d) => {
    const cs = getComputedStyle(d);
    return cs.position === 'fixed' && cs.zIndex === '9999';
  });

describe('toggleTheme — unified View-Transition reveal', () => {
  it('runs a View Transition and flips the theme when given an origin', () => {
    const app = renderApp();
    expect(theme()).toBe('light');

    act(() => app.current!.toggleTheme({ x: 10, y: 10 }));

    expect(startVT).toHaveBeenCalledTimes(1);
    expect(theme()).toBe('dark');
    expect(document.documentElement.classList.contains('zk-theme-vt')).toBe(true);
  });

  it('uses the SAME View Transition on mobile — no solid-overlay path, no coarse gate', () => {
    mockMatchMedia({ coarse: true }); // emulate a phone: (max-width:768px)/(pointer:coarse) match
    const app = renderApp();

    act(() => app.current!.toggleTheme({ x: 5, y: 5 }));

    expect(startVT).toHaveBeenCalledTimes(1); // still the VT, not the removed themeRipple
    expect(theme()).toBe('dark');
    expect(hasFullscreenOverlay()).toBe(false); // the solid target-colour <div> must never appear
  });
});

describe('toggleTheme — token-morph fallbacks', () => {
  it('skips the View Transition under reduced motion and morphs tokens instead', () => {
    mockMatchMedia({ reduced: true });
    const app = renderApp();

    act(() => app.current!.toggleTheme({ x: 10, y: 10 }));

    expect(startVT).not.toHaveBeenCalled();
    expect(theme()).toBe('dark');
    expect(document.documentElement.hasAttribute('data-morph')).toBe(true); // withColorMorph flag
    expect(hasFullscreenOverlay()).toBe(false);
  });

  it('skips the View Transition when no origin is given (keyboard / programmatic)', () => {
    const app = renderApp();

    act(() => app.current!.toggleTheme());

    expect(startVT).not.toHaveBeenCalled();
    expect(theme()).toBe('dark');
  });

  it('falls back gracefully when startViewTransition is unavailable', () => {
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
    const app = renderApp();

    act(() => app.current!.toggleTheme({ x: 10, y: 10 }));

    expect(theme()).toBe('dark'); // still toggles, no throw
    expect(hasFullscreenOverlay()).toBe(false);
  });

  it('toggles back to light on a second invocation', () => {
    const app = renderApp();

    act(() => app.current!.toggleTheme({ x: 10, y: 10 }));
    expect(theme()).toBe('dark');
    act(() => app.current!.toggleTheme({ x: 10, y: 10 }));

    expect(theme()).toBe('light');
  });
});
