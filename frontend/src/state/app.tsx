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

      // Circular reveal (celox.io signature) via the View Transitions API — the
      // new theme wipes out of the toggle button. DESKTOP ONLY: animating
      // clip-path: circle() on the full-viewport VT snapshot is NOT GPU-
      // composited and stutters on mobile GPUs. On mobile we use the smooth
      // token color-morph instead — the same buttery transition as the
      // Kochen↔Cocktail mode switch (see withColorMorph below). The clip-path is
      // driven from JS on ::view-transition-new(root) (NOT CSS @keyframes — the
      // --vt-* custom properties don't reliably inherit into the VT pseudo tree).
      const coarse = matchMedia('(max-width: 768px), (pointer: coarse)').matches;
      if (doc.startViewTransition && origin && !reduced && !coarse) {
        const root = document.documentElement;
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
