/** App-level state: theme, mode (kochen/cocktail), current user. */

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalStorageState } from './useLocalStorageState';

import { api, ApiRequestError, setCsrfToken } from '../lib/api';
import type { Me, Modus } from '../lib/types';

type Theme = 'light' | 'dark';

interface AppState {
  theme: Theme;
  toggleTheme: (origin?: { x: number; y: number }) => void;
  mode: Modus;
  setMode: (mode: Modus) => void;
  me: Me | null;
  meLoading: boolean;
  refreshMe: () => void;
}

const AppContext = createContext<AppState | null>(null);

/** Trigger the animated token morph, then clean the flag up. */
function withColorMorph(apply: () => void): void {
  const root = document.documentElement;
  root.setAttribute('data-morph', '');
  apply();
  window.setTimeout(() => root.removeAttribute('data-morph'), 700);
}

/** Circular theme reveal for mobile (celox.io themeRipple pattern). Animating
 * clip-path on the full-page view-transition snapshot stutters on mobile GPUs;
 * instead a single SOLID overlay in the target theme's surface colour grows via
 * clip-path from the toggle button (only a trivial layer is re-clipped per
 * frame → smooth), the theme flips underneath it (hidden), then it fades out. */
function themeRipple(next: Theme, x: number, y: number, apply: () => void): void {
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  // Target theme's solid body surface — keep in sync with tokens.css --c-surface.
  const bg = next === 'dark' ? '#11150f' : '#f7fbf1';
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;inset:0;z-index:9999;pointer-events:none;' +
    `background-color:${bg};clip-path:circle(0px at ${x}px ${y}px);will-change:clip-path,opacity;`;
  document.body.appendChild(el);
  const cleanup = () => el.remove();
  el.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
    { duration: 420, easing: 'cubic-bezier(0.22, 0.08, 0, 1)', fill: 'forwards' },
  )
    .finished.then(() => {
      apply(); // flip the theme underneath the covering overlay (invisible)
      return el.animate({ opacity: [1, 0] }, { duration: 260, delay: 60, easing: 'ease-out', fill: 'forwards' })
        .finished;
    })
    .then(cleanup)
    .catch(() => {
      apply();
      cleanup();
    });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useLocalStorageState<Theme>('zk-theme', () =>
    matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );
  const [mode, setModeState] = useLocalStorageState<Modus>('zk-mode', () => 'kochen');
  const queryClient = useQueryClient();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode);
  }, [mode]);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async (): Promise<Me | null> => {
      try {
        const res = await api.me();
        if (!res.authenticated) return null;
        setCsrfToken(res.csrf_token);
        return res;
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 401) return null; // legacy contract
        throw err;
      }
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const toggleTheme = useCallback(
    (origin?: { x: number; y: number }) => {
      type ViewTransition = { ready: Promise<void>; finished: Promise<void> };
      const doc = document as Document & { startViewTransition?: (cb: () => void) => ViewTransition };
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Circular reveal (celox.io signature). MOBILE: a themeRipple overlay
      // (solid target-theme layer grown via clip-path — compositor-cheap, smooth
      // on mobile GPUs). DESKTOP: the full View-Transitions reveal where the new
      // theme snapshot itself wipes in (clip-path on the page snapshot stutters
      // on mobile, hence the split). Reduced motion / no origin → token morph.
      const coarse = matchMedia('(max-width: 768px), (pointer: coarse)').matches;
      const root = document.documentElement;

      if (origin && !reduced && coarse) {
        const next: Theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        themeRipple(next, origin.x, origin.y, () => {
          root.setAttribute('data-theme', next);
          setTheme(next);
        });
        return;
      }

      // The desktop reveal drives the clip-path from JS on the VT pseudo (NOT CSS
      // @keyframes — the --vt-* custom properties don't reliably inherit into the
      // view-transition pseudo tree).
      if (doc.startViewTransition && origin && !reduced) {
        const x = origin.x;
        const y = origin.y;
        // Exact end radius: farthest viewport corner from the origin (px).
        const endRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y),
        );
        const duration = 900;
        root.classList.add('zk-theme-vt');

        const vt = doc.startViewTransition(() => {
          // Attribute must flip synchronously inside the VT callback; the
          // theme effect re-sets it later (idempotent).
          const next: Theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
          root.setAttribute('data-theme', next);
          flushSync(() => setTheme(next));
        });

        vt.ready
          .then(() =>
            root.animate(
              {
                clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
              },
              {
                duration,
                easing: 'cubic-bezier(0.22, 0.08, 0, 1)',
                pseudoElement: '::view-transition-new(root)',
              },
            ).finished,
          )
          .catch(() => {});

        vt.finished.finally(() => root.classList.remove('zk-theme-vt'));
        return;
      }
      withColorMorph(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')));
    },
    [setTheme],
  );

  const setMode = useCallback(
    (next: Modus) => {
      withColorMorph(() => setModeState(next));
    },
    [setModeState],
  );

  const value = useMemo<AppState>(
    () => ({
      theme,
      toggleTheme,
      mode,
      setMode,
      me: meQuery.data ?? null,
      meLoading: meQuery.isLoading,
      refreshMe: () => void queryClient.invalidateQueries({ queryKey: ['me'] }),
    }),
    [theme, toggleTheme, mode, setMode, meQuery.data, meQuery.isLoading, queryClient],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside AppProvider');
  return ctx;
}
