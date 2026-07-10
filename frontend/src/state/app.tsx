/** App-level state: theme, mode (kochen/cocktail), current user. */

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalStorageState } from './useLocalStorageState';

import { api, ApiRequestError, setCsrfToken } from '../lib/api';
import type { Me, Modus } from '../lib/types';

type Theme = 'light' | 'dark';

interface AppState {
  theme: Theme;
  toggleTheme: () => void;
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
    queryFn: async () => {
      try {
        const me = await api.me();
        setCsrfToken(me.csrf_token);
        return me;
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const toggleTheme = useCallback(() => {
    withColorMorph(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')));
  }, [setTheme]);

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
