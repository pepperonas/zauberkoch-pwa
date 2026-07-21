/** App-level state: theme, mode (kochen/cocktail), current user. */

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
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

      // Circular reveal (celox.io signature): the new theme SNAPSHOT itself wipes
      // in via a clip-path circle grown from the toggle button, so the reveal
      // "encompasses" the real re-themed content — identical on mobile + desktop.
      // (The old mobile-only solid-overlay `themeRipple` painted over the content
      // instead of revealing it; removed 2026-07-17.) Reduced motion / no origin /
      // no VT support → token morph. Drives the clip-path from JS on the VT pseudo
      // (NOT CSS @keyframes — the --vt-* custom properties don't reliably inherit
      // into the view-transition pseudo tree).
      const root = document.documentElement;
      if (doc.startViewTransition && origin && !reduced) {
        const x = origin.x;
        const y = origin.y;
        // PARAMETERS ARE A 1:1 PORT OF celox.io/v2 (Layout.astro), which is the
        // reference the reveal is supposed to feel like on a real S24 Ultra:
        // radius 0 -> exact farthest-corner hypot (no slack), MD3 emphasized
        // easing, 520ms on small/coarse and 900ms on desktop. Do not "improve"
        // these numbers in isolation — a linear radius and a button-sized start
        // were tried here and judged worse than the reference. The CSS side
        // (default crossfade off, new on top, backdrop-filter dropped) already
        // matches celox one for one.
        const startRadius = 0;
        const endRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y),
        );
        const smallOrCoarse = matchMedia('(max-width: 768px), (pointer: coarse)').matches;
        const duration = smallOrCoarse ? 520 : 900;

        // Freeze every 100dvh-driven height to a px value for the duration
        // (base.css `html.zk-theme-vt`): on phones Chrome toggles the URL bar
        // at view-transition start, and since `::view-transition-new(root)` is
        // LIVE content, a dvh change would re-lay-out and re-raster the whole
        // full-screen layer mid-reveal.
        root.style.setProperty('--zk-vt-vh', `${window.innerHeight}px`);
        root.classList.add('zk-theme-vt');

        // NO React work inside the transition (2026-07-21): flipping the
        // attribute is enough — every color is a CSS custom property, and the
        // toggle glyph is CSS-driven too (see App.tsx). Re-rendering here used
        // to commit the WHOLE tree (every useApp consumer, incl. the off-route
        // prewarmed detail page), whose passive effects + framer layout
        // measurement then landed INSIDE the reveal window — "smooth, then
        // stalls". React state is synced once the animation is over.
        let next: Theme = 'light';
        const vt = doc.startViewTransition(() => {
          next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
          root.setAttribute('data-theme', next);
        });

        // Clip the NEW snapshot open (new sits on top). Tried the inverse —
        // a growing hole in the frozen OLD snapshot, hoping a static bitmap
        // would survive a mid-reveal viewport change: on a real S24 the reveal
        // then stopped halfway, because Chrome SKIPS a view transition when the
        // viewport changes, and with old-on-top the skip yanks the covering
        // layer away instead of finishing the wipe. Reverted 2026-07-21 —
        // new-on-top degrades gracefully (the reveal simply completes).
        vt.ready
          .then(() =>
            root.animate(
              { clipPath: [`circle(${startRadius}px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
              {
                duration,
                easing: 'cubic-bezier(0.22, 0.08, 0, 1)',
                pseudoElement: '::view-transition-new(root)',
              },
            ).finished,
          )
          .catch(() => {});

        vt.finished.finally(() => {
          root.classList.remove('zk-theme-vt');
          root.style.removeProperty('--zk-vt-vh');
          setTheme(next); // sync React + localStorage now that nothing animates
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
