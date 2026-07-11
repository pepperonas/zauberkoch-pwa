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
          <span aria-hidden>🧑‍🍳</span> {t('app.name')}
        </a>
        <div className="row">
          <IconButton label={t('common.themeToggle')} onClick={toggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </IconButton>
          {me && (
            <>
              <IconButton label={t('profile.open')} onClick={() => setProfileOpen(true)}>
                {me.picture_url ? (
                  <img className="avatar" src={me.picture_url} alt={me.name || me.email} referrerPolicy="no-referrer" />
                ) : (
                  '👤'
                )}
              </IconButton>
              <IconButton label={t('auth.logout')} onClick={() => void handleLogout()}>
                ⏻
              </IconButton>
            </>
          )}
        </div>
      </header>

      <main className="shell__main">
        <Suspense fallback={null}>
        {meLoading ? null : me ? (
          <Routes>
            <Route path="/" element={<GeneratePage />} />
            <Route path="/rezept/:id" element={<RecipeDetailPage />} />
            <Route path="/favoriten" element={<FavoritesPage />} />
            <Route path="/verlauf" element={<HistoryPage />} />
            <Route path="/einkauf" element={<ShoppingPage />} />
            <Route path="/r/:token" element={<SharePage />} />
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
