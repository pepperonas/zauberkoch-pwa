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
      const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Circular reveal (celox.io signature): the new theme wipes out of the
      // toggle button. Fallback: the existing token color-morph.
      if (doc.startViewTransition && origin && !reduced) {
        const root = document.documentElement;
        const radius = Math.hypot(
          Math.max(origin.x, window.innerWidth - origin.x),
          Math.max(origin.y, window.innerHeight - origin.y),
        );
        root.style.setProperty('--vt-x', `${origin.x}px`);
        root.style.setProperty('--vt-y', `${origin.y}px`);
        root.style.setProperty('--vt-r', `${radius}px`);
        doc.startViewTransition(() => {
          // Attribute must flip synchronously inside the VT callback; the
          // theme effect re-sets it later (idempotent).
          const next: Theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
          root.setAttribute('data-theme', next);
          flushSync(() => setTheme(next));
        });
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
