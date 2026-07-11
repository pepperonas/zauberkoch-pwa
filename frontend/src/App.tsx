import { AnimatePresence, motion } from 'motion/react';
import { lazy, Suspense, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';

import { ProfileSheet } from './components/ProfileSheet';
import { IconButton } from './components/ui';
import { strings, t } from './i18n';
import { api } from './lib/api';
import { spring } from './motion/springs';
import { useApp } from './state/app';
import './App.css';

// Route-based code splitting: each page loads on demand
const GeneratePage = lazy(() => import('./pages/GeneratePage').then((m) => ({ default: m.GeneratePage })));
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage').then((m) => ({ default: m.RecipeDetailPage })));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage').then((m) => ({ default: m.FavoritesPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const ShoppingPage = lazy(() => import('./pages/ShoppingPage').then((m) => ({ default: m.ShoppingPage })));
const SharePage = lazy(() => import('./pages/SharePage').then((m) => ({ default: m.SharePage })));
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
// Lazy on purpose: keeps motion-dom's full engine out of the entry chunk
// (a component imported by the entry hoists its whole dep graph there).
const GenerationPill = lazy(() =>
  import('./components/GenerationPill').then((m) => ({ default: m.GenerationPill })),
);

const NAV_ITEMS = [
  { to: '/', icon: '✨', label: strings.nav.generate },
  { to: '/favoriten', icon: '⭐', label: strings.nav.favorites },
  { to: '/verlauf', icon: '🕘', label: strings.nav.history },
  { to: '/einkauf', icon: '🛒', label: strings.nav.shopping },
];

export default function App() {
  const { me, meLoading, theme, toggleTheme, refreshMe } = useApp();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await api.logout();
    refreshMe();
  };

  return (
    <div className="shell">
      <header className="shell__header">
        <a href="/" className="shell__logo">
          <span aria-hidden>🧑‍🍳</span> <span className="shell__logo-text">{t('app.name')}</span>
        </a>
        <div className="row shell__actions">
          <IconButton
            label={t('common.themeToggle')}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </IconButton>
          {me?.is_admin && (
            <NavLink to="/admin" className={`iconbtn ${location.pathname.startsWith('/admin') ? 'iconbtn--active' : ''}`} aria-label={t('admin.open')} title={t('admin.open')}>
              🛡️
            </NavLink>
          )}
          {me && (
            <>
              <IconButton label={t('profile.open')} onClick={() => setProfileOpen(true)}>
                {me.picture_url ? (
                  <img className="avatar" src={me.picture_url} alt={me.name || me.email} referrerPolicy="no-referrer" />
                ) : (
                  '👤'
                )}
              </IconButton>
              <IconButton className="shell__logout" label={t('auth.logout')} onClick={() => void handleLogout()}>
                ⏻
              </IconButton>
            </>
          )}
        </div>
      </header>

      <main className="shell__main">
        <Suspense fallback={<div style={{ minHeight: '100dvh' }} aria-hidden />}>
        {meLoading ? null : me ? (
          <Routes>
            <Route path="/" element={<GeneratePage />} />
            <Route path="/rezept/:id" element={<RecipeDetailPage />} />
            <Route path="/favoriten" element={<FavoritesPage />} />
            <Route path="/verlauf" element={<HistoryPage />} />
            <Route path="/einkauf" element={<ShoppingPage />} />
            <Route path="/r/:token" element={<SharePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<GeneratePage />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/r/:token" element={<SharePage />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
        )}
        </Suspense>
      </main>

      {me && <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />}
      {me && (
        <Suspense fallback={null}>
          <GenerationPill />
        </Suspense>
      )}

      <footer className="shell__footer">{t('app.footer')}</footer>

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
                    {item.icon}
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
