/** Landing for logged-out users: TRY the magic first (one free generation,
 * hard-capped server-side), then examples + login CTA (with invite codes). */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { ConjureStage } from '../components/recipe/ConjureStage';
import { CuisineHero } from '../components/recipe/CuisineHero';
import { RecipeView, type RecipeViewData } from '../components/recipe/RecipeView';
import { Button, Chip } from '../components/ui';
import { strings, t } from '../i18n';
import { tryRecipe } from '../lib/sse';
import { riseIn, spring, stagger } from '../motion/springs';
import type { GenEvent } from '../state/generation';

const EMPTY: RecipeViewData = { meta: null, zutaten: [], schritte: [], tipps: [] };

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
  const [invite, setInvite] = useState('');

  const login = () => {
    const code = invite.trim();
    window.location.href = code ? `/api/v1/auth/login?invite=${encodeURIComponent(code)}` : '/api/v1/auth/login';
  };

  return (
    <div>
      <motion.section
        className="hero"
        style={{ marginTop: 'var(--space-4)' }}
        {...(reduced ? {} : riseIn)}
        transition={spring}
      >
        <div className="hero__content">
          <span className="hero__kueche">{t('app.tagline')}</span>
          <h1 className="hero__title">{t('landing.heroTitle')}</h1>
          <p className="hero__teaser">{t('landing.heroText')}</p>
          <div className="row" style={{ marginTop: 'var(--space-5)', flexWrap: 'wrap' }}>
            <Button big onClick={login}>
              {t('auth.login')}
            </Button>
            {import.meta.env.DEV && (
              <Button variant="text" onClick={() => (window.location.href = '/api/v1/auth/dev-login')}>
                🛠 {t('auth.devLogin')}
              </Button>
            )}
          </div>
          <div style={{ marginTop: 'var(--space-4)', maxWidth: 280 }}>
            <label className="muted" htmlFor="invite" style={{ font: 'var(--type-label-sm)' }}>
              🎟️ {t('landing.inviteLabel')}
            </label>
            <input
              id="invite"
              className="input"
              style={{ marginTop: 'var(--space-1)' }}
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder={t('landing.invitePlaceholder')}
              maxLength={16}
            />
          </div>
          {loginError && (
            <p style={{ marginTop: 'var(--space-4)', color: 'var(--c-error)' }} role="alert">
              {loginError === 'not_allowed' ? t('auth.notAllowed') : t('auth.loginFailed')}
            </p>
          )}
        </div>
      </motion.section>

      <TryWizard onLogin={login} />

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
        <Button big variant="tonal" onClick={login}>
          🪄 {t('landing.cta')}
        </Button>
      </div>
      <p className="muted" style={{ textAlign: 'center', marginTop: 'var(--space-4)', font: 'var(--type-label)' }}>
        {strings.auth.loginRequired}
      </p>
    </div>
  );
}

/* ---------- one free taster generation, streaming inline ---------- */

function TryWizard({ onLogin }: { onLogin: () => void }) {
  const reduced = useReducedMotion();
  const [kueche, setKueche] = useState('Italienisch');
  const [geschmack, setGeschmack] = useState<string[]>([]);
  const [phase, setPhase] = useState<'idle' | 'streaming' | 'done' | 'limit'>('idle');
  const [data, setData] = useState<RecipeViewData>(EMPTY);
  const [lastEvent, setLastEvent] = useState<GenEvent>('start');
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => () => abortRef.current?.(), []);

  const start = () => {
    abortRef.current?.();
    setData(EMPTY);
    setLastEvent('start');
    setPhase('streaming');
    abortRef.current = tryRecipe(
      { modus: 'kochen', kueche, geschmack, personen: 2 },
      {
        onMeta: (meta) => {
          setData((d) => ({ ...d, meta }));
          setLastEvent('meta');
        },
        onZutat: (z) => {
          setData((d) => ({ ...d, zutaten: [...d.zutaten, z] }));
          setLastEvent('zutat');
        },
        onSchritt: (s) => {
          setData((d) => ({ ...d, schritte: [...d.schritte, s] }));
          setLastEvent('schritt');
        },
        onTipp: (tip) => {
          setData((d) => ({ ...d, tipps: [...d.tipps, tip] }));
          setLastEvent('tipp');
        },
        onDone: (recipe) => {
          setData({
            meta: recipe,
            zutaten: recipe.zutaten,
            schritte: recipe.schritte,
            tipps: recipe.tipps,
            naehrwerte: recipe.naehrwerte,
            glas: recipe.glas,
            garnitur: recipe.garnitur,
          });
          setLastEvent('done');
          setPhase('done');
        },
        onError: () => setPhase('limit'),
      },
    );
  };

  return (
    <section className="section">
      <h2>✨ {t('landing.tryTitle')}</h2>
      <p className="muted" style={{ marginTop: 'var(--space-2)' }}>{t('landing.tryHint')}</p>

      {phase === 'idle' && (
        <div className="stack" style={{ marginTop: 'var(--space-4)' }}>
          <div className="chips">
            {strings.cuisines.map((c) => (
              <Chip key={c} selected={kueche === c} onToggle={() => setKueche(c)}>
                {c}
              </Chip>
            ))}
          </div>
          <div className="chips">
            {strings.tastes.map((taste) => (
              <Chip
                key={taste}
                selected={geschmack.includes(taste)}
                onToggle={() => setGeschmack((g) => (g.includes(taste) ? g.filter((x) => x !== taste) : [...g, taste]))}
              >
                {taste}
              </Chip>
            ))}
          </div>
          <div>
            <Button big onClick={start}>🪄 {t('landing.tryButton')}</Button>
          </div>
        </div>
      )}

      {phase === 'limit' && (
        <div className="card card--outlined" style={{ marginTop: 'var(--space-4)' }}>
          <p>{t('landing.tryLimit')}</p>
          <div className="actions">
            <Button onClick={onLogin}>{t('auth.login')}</Button>
          </div>
        </div>
      )}

      {(phase === 'streaming' || phase === 'done') && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <AnimatePresence>
            {phase === 'streaming' && <ConjureStage mode="kochen" data={data} lastEvent={lastEvent} />}
          </AnimatePresence>
          <RecipeView data={data} mode="kochen" streaming={phase === 'streaming'} />
          {phase === 'done' && (
            <motion.div
              className="card card--outlined"
              style={{ marginTop: 'var(--space-5)' }}
              {...(reduced ? {} : riseIn)}
              transition={spring}
            >
              <h3>{t('landing.tryCtaTitle')}</h3>
              <p className="muted" style={{ marginTop: 'var(--space-2)' }}>{t('landing.tryCtaText')}</p>
              <div className="actions">
                <Button big onClick={onLogin}>{t('auth.login')}</Button>
                <Button variant="text" onClick={() => setPhase('idle')}>← {t('stream.newRecipe')}</Button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </section>
  );
}
