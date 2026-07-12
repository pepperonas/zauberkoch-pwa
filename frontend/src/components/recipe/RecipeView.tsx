/** Shared recipe rendering — used for live streaming AND stored recipes.
 * Streaming lists cascade in with staggered springs; amounts scale live.
 */

import { motion, useReducedMotion } from 'motion/react';
import { Fragment, memo, useCallback, useMemo, useState } from 'react';

import { strings, t } from '../../i18n';
import type { Modus, Naehrwerte, RecipeMeta, Schritt, Zutat } from '../../lib/types';
import { formatZutatMenge } from '../../lib/units';
import { riseIn, spring, springBouncy, springSoft, stagger } from '../../motion/springs';
import { Icon } from '../icons';
import { NumberTicker } from './NumberTicker';
import { motifForRecipe, RecipeMotif } from './RecipeMotif';
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
  /** When set (detail page), each ingredient row offers "Ersatz finden". */
  onSubstitute?: (name: string) => void;
}

function fmtMin(min: number | null | undefined): string {
  if (min == null) return '–';
  return strings.units.duration(min);
}

export function RecipeView({ data, mode, streaming = false, actions, onPortionenChange, onSubstitute }: Props) {
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

  const toggleChecked = useCallback(
    (index: number) =>
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      }),
    [],
  );

  return (
    <div>
      {meta && (
        <motion.section className="hero" {...(reduced ? {} : riseIn)} transition={spring}>
          <div className="hero__content">
          <span className="hero__kueche">{meta.kueche}</span>
          <h1 className="hero__title">
            {streaming && !reduced
              ? meta.titel.split(' ').map((word, i) => (
                  <Fragment key={i}>
                    {i > 0 && ' '}
                    <motion.span
                      style={{ display: 'inline-block' }}
                      initial={{ opacity: 0, y: 16, rotate: -4 }}
                      animate={{ opacity: 1, y: 0, rotate: 0 }}
                      transition={{ ...springSoft, delay: 0.07 * i }}
                    >
                      {word}
                    </motion.span>
                  </Fragment>
                ))
              : meta.titel}
          </h1>
          <p className="hero__teaser">{meta.teaser}</p>
          <div className="hero__stats">
            <span className="stat"><Icon name="timer" size={15} /> {t('recipe.activeTime')} {fmtMin(meta.zeit_aktiv)}</span>
            <span className="stat"><Icon name="clock" size={15} /> {t('recipe.totalTime')} {fmtMin(meta.zeit_gesamt)}</span>
            <span className="stat"><Icon name="gauge" size={15} /> {meta.schwierigkeit}</span>
            {data.glas && <span className="stat"><Icon name="glass" size={15} /> {data.glas}</span>}
          </div>
          </div>
          <RecipeMotif
            className="hero__motif"
            seed={meta.titel}
            motif={motifForRecipe({ mode, titel: meta.titel, tags: meta.tags, kueche: meta.kueche, glas: data.glas })}
          />
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
              {group.items.map(({ zutat, index }) => (
                <ZutatRow
                  key={index}
                  zutat={zutat}
                  index={index}
                  isChecked={checked.has(index)}
                  factor={factor}
                  streaming={streaming}
                  onToggle={toggleChecked}
                  onSubstitute={onSubstitute}
                />
              ))}
            </Fragment>
          ))}
        </section>
      )}

      {data.schritte.length > 0 && (
        <section className="section">
          <h2>{t('recipe.steps')}</h2>
          {data.schritte.map((schritt, i) => (
            <SchrittRow key={schritt.nr ?? i} schritt={schritt} streaming={streaming} />
          ))}
        </section>
      )}

      {data.tipps.length > 0 && (
        <section className="section">
          <h2>{t('recipe.tips')}</h2>
          <div style={{ marginTop: 'var(--space-3)' }}>
            {data.tipps.map((tipp, i) => (
              <motion.div key={i} className="tipp" {...(reduced || !streaming ? {} : riseIn)} transition={stagger(0)}>
                <span aria-hidden><Icon name="bulb" size={18} /></span>
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
          <Icon name="herb" size={15} /> {t('recipe.garnish')}: {data.garnitur}
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


/** Memoized ingredient row: new streaming events must not re-render
 * every existing row (spring entrances on mid-range Android). */
const ZutatRow = memo(function ZutatRow({
  zutat,
  index,
  isChecked,
  factor,
  streaming,
  onToggle,
  onSubstitute,
}: {
  zutat: Zutat;
  index: number;
  isChecked: boolean;
  factor: number;
  streaming: boolean;
  onToggle: (index: number) => void;
  onSubstitute?: (name: string) => void;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      className={`zutat ${isChecked ? 'zutat--checked' : ''}`}
      onClick={() => onToggle(index)}
      aria-pressed={isChecked}
      {...(reduced || !streaming ? {} : riseIn)}
      transition={stagger(0)}
      layout={!reduced}
    >
      <span className="zutat__check" aria-hidden>
        {isChecked && (
          <motion.svg width="16" height="16" viewBox="0 0 16 16">
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
          <motion.span className="zutat__strike" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={spring} />
        )}
      </span>
      {onSubstitute && (
        <span
          className="zutat__subst"
          role="button"
          tabIndex={0}
          aria-label={t('subst.button')}
          title={t('subst.button')}
          onClick={(e) => {
            e.stopPropagation();
            onSubstitute(zutat.name);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              onSubstitute(zutat.name);
            }
          }}
        >
          ⇄
        </span>
      )}
    </motion.button>
  );
});


const SchrittRow = memo(function SchrittRow({ schritt, streaming }: { schritt: Schritt; streaming: boolean }) {
  const reduced = useReducedMotion();
  return (
    <motion.div className="schritt" {...(reduced || !streaming ? {} : riseIn)} transition={stagger(0)}>
      <span className="schritt__nr">{schritt.nr}</span>
      <div>
        <div className="schritt__titel">{schritt.titel}</div>
        <p className="schritt__text">{schritt.text}</p>
        {schritt.dauer_sek != null && schritt.dauer_sek > 0 && (
          <span className="schritt__timer"><Icon name="timer" size={14} /> {strings.units.duration(schritt.dauer_sek / 60)}</span>
        )}
      </div>
    </motion.div>
  );
});
