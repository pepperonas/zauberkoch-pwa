/** Shared-element view-transition names for the recipe card ↔ detail-hero morph.
 *
 * The route transitions themselves are driven by react-router's BUILT-IN view
 * transitions (data router: `createBrowserRouter` + `navigate(to, {viewTransition:
 * true})` / `<NavLink viewTransition>`). react-router owns the history, so it
 * synchronises the render with `document.startViewTransition` for BOTH push AND
 * pop (browser/system back) — which the old hand-rolled provider could not do
 * reliably for the browser-back button on real mobile Chrome.
 *
 * Which element carries the shared name is decided per component via
 * `useViewTransitionState('/rezept/<id>')` (true while a transition to OR from
 * that route is in flight — so the card and the hero pair up for forward AND
 * back). CSS for these groups lives in styles/base.css. */
export const SHARED_MOTIF = 'zk-shared-motif';
export const SHARED_TITLE = 'zk-shared-title';
