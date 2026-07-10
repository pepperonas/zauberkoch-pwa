import { AnimatePresence, motion } from 'motion/react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';

import { IconButton } from './components/ui';
import { strings, t } from './i18n';
import { api } from './lib/api';
import { spring } from './motion/springs';
import { FavoritesPage } from './pages/FavoritesPage';
import { GeneratePage } from './pages/GeneratePage';
import { HistoryPage } from './pages/HistoryPage';
import { LandingPage } from './pages/LandingPage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { SharePage } from './pages/SharePage';
import { ShoppingPage } from './pages/ShoppingPage';
import { useApp } from './state/app';
import './App.css';

const NAV_ITEMS = [
  { to: '/', icon: '✨', label: strings.nav.generate },
  { to: '/favoriten', icon: '⭐', label: strings.nav.favorites },
  { to: '/verlauf', icon: '🕘', label: strings.nav.history },
  { to: '/einkauf', icon: '🛒', label: strings.nav.shopping },
];

export default function App() {
  const { me, meLoading, theme, toggleTheme, refreshMe } = useApp();
  const location = useLocation();

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
              {me.picture_url ? (
                <img className="avatar" src={me.picture_url} alt={me.name || me.email} referrerPolicy="no-referrer" />
              ) : null}
              <IconButton label={t('auth.logout')} onClick={() => void handleLogout()}>
                ⏻
              </IconButton>
            </>
          )}
        </div>
      </header>

      <main className="shell__main">
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
      </main>

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
