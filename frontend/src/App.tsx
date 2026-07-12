import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';

import { Icon, type IconName } from './components/icons';
import { ProfileSheet } from './components/ProfileSheet';
import { IconButton } from './components/ui';
import { strings, t } from './i18n';
import { api } from './lib/api';
import type { Me } from './lib/types';
import { spring } from './motion/springs';
import { pageVariants, pageVariantsReduced } from './motion/tokens';
import { useApp } from './state/app';
import './App.css';

// Route-based code splitting: each page loads on demand.
// lazyPage self-heals stale sessions: after a deploy the old hashed chunks
// are eventually pruned -> dynamic import 404s -> reload ONCE to pick up the
// fresh shell (guarded per chunk so a real outage can't reload-loop).
function lazyPage<T extends React.ComponentType>(name: string, factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    const guard = `zk-chunk-reload-${name}`;
    try {
      const mod = await factory();
      sessionStorage.removeItem(guard);
      return mod;
    } catch (err) {
      if (!sessionStorage.getItem(guard)) {
        sessionStorage.setItem(guard, '1');
        window.location.reload();
        return { default: (() => null) as unknown as T };
      }
      throw err;
    }
  });
}

const GeneratePage = lazyPage('generate', () => import('./pages/GeneratePage').then((m) => ({ default: m.GeneratePage })));
const RecipeDetailPage = lazyPage('detail', () => import('./pages/RecipeDetailPage').then((m) => ({ default: m.RecipeDetailPage })));
const FavoritesPage = lazyPage('favorites', () => import('./pages/FavoritesPage').then((m) => ({ default: m.FavoritesPage })));
const HistoryPage = lazyPage('history', () => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const ShoppingPage = lazyPage('shopping', () => import('./pages/ShoppingPage').then((m) => ({ default: m.ShoppingPage })));
const PlanPage = lazyPage('plan', () => import('./pages/PlanPage').then((m) => ({ default: m.PlanPage })));
const SharePage = lazyPage('share', () => import('./pages/SharePage').then((m) => ({ default: m.SharePage })));
const LandingPage = lazyPage('landing', () => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const AdminPage = lazyPage('admin', () => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const ImpressumPage = lazyPage('impressum', () => import('./pages/legal/ImpressumPage').then((m) => ({ default: m.ImpressumPage })));
const DatenschutzPage = lazyPage('datenschutz', () => import('./pages/legal/DatenschutzPage').then((m) => ({ default: m.DatenschutzPage })));
const TermsPage = lazyPage('terms', () => import('./pages/legal/TermsPage').then((m) => ({ default: m.TermsPage })));
// Lazy on purpose: keeps motion-dom's full engine out of the entry chunk
// (a component imported by the entry hoists its whole dep graph there).
const GenerationPill = lazyPage('genpill', () =>
  import('./components/GenerationPill').then((m) => ({ default: m.GenerationPill })),
);
const GenerationBar = lazyPage('genbar', () =>
  import('./components/GenerationPill').then((m) => ({ default: m.GenerationBar })),
);

// Detail routes sit one "level" deeper than the top-level tabs. A level change
// picks Shared Axis (X) with a direction; same-level picks Fade Through.
function routeLevel(path: string): number {
  return path.startsWith('/rezept/') || path.startsWith('/r/') ? 1 : 0;
}
function directionBetween(from: string, to: string): number {
  return Math.sign(routeLevel(to) - routeLevel(from)); // +1 forward, -1 back, 0 tabs
}

// > enter+exit budget: fallback cleanup for the header un-blur class.
const PAGE_TX_MS = 520;

/**
 * Route transitions (MD3 Expressive). AnimatePresence mode="wait" runs a clean
 * exit → enter with no DOM-swap flicker; transform+opacity only (compositor).
 * Shared Axis X for forward/back (list ↔ detail), Fade Through between tabs.
 * The header's backdrop blur is dropped for the duration (per-frame blur behind
 * the sliding page is the main mobile-GPU jank source). Scroll is reset/restored
 * in onExitComplete so it never jumps the still-visible outgoing page.
 */
function AnimatedRoutes({ me, meLoading }: { me: Me | null; meLoading: boolean }) {
  const location = useLocation();
  const navType = useNavigationType();
  const reduced = useReducedMotion();

  // prevPath.current still holds the previous pathname during this render; the
  // effect advances it after commit, so `dir` reflects this navigation.
  const prevPath = useRef(location.pathname);
  const dir = reduced ? 0 : directionBetween(prevPath.current, location.pathname);
  useEffect(() => {
    prevPath.current = location.pathname;
  }, [location.pathname]);

  // Per-path scroll memory: restore on back (POP), reset to top on forward.
  const positions = useRef(new Map<string, number>());
  const navTypeRef = useRef(navType);
  navTypeRef.current = navType;
  useEffect(() => {
    const path = location.pathname;
    const onScroll = () => positions.current.set(path, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  useLayoutEffect(() => {
    if (reduced) return;
    const root = document.documentElement;
    root.classList.add('zk-page-vt');
    const id = window.setTimeout(() => root.classList.remove('zk-page-vt'), PAGE_TX_MS);
    return () => {
      window.clearTimeout(id);
      root.classList.remove('zk-page-vt');
    };
  }, [location.pathname, reduced]);

  const handleExitComplete = () => {
    const saved = positions.current.get(location.pathname);
    const target = navTypeRef.current === 'POP' && saved != null ? saved : 0;
    if (target === 0) {
      window.scrollTo(0, 0);
      return;
    }
    // Back-restore: the incoming page may not have its full height yet, so a
    // single scrollTo clamps short. Retry across a few frames until it lands.
    let tries = 0;
    const restore = () => {
      window.scrollTo(0, target);
      if (window.scrollY < target - 1 && tries++ < 20) requestAnimationFrame(restore);
    };
    requestAnimationFrame(restore);
  };

  const routes = me ? (
    <Routes location={location}>
      <Route path="/" element={<GeneratePage />} />
      <Route path="/rezept/:id" element={<RecipeDetailPage />} />
      <Route path="/favoriten" element={<FavoritesPage />} />
      <Route path="/verlauf" element={<HistoryPage />} />
      <Route path="/einkauf" element={<ShoppingPage />} />
      <Route path="/plan" element={<PlanPage />} />
      <Route path="/r/:token" element={<SharePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/impressum" element={<ImpressumPage />} />
      <Route path="/datenschutz" element={<DatenschutzPage />} />
      <Route path="/nutzungsbedingungen" element={<TermsPage />} />
      <Route path="*" element={<GeneratePage />} />
    </Routes>
  ) : (
    <Routes location={location}>
      <Route path="/r/:token" element={<SharePage />} />
      <Route path="/impressum" element={<ImpressumPage />} />
      <Route path="/datenschutz" element={<DatenschutzPage />} />
      <Route path="/nutzungsbedingungen" element={<TermsPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );

  return (
    <AnimatePresence mode="wait" custom={dir} initial={false} onExitComplete={handleExitComplete}>
      <motion.div
        key={location.pathname}
        custom={dir}
        variants={reduced ? pageVariantsReduced : pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="page-tx"
      >
        <Suspense fallback={<div className="page-tx__spacer" aria-hidden />}>
          {meLoading ? null : routes}
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

const NAV_ITEMS: { to: string; icon: IconName; label: string }[] = [
  { to: '/', icon: 'sparkles', label: strings.nav.generate },
  { to: '/favoriten', icon: 'star', label: strings.nav.favorites },
  { to: '/verlauf', icon: 'history', label: strings.nav.history },
  { to: '/einkauf', icon: 'cart', label: strings.nav.shopping },
  { to: '/plan', icon: 'calendar', label: strings.nav.plan },
];

export default function App() {
  const { me, meLoading, theme, toggleTheme, refreshMe } = useApp();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await api.logout();
    refreshMe();
  };

  // Warm the route chunks on idle so navigating never hits a blank Suspense
  // fallback (the flash between an instant DOM swap and the entering animation).
  useEffect(() => {
    type IdleWin = Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const w = window as IdleWin;
    const schedule = w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
    const id = schedule(() => {
      void import('./pages/RecipeDetailPage');
      void import('./pages/FavoritesPage');
      void import('./pages/HistoryPage');
      void import('./pages/ShoppingPage');
      void import('./pages/PlanPage');
    });
    return () => w.cancelIdleCallback?.(id as number);
  }, []);

  return (
    <div className="shell">
      <header className="shell__header">
        {/* SPA link — a real <a href> would hard-reload and kill a running generation */}
        <Link to="/" className="shell__logo">
          <Icon name="logo" size={28} /> <span className="shell__logo-text">{t('app.name')}</span>
        </Link>
        <div className="row shell__actions">
          <IconButton
            label={t('common.themeToggle')}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
            }}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={24} />
          </IconButton>
          {me?.is_admin && (
            <NavLink to="/admin" className={`iconbtn ${location.pathname.startsWith('/admin') ? 'iconbtn--active' : ''}`} aria-label={t('admin.open')} title={t('admin.open')}>
              <Icon name="shield" size={24} />
            </NavLink>
          )}
          {me && (
            <>
              <IconButton label={t('profile.open')} onClick={() => setProfileOpen(true)}>
                {me.picture_url ? (
                  <img className="avatar" src={me.picture_url} alt={me.name || me.email} referrerPolicy="no-referrer" />
                ) : (
                  <Icon name="user" size={24} />
                )}
              </IconButton>
              <IconButton className="shell__logout" label={t('auth.logout')} onClick={() => void handleLogout()}>
                <Icon name="power" size={24} />
              </IconButton>
            </>
          )}
        </div>
        {me && (
          <Suspense fallback={null}>
            <GenerationBar />
          </Suspense>
        )}
      </header>

      <main className="shell__main">
        <AnimatedRoutes me={me} meLoading={meLoading} />
      </main>

      {me && <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />}
      {me && (
        <Suspense fallback={null}>
          <GenerationPill />
        </Suspense>
      )}

      <footer className="shell__footer">
        <nav className="shell__legal" aria-label="Rechtliches">
          <Link to="/impressum">{t('legal.impressum')}</Link>
          <span aria-hidden>·</span>
          <Link to="/datenschutz">{t('legal.privacy')}</Link>
          <span aria-hidden>·</span>
          <Link to="/nutzungsbedingungen">{t('legal.terms')}</Link>
        </nav>
        {t('app.footer')}
      </footer>

      {me && (
        <nav className="nav" aria-label="Hauptnavigation">
          <AnimatePresence>
            {NAV_ITEMS.map((item) => {
              const active =
                item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
              return (
                <NavLink key={item.to} to={item.to} className={`nav__item ${active ? 'nav__item--active' : ''}`}>
                  {active && <motion.span className="nav__pill" layoutId="nav-pill" transition={spring} />}
                  <span className="nav__icon" aria-hidden>
                    <Icon name={item.icon} size={24} />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </AnimatePresence>
        </nav>
      )}
    </div>
  );
}
