/** Landing for logged-out users: show the product (3 read-only examples), then login CTA. */

import { motion, useReducedMotion } from 'motion/react';

import { CuisineHero } from '../components/recipe/CuisineHero';
import { Button } from '../components/ui';
import { strings, t } from '../i18n';
import { riseIn, spring, stagger } from '../motion/springs';
import { useLocation } from 'react-router-dom';

const EXAMPLES = [
  {
    href: '/r/47Gob2qNH2un',
    kueche: 'Italienisch',
    mode: 'kochen' as const,
    titel: 'Spaghetti alle Vongole',
    teaser: 'Klassiker aus Neapel: Muscheln, Weißwein, Knoblauch und Petersilie treffen auf perfekt al dente Spaghetti — frisch, salzig, in 25 Minuten fertig.',
    stats: ['🕐 30 Min.', '📶 mittel'],
  },
  {
    href: '/r/_LCP3L_O-LuV',
    kueche: 'Thailändisch',
    mode: 'kochen' as const,
    titel: 'Massaman-Curry mit Rindfleisch',
    teaser: 'Mildscharf und cremig: geröstete Gewürze, zart geschmortes Rind und ein Hauch Tamarinde — die Klassik aus dem Süden Thailands.',
    stats: ['🕐 1,5 h', '📶 mittel'],
  },
  {
    href: '/r/BWyqyP7jL0lI',
    kueche: 'Klassiker',
    mode: 'cocktail' as const,
    titel: 'Gin Sour Royal',
    teaser: 'Feiner Eiweiß-Schaum, spritzige Zitrusnote, ein Hauch Wacholder — frisch, sauer, perfekt austariert.',
    stats: ['🍸 2 Drinks', '🥃 Coupette'],
  },
];

export function LandingPage() {
  const reduced = useReducedMotion();
  const location = useLocation();
  const loginError = new URLSearchParams(location.search).get('login_error');

  return (
    <div>
      <motion.section
        className="hero"
        style={{ marginTop: 'var(--space-4)' }}
        {...(reduced ? {} : riseIn)}
        transition={spring}
      >
        <span className="hero__kueche">{t('app.tagline')}</span>
        <h1 className="hero__title">{t('landing.heroTitle')}</h1>
        <p className="hero__teaser">{t('landing.heroText')}</p>
        <div className="row" style={{ marginTop: 'var(--space-5)', flexWrap: 'wrap' }}>
          <Button big onClick={() => (window.location.href = '/api/v1/auth/login')}>
            {t('auth.login')}
          </Button>
          {import.meta.env.DEV && (
            <Button variant="text" onClick={() => (window.location.href = '/api/v1/auth/dev-login')}>
              🛠 {t('auth.devLogin')}
            </Button>
          )}
        </div>
        {loginError && (
          <p style={{ marginTop: 'var(--space-4)', color: 'var(--c-error)' }} role="alert">
            {loginError === 'not_allowed' ? t('auth.notAllowed') : t('auth.loginFailed')}
          </p>
        )}
      </motion.section>

      <section className="section">
        <h2>{t('landing.exampleTitle')}</h2>
        <div className="stack" style={{ marginTop: 'var(--space-4)' }}>
          {EXAMPLES.map((ex, i) => (
            <motion.a
              key={ex.titel}
              href={ex.href}
              className="card card--outlined"
              style={{ position: 'relative', overflow: 'hidden', display: 'block', color: 'inherit' }}
              {...(reduced ? {} : riseIn)}
              transition={stagger(i, 0.12)}
              whileTap={reduced ? undefined : { scale: 0.98 }}
            >
              <CuisineHero kueche={ex.kueche} mode={ex.mode} />
              <span className="hero__kueche">{ex.kueche}</span>
              <h3 style={{ margin: 'var(--space-2) 0' }}>{ex.titel}</h3>
              <p className="muted">{ex.teaser}</p>
              <div className="hero__stats">
                {ex.stats.map((s) => (
                  <span key={s} className="stat">{s}</span>
                ))}
              </div>
            </motion.a>
          ))}
        </div>
      </section>

      <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
        <Button big variant="tonal" onClick={() => (window.location.href = '/api/v1/auth/login')}>
          🪄 {t('landing.cta')}
        </Button>
      </div>
      <p className="muted" style={{ textAlign: 'center', marginTop: 'var(--space-4)', font: 'var(--type-label)' }}>
        {strings.auth.loginRequired}
      </p>
    </div>
  );
}
