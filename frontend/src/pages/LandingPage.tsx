/** Landing for logged-out users: show the product (3 read-only examples), then login CTA. */

import { motion, useReducedMotion } from 'motion/react';

import { CuisineHero } from '../components/recipe/CuisineHero';
import { Button } from '../components/ui';
import { strings, t } from '../i18n';
import { riseIn, spring, stagger } from '../motion/springs';
import { useLocation } from 'react-router-dom';

const EXAMPLES = [
  {
    kueche: 'Italienisch',
    mode: 'kochen' as const,
    titel: 'Pasta al Limone mit knusprigem Salbei',
    teaser: 'Cremig, zitronig, in 20 Minuten — das Pasta-Wasser macht die Sauce seidig.',
    stats: ['🕐 20 Min.', '📶 einfach'],
  },
  {
    kueche: 'Thai',
    mode: 'kochen' as const,
    titel: 'Gaeng Khiao Wan — grünes Curry',
    teaser: 'Authentische Paste, Kokosmilch in zwei Stufen, Thai-Basilikum zum Schluss.',
    stats: ['🕐 45 Min.', '📶 mittel'],
  },
  {
    kueche: 'Klassiker',
    mode: 'cocktail' as const,
    titel: 'Smoky Paloma',
    teaser: 'Mezcal statt Tequila, frische Grapefruit, Salzrand — shaken, nicht gerührt.',
    stats: ['🍸 2 Drinks', '🥃 Highball'],
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
        <div style={{ marginTop: 'var(--space-5)' }}>
          <Button big onClick={() => (window.location.href = '/api/v1/auth/login')}>
            {t('auth.login')}
          </Button>
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
            <motion.div
              key={ex.titel}
              className="card card--outlined"
              style={{ position: 'relative', overflow: 'hidden' }}
              {...(reduced ? {} : riseIn)}
              transition={stagger(i, 0.12)}
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
            </motion.div>
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
