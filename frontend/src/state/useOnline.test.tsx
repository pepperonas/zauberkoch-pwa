// @vitest-environment happy-dom
/**
 * Tests for the useOnline() hook. Needs a DOM (window/navigator + online/offline
 * events), so this ONE file opts into happy-dom via the docblock above — the rest
 * of the suite stays on the node env (testing.md: "keine DOM-Tests nötig" for the
 * pure functions). No @testing-library — a ~15-line local renderHook over
 * react-dom/client is enough to exercise the real public hook.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOnline } from './useOnline';

// React 19's act() requires this flag to be set on the global.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** navigator.onLine is a read-only getter — back it with a mutable value we flip. */
let onlineValue = true;
const mounted: Root[] = [];

beforeEach(() => {
  onlineValue = true;
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => onlineValue });
});

afterEach(() => {
  act(() => mounted.splice(0).forEach((r) => r.unmount()));
  vi.restoreAllMocks();
});

/** Minimal renderHook: renders a probe that captures the hook's return value. */
function renderHook<T>(useHook: () => T) {
  const result = { current: undefined as T };
  const Probe = () => {
    result.current = useHook();
    return null;
  };
  const root = createRoot(document.createElement('div'));
  mounted.push(root);
  act(() => root.render(createElement(Probe)));
  return {
    result,
    unmount: () => {
      mounted.splice(mounted.indexOf(root), 1);
      act(() => root.unmount());
    },
  };
}

/** Flip the mocked connectivity and fire the matching browser event. */
function goOffline() {
  onlineValue = false;
  act(() => window.dispatchEvent(new Event('offline')));
}
function goOnline() {
  onlineValue = true;
  act(() => window.dispatchEvent(new Event('online')));
}

describe('useOnline — happy path', () => {
  it('reports true while the browser is online', () => {
    onlineValue = true;
    const { result } = renderHook(useOnline);
    expect(result.current).toBe(true);
  });

  it('flips to false when an offline event fires', () => {
    const { result } = renderHook(useOnline);
    expect(result.current).toBe(true);

    goOffline();

    expect(result.current).toBe(false);
  });

  it('recovers to true when connectivity returns', () => {
    onlineValue = false;
    const { result } = renderHook(useOnline);
    expect(result.current).toBe(false);

    goOnline();

    expect(result.current).toBe(true);
  });
});

describe('useOnline — edge cases', () => {
  it('starts offline when the browser is already offline at mount', () => {
    onlineValue = false;
    const { result } = renderHook(useOnline);
    expect(result.current).toBe(false);
  });

  it('stays false on a redundant offline event (no change, no throw)', () => {
    const { result } = renderHook(useOnline);
    goOffline();
    expect(result.current).toBe(false);

    // Same state again — useSyncExternalStore bails out; value must hold.
    act(() => window.dispatchEvent(new Event('offline')));

    expect(result.current).toBe(false);
  });

  it('coerces a browser without navigator.onLine to a falsy value', () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => undefined });
    const { result } = renderHook(useOnline);
    expect(result.current).toBeFalsy();
  });
});

describe('useOnline — concurrency / state', () => {
  it('settles on the final value after a rapid offline/online/offline burst', () => {
    const { result } = renderHook(useOnline);

    goOffline();
    expect(result.current).toBe(false);
    goOnline();
    expect(result.current).toBe(true);
    goOffline();

    expect(result.current).toBe(false);
  });

  it('removes both online and offline listeners on unmount (no leak)', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(useOnline);

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('keeps two independent subscribers in sync off the same window events', () => {
    const a = renderHook(useOnline);
    const b = renderHook(useOnline);
    expect(a.result.current).toBe(true);
    expect(b.result.current).toBe(true);

    goOffline();

    expect(a.result.current).toBe(false);
    expect(b.result.current).toBe(false);
  });
});
