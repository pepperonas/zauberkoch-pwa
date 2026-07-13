/** Native View Transitions for route changes + shared-element morphs.
 *
 * We call `document.startViewTransition` MANUALLY (react-router's `viewTransition`
 * option is a no-op in declarative <BrowserRouter> mode — it needs the data
 * router). We own:
 *   1. `activeId` — the recipe id currently morphing. The clicked card names its
 *      motif/title with a fixed `view-transition-name`; the detail hero names the
 *      same, so the browser morphs between them (Container Transform). Only ONE
 *      element carries each name per snapshot, as the spec requires.
 *   2. The transition: for forward (PUSH) `flushSync(navigate)` commits the new
 *      DOM synchronously inside the VT callback; for back (async POP) the callback
 *      returns a promise that resolves once the route has actually changed.
 *   3. Scroll — reset to top on forward, restore on back, in a layout effect that
 *      runs before the browser captures the "new" snapshot.
 *
 * Feature-detection + reduced-motion fall back to a plain (instant) navigation.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import { useLocation, useNavigate, useNavigationType, type To } from 'react-router-dom';

/** Fixed names — safe because only the active source/target carry them at once. */
export const SHARED_MOTIF = 'zk-shared-motif';
export const SHARED_TITLE = 'zk-shared-title';

interface Ctx {
  activeId: number | null;
  /** Navigate with a view transition; pass `sharedId` to morph that recipe. */
  go: (to: To | number, opts?: { sharedId?: number }) => void;
}

const ViewTxContext = createContext<Ctx | null>(null);

function vtEnabled(): boolean {
  return (
    typeof (document as Document & { startViewTransition?: unknown }).startViewTransition ===
      'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function ViewTransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();
  const [activeId, setActiveId] = useState<number | null>(null);

  // Per-path scroll memory. Recorded synchronously in go() when leaving a page
  // (a continuous scroll listener would race the forward scrollTo(0,0) and
  // clobber the saved offset before its cleanup runs).
  const positions = useRef(new Map<string, number>());

  // Resolves the back (async POP) view-transition callback once React has
  // committed the new route — rAF is starved while the browser awaits the VT
  // callback, so we signal completion from the commit itself.
  const pendingResolve = useRef<(() => void) | null>(null);

  // Reset (forward) / restore (back) scroll once the new route has rendered.
  // useLayoutEffect runs pre-paint, before the browser captures the "new" VT
  // snapshot, so the morph starts from the correct viewport offset — then we
  // release the pending POP transition (order matters: scroll, THEN snapshot).
  useLayoutEffect(() => {
    if (navType === 'POP') {
      const saved = positions.current.get(location.pathname) ?? 0;
      window.scrollTo(0, saved);
    } else {
      window.scrollTo(0, 0);
    }
    if (pendingResolve.current) {
      pendingResolve.current();
      pendingResolve.current = null;
    }
    // location.key changes on every navigation (even same path).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // Drop the shared name a beat after arrival — the VT has finished by then.
  useEffect(() => {
    if (activeId == null) return;
    const id = window.setTimeout(() => setActiveId(null), 500);
    return () => window.clearTimeout(id);
  }, [location.key, activeId]);

  const go = useCallback(
    (to: To | number, opts?: { sharedId?: number }) => {
      // Remember where we are before leaving, so back can restore it.
      positions.current.set(window.location.pathname, window.scrollY);
      const nav = () => (typeof to === 'number' ? navigate(to) : navigate(to));
      const doc = document as Document & {
        startViewTransition?: (cb: () => void | Promise<void>) => unknown;
      };
      if (!vtEnabled() || !doc.startViewTransition) {
        nav();
        return;
      }
      // Name the source element in the CURRENT DOM before the old snapshot is
      // captured (flushSync commits it synchronously).
      if (opts?.sharedId != null) flushSync(() => setActiveId(opts.sharedId!));

      const back = typeof to === 'number';
      doc.startViewTransition(() =>
        back
          ? // Async POP: navigate, then let the route-commit layout effect resolve
            // us (with a safety timeout). rAF is starved during this phase.
            new Promise<void>((resolve) => {
              const timer = window.setTimeout(resolve, 500);
              pendingResolve.current = () => {
                window.clearTimeout(timer);
                resolve();
              };
              nav();
            })
          : // Sync PUSH: commit the new DOM before the new snapshot is captured.
            flushSync(() => nav()),
      );
    },
    [navigate],
  );

  return <ViewTxContext.Provider value={{ activeId, go }}>{children}</ViewTxContext.Provider>;
}

export function useViewTx(): Ctx {
  const ctx = useContext(ViewTxContext);
  if (!ctx) throw new Error('useViewTx outside ViewTransitionProvider');
  return ctx;
}
