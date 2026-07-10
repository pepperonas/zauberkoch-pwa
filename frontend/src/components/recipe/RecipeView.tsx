/** Shared recipe rendering — used for live streaming AND stored recipes.
 * Streaming lists cascade in with staggered springs; amounts scale live.
 */

import { motion, useReducedMotion } from 'motion/react';
import { Fragment, useMemo, useState } from 'react';

import { t } from '../../i18n';
import type { Modus, Naehrwerte, RecipeMeta, Schritt, Zutat } from '../../lib/types';
import { formatZutatMenge } from '../../lib/units';
import { riseIn, spring, springBouncy, stagger } from '../../motion/springs';
import { NumberTicker } from './NumberTicker';
import { CuisineHero } from './CuisineHero';
import './recipe.css';

export interface RecipeViewData {
  meta: RecipeMeta | null;
  zutaten: Zutat[];
  schritte: Schritt[];
  tipps: string[];
  naehrwerte?: Naehrwerte | null;
  glas?: string | null;
  garnitur?: string | null;
}

interface Props {
  data: RecipeViewData;
  mode: Modus;
  streaming?: boolean;
  actions?: React.ReactNode;
  onPortionenChange?: (portionen: number) => void;
}

function fmtMin(min: number | null | undefined): string {
  if (min == null) return '–';
  return min >= 90 ? `${Math.round((min / 60) * 10) / 10} h` : `${min} ${t('wizard.minutes')}`;
}

export function RecipeView({ data, mode, streaming = false, actions, onPortionenChange }: Props) {
  const reduced = useReducedMotion();
  const { meta } = data;
  const basePortionen = meta?.portionen ?? 1;
  const [portionen, setPortionenState] = useState<number | null>(null);
  const shown = portionen ?? basePortionen;
  const factor = shown / basePortionen;
  const setPortionen = (next: number) => {
    setPortionenState(next);
    onPortionenChange?.(next);
  };
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const grouped = useMemo(() => {
    const groups: { gruppe: string; items: { zutat: Zutat; index: number }[] }[] = [];
    data.zutaten.forEach((zutat, index) => {
      const name = zutat.gruppe || '';
      const last = groups[groups.length - 1];
      if (last && last.gruppe === name) last.items.push({ zutat, index });
      else groups.push({ gruppe: name, items: [{ zutat, index }] });
    });
    return groups;
  }, [data.zutaten]);

  const toggleChecked = (index: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <div>
      {meta && (
        <motion.section className="hero" {...(reduced ? {} : riseIn)} transition={spring}>
          <CuisineHero kueche={meta.kueche} mode={mode} />
          <span className="hero__kueche">{meta.kueche}</span>
          <h1 className="hero__title">{meta.titel}</h1>
          <p className="hero__teaser">{meta.teaser}</p>
          <div className="hero__stats">
            <span className="stat">⏱ {t('recipe.activeTime')} {fmtMin(meta.zeit_aktiv)}</span>
            <span className="stat">🕐 {t('recipe.totalTime')} {fmtMin(meta.zeit_gesamt)}</span>
            <span className="stat">📶 {meta.schwierigkeit}</span>
            {data.glas && <span className="stat">🥃 {data.glas}</span>}
          </div>
        </motion.section>
      )}

      {data.zutaten.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2>{t('recipe.ingredients')}</h2>
            <div className="stepper" aria-label={mode === 'cocktail' ? t('wizard.drinks') : t('recipe.servings')}>
              <motion.button
                className="stepper__btn"
                whileTap={reduced ? undefined : { scale: 0.85 }}
                transition={springBouncy}
                onClick={() => setPortionen(Math.max(1, shown - 1))}
                aria-label="−"
              >
                −
              </motion.button>
              <NumberTicker value={shown} />
              <motion.button
                className="stepper__btn"
                whileTap={reduced ? undefined : { scale: 0.85 }}
                transition={springBouncy}
                onClick={() => setPortionen(Math.min(24, shown + 1))}
                aria-label="+"
              >
                +
              </motion.button>
            </div>
          </div>

          {grouped.map((group) => (
            <Fragment key={group.gruppe || 'default'}>
              {group.gruppe && <div className="zutat__gruppe">{group.gruppe}</div>}
              {group.items.map(({ zutat, index }) => {
                const isChecked = checked.has(index);
                return (
                  <motion.button
                    key={index}
                    className={`zutat ${isChecked ? 'zutat--checked' : ''}`}
                    onClick={() => toggleChecked(index)}
                    aria-pressed={isChecked}
                    {...(reduced || !streaming ? {} : riseIn)}
                    transition={stagger(0)}
                    layout={!reduced}
                  >
                    <span className="zutat__check" aria-hidden>
                      {isChecked && (
                        <motion.svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          initial={reduced ? undefined : { pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={springBouncy}
                        >
                          <motion.path
                            d="M3 8.5 L6.5 12 L13 4.5"
                            stroke="var(--c-on-primary)"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            fill="none"
                            initial={reduced ? undefined : { pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.28, ease: 'easeOut' }}
                          />
                        </motion.svg>
                      )}
                    </span>
                    <span className="zutat__label">
                      <span className="zutat__menge">{formatZutatMenge(zutat, factor)}</span>{' '}
                      {zutat.name}
                      {isChecked && !reduced && (
                        <motion.span
                          className="zutat__strike"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={spring}
                        />
                      )}
                    </span>
                  </motion.button>
                );
              })}
            </Fragment>
          ))}
        </section>
      )}

      {data.schritte.length > 0 && (
        <section className="section">
          <h2>{t('recipe.steps')}</h2>
          {data.schritte.map((schritt, i) => (
            <motion.div
              key={schritt.nr ?? i}
              className="schritt"
              {...(reduced || !streaming ? {} : riseIn)}
              transition={stagger(0)}
            >
              <span className="schritt__nr">{schritt.nr}</span>
              <div>
                <div className="schritt__titel">{schritt.titel}</div>
                <p className="schritt__text">{schritt.text}</p>
                {schritt.dauer_sek != null && schritt.dauer_sek > 0 && (
                  <span className="schritt__timer">⏲ {Math.round(schritt.dauer_sek / 60)} {t('wizard.minutes')}</span>
                )}
              </div>
            </motion.div>
          ))}
        </section>
      )}

      {data.tipps.length > 0 && (
        <section className="section">
          <h2>{t('recipe.tips')}</h2>
          <div style={{ marginTop: 'var(--space-3)' }}>
            {data.tipps.map((tipp, i) => (
              <motion.div key={i} className="tipp" {...(reduced || !streaming ? {} : riseIn)} transition={stagger(0)}>
                <span aria-hidden>💡</span>
                <p>{tipp}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {data.naehrwerte && (
        <section className="section">
          <h2>{t('recipe.nutrition')}</h2>
          <div className="nutri" style={{ marginTop: 'var(--space-3)' }}>
            {data.naehrwerte.kalorien_kcal != null && (
              <div className="nutri__cell">
                <div className="nutri__value">{data.naehrwerte.kalorien_kcal}</div>
                <div className="nutri__label">{t('recipe.calories')}</div>
              </div>
            )}
            {data.naehrwerte.eiweiss_g != null && (
              <div className="nutri__cell">
                <div className="nutri__value">{data.naehrwerte.eiweiss_g} g</div>
                <div className="nutri__label">{t('recipe.protein')}</div>
              </div>
            )}
            {data.naehrwerte.fett_g != null && (
              <div className="nutri__cell">
                <div className="nutri__value">{data.naehrwerte.fett_g} g</div>
                <div className="nutri__label">{t('recipe.fat')}</div>
              </div>
            )}
            {data.naehrwerte.kohlenhydrate_g != null && (
              <div className="nutri__cell">
                <div className="nutri__value">{data.naehrwerte.kohlenhydrate_g} g</div>
                <div className="nutri__label">{t('recipe.carbs')}</div>
              </div>
            )}
          </div>
        </section>
      )}

      {data.garnitur && (
        <p className="muted" style={{ marginTop: 'var(--space-4)' }}>
          🌿 {t('recipe.garnish')}: {data.garnitur}
        </p>
      )}

      {streaming && (
        <div className="writing" style={{ marginTop: 'var(--space-5)' }} role="status">
          <motion.span
            className="writing__dot"
            animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
          />
          {t('stream.writing')}
        </div>
      )}

      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

export { fmtMin };
