/** Native View Transitions for route changes + shared-element morphs.
 *
 * We call `document.startViewTransition` MANUALLY (react-router's `viewTransition`
 * option is a no-op in declarative <BrowserRouter> mode — it needs the data
 * router). We own:
 *   1. `activeId` — the recipe id currently morphing. The source (clicked card or
 *      the detail hero) names its motif/title with a fixed `view-transition-name`;
 *      the destination names the same, so the browser morphs between them
 *      (Container Transform). Only ONE element carries each name per snapshot.
 *   2. The transition. PUSH (card, tabs) goes through `go()`. POP — the browser's
 *      OR the in-app back button (which just navigates(-1)) — is caught by a
 *      capture-phase `popstate` listener that runs BEFORE react-router's, names
 *      the source in the still-old DOM, and starts the VT; react-router's own
 *      re-render then supplies the new snapshot. In both cases the VT callback
 *      returns a promise resolved by the scroll layout-effect at route-commit
 *      (flushSync(navigate) does NOT commit react-router v7 synchronously, and
 *      rAF is starved during the VT callback phase).
 *   3. Scroll — reset to top on forward, restore on back, in that layout effect
 *      (before the browser captures the "new" snapshot).
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

  // Resolves the view-transition callback once React has committed the new route
  // — rAF is starved while the browser awaits the VT callback, so we signal
  // completion from the commit itself (the scroll layout-effect).
  const pendingResolve = useRef<(() => void) | null>(null);

  // The current route path, lagging react-router by one render: at popstate
  // capture time react-router hasn't re-rendered yet, so this still holds the
  // page we're LEAVING (needed to name its shared element for the old snapshot).
  const currentPathRef = useRef(location.pathname);
  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

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

  // Start a view transition. pendingResolve is armed BEFORE startViewTransition
  // so a route commit that lands before the VT callback runs (the popstate case)
  // still resolves it. `doNav` triggers the DOM change for PUSH; for POP it's
  // omitted (react-router's own popstate handler does the navigation).
  const runVT = useCallback((doNav?: () => void) => {
    const doc = document as Document & {
      startViewTransition?: (cb: () => void | Promise<void>) => unknown;
    };
    let resolveFn: () => void;
    const p = new Promise<void>((r) => {
      resolveFn = r;
    });
    const timer = window.setTimeout(() => resolveFn(), 500);
    pendingResolve.current = () => {
      window.clearTimeout(timer);
      resolveFn();
    };
    doc.startViewTransition!(() => {
      doNav?.();
      return p;
    });
  }, []);

  const go = useCallback(
    (to: To | number, opts?: { sharedId?: number }) => {
      // Remember where we are before leaving, so back can restore it.
      positions.current.set(window.location.pathname, window.scrollY);
      // Back/forward: navigate plainly — the capture-phase popstate listener
      // drives the VT (it also serves the browser's own back/forward button).
      if (typeof to === 'number') {
        navigate(to);
        return;
      }
      if (!vtEnabled()) {
        navigate(to);
        return;
      }
      // Name the source (clicked card) in the CURRENT DOM before the old
      // snapshot is captured (flushSync commits it synchronously).
      if (opts?.sharedId != null) flushSync(() => setActiveId(opts.sharedId!));
      runVT(() => navigate(to));
    },
    [navigate, runVT],
  );

  // Browser (and in-app) back/forward. popstate fires AFTER react-router has
  // already re-rendered (the leaving page is gone → can't name its shared
  // element), even in the capture phase. The Navigation API's `navigate` event
  // fires BEFORE the commit, while the old DOM is still present — the correct
  // before-hook. We only observe (no intercept): name the shared recipe, start
  // the VT (captures the still-old snapshot), then react-router's own popstate
  // re-render supplies the new snapshot. Unsupported browsers (Firefox, older
  // Safari) simply get no transition on browser back/forward.
  useEffect(() => {
    const nav = (window as unknown as { navigation?: EventTarget & Record<string, unknown> })
      .navigation;
    const doc = document as Document & { startViewTransition?: unknown };
    if (!nav || typeof doc.startViewTransition !== 'function') return;
    const detailId = (path: string): number | null => {
      const m = /^\/rezept\/(\d+)$/.exec(path);
      return m ? Number(m[1]) : null;
    };
    const onNavigate = (e: Event) => {
      const ev = e as Event & { navigationType?: string; destination?: { url: string } };
      if (ev.navigationType !== 'traverse' || !ev.destination) return; // pushes go via go()
      if (!vtEnabled()) return;
      const oldPath = currentPathRef.current; // still the leaving page (pre-commit)
      const newPath = new URL(ev.destination.url).pathname;
      if (oldPath === newPath) return;
      const sid = detailId(oldPath) ?? detailId(newPath);
      if (sid != null) flushSync(() => setActiveId(sid));
      runVT(); // react-router's popstate re-render performs the navigation
    };
    nav.addEventListener('navigate', onNavigate);
    return () => nav.removeEventListener('navigate', onNavigate);
  }, [runVT]);

  return <ViewTxContext.Provider value={{ activeId, go }}>{children}</ViewTxContext.Provider>;
}

export function useViewTx(): Ctx {
  const ctx = useContext(ViewTxContext);
  if (!ctx) throw new Error('useViewTx outside ViewTransitionProvider');
  return ctx;
}
