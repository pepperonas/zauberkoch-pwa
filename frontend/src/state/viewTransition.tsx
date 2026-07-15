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

/** Diagnostics. Opt-in only (off in prod): `?vtdebug=1` once, or set
 * localStorage 'zk-vt-debug'='1'. Kept for the fragile browser-back path. */
const VT_DEBUG =
  typeof window !== 'undefined' &&
  (new URLSearchParams(location.search).get('vtdebug') === '1' ||
    (() => {
      try {
        if (new URLSearchParams(location.search).get('vtdebug') === '1')
          localStorage.setItem('zk-vt-debug', '1');
        return localStorage.getItem('zk-vt-debug') === '1';
      } catch {
        return false;
      }
    })());
function vlog(...args: unknown[]): void {
  if (VT_DEBUG) console.log('[zk-vt]', ...args);
}

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

// Route-VT window: add BEFORE startViewTransition so both snapshots capture the
// frosted header as a solid, blur-free bar (base.css `.zk-route-vt`); the see-
// through translucency otherwise makes the title bar fade during the crossfade.
function beginRouteVt(): void {
  document.documentElement.classList.add('zk-route-vt');
}
function endRouteVt(vt?: { finished?: Promise<void> }): void {
  const clear = () => document.documentElement.classList.remove('zk-route-vt');
  (vt?.finished ?? Promise.resolve()).then(clear, clear);
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
      startViewTransition?: (cb: () => void | Promise<void>) => {
        ready?: Promise<void>;
        finished?: Promise<void>;
      };
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
    vlog('runVT: startViewTransition', { hasNav: !!doNav });
    beginRouteVt();
    const vt = doc.startViewTransition!(() => {
      doNav?.();
      return p;
    });
    endRouteVt(vt);
    if (VT_DEBUG && vt) {
      vt.ready?.then(
        () => vlog('runVT: ready (animations started)'),
        (e) => vlog('runVT: ready REJECTED', String(e?.message ?? e)),
      );
      vt.finished?.then(() => vlog('runVT: finished'));
    }
  }, []);

  // Set while go() drives an in-app back/forward, so the Navigation-API listener
  // (which also fires for that programmatic traverse) doesn't start a 2nd VT.
  const skipTraverse = useRef(false);

  const go = useCallback(
    (to: To | number, opts?: { sharedId?: number }) => {
      // navigate() is overloaded (To vs delta) — narrow once here.
      const nav = () => {
        if (typeof to === 'number') navigate(to);
        else navigate(to);
      };
      vlog('go()', { to, sharedId: opts?.sharedId, vtEnabled: vtEnabled() });
      // Remember where we are before leaving, so back can restore it.
      positions.current.set(window.location.pathname, window.scrollY);
      if (!vtEnabled()) {
        nav();
        return;
      }
      // Name the source (clicked card, or the detail hero on the in-app back
      // button) in the CURRENT DOM before the old snapshot is captured.
      if (opts?.sharedId != null) flushSync(() => setActiveId(opts.sharedId!));
      // Drive the VT here for BOTH push and in-app back/forward — do NOT rely on
      // the Navigation-API listener for the in-app button (it may be absent or
      // flaky). Tell the listener to ignore the traverse this navigate() causes.
      if (typeof to === 'number') skipTraverse.current = true;
      runVT(nav);
    },
    [navigate, runVT],
  );

  // Browser back/forward. The Navigation API's `navigate` event fires BEFORE the
  // commit, while the old DOM is still present. Pointer type decides handling:
  //  - FINE (desktop/mouse): OBSERVE a VT (no intercept — that suppresses the
  //    popstate <BrowserRouter> needs → old===new → hard swap). popstate
  //    re-renders during the VT and the shared element morphs.
  //  - COARSE (touch): run the VT AND intercept() so the native predictive-back
  //    / activity-stack OS animation is suppressed (app-feel). No shared-element
  //    morph on touch browser-back (react-router swaps under intercept without
  //    it — the in-app "← Zurück" button provides the morph via go()).
  // In-app go(-1) drives its own VT in go() and skips here via skipTraverse.
  // Firefox/older Safari (no Navigation API) → un-animated browser button.
  useEffect(() => {
    const nav = (window as unknown as { navigation?: EventTarget & Record<string, unknown> })
      .navigation;
    const doc = document as Document & { startViewTransition?: unknown };
    if (!nav || typeof doc.startViewTransition !== 'function') {
      vlog('navigate listener NOT registered', { hasNav: !!nav, hasVT: typeof doc.startViewTransition === 'function' });
      return;
    }
    const detailId = (path: string): number | null => {
      const m = /^\/rezept\/(\d+)$/.exec(path);
      return m ? Number(m[1]) : null;
    };
    const onNavigate = (e: Event) => {
      const ev = e as Event & {
        navigationType?: string;
        destination?: { url: string };
        canIntercept?: boolean;
        intercept?: (opts: { handler: () => Promise<void> }) => void;
      };
      vlog('navigate event', { type: ev.navigationType, dest: ev.destination?.url, skip: skipTraverse.current });
      if (ev.navigationType !== 'traverse' || !ev.destination) return; // pushes go via go()
      if (skipTraverse.current) {
        skipTraverse.current = false; // go() is already driving this traverse
        vlog('navigate: skipped (in-app go drives it)');
        return;
      }
      if (!vtEnabled()) {
        vlog('navigate: vtEnabled=false → no VT');
        return;
      }
      const fine = window.matchMedia('(pointer: fine)').matches;
      const oldPath = currentPathRef.current; // still the leaving page (pre-commit)
      const newPath = new URL(ev.destination.url).pathname;
      if (oldPath === newPath) {
        vlog('navigate: same path → skip', oldPath);
        return;
      }
      const sid = detailId(oldPath) ?? detailId(newPath);
      vlog('navigate: browser-back', { oldPath, newPath, sid, fine });
      // Name the source (detail hero) so it morphs — ALWAYS, regardless of
      // pointer. (A previous `fine &&` gate meant coarse-pointer devices — where
      // real users landed, `fine:false` in their logs — never named it, so the
      // browser back button hard-cut while the in-app button, which always
      // names it, morphed.) OBSERVE only, never intercept(): intercepting
      // suppresses the popstate <BrowserRouter> needs → old===new → hard cut.
      if (sid != null) flushSync(() => setActiveId(sid));

      const doc = document as Document & {
        startViewTransition?: (cb: () => void | Promise<void>) => {
          ready?: Promise<void>;
          finished?: Promise<void>;
        };
      };
      let resolveVT: () => void = () => {};
      const vtDone = new Promise<void>((r) => {
        resolveVT = r;
      });
      const timer = window.setTimeout(() => resolveVT(), 700);
      pendingResolve.current = () => {
        window.clearTimeout(timer);
        resolveVT();
      };
      // Capture the old snapshot NOW; the traverse's popstate re-renders
      // react-router, resolving the callback with the new (list) snapshot so the
      // shared element morphs. Same reliable mechanism as the in-app go(-1).
      beginRouteVt();
      const vt = doc.startViewTransition!(() => vtDone);
      endRouteVt(vt);
      if (VT_DEBUG) {
        vt.ready?.then(
          () => vlog('browser-back VT ready'),
          (err) => vlog('browser-back VT ready REJECTED', String((err as Error)?.message ?? err)),
        );
        vt.finished?.then(() => vlog('browser-back VT finished'));
      }
    };
    vlog('navigate listener registered');
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
