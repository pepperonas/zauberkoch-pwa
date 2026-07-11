/** Home: 3-step wizard (skippable) -> live streaming recipe. */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { CookMode } from '../components/recipe/CookMode';
import { FeedbackBar } from '../components/recipe/FeedbackBar';
import { RecipeView, type RecipeViewData } from '../components/recipe/RecipeView';
import { ShareDialog } from '../components/recipe/ShareDialog';
import { Button, Chip, Segmented, Switch } from '../components/ui';
import { Dialog } from '../components/ui/Dialog';
import { Sheet } from '../components/ui/Sheet';
import { useSnackbar } from '../components/ui/Snackbar';
import { useShoppingUndo } from '../state/useShoppingUndo';
import { strings, t } from '../i18n';
import { api } from '../lib/api';
import { streamRecipe } from '../lib/sse';
import type { ApiError, GenerateParams, Modus, Schwierigkeit } from '../lib/types';
import { spring, springSnappy } from '../motion/springs';
import { useApp } from '../state/app';
import './wizard.css';

type Phase = 'wizard' | 'streaming' | 'done' | 'limit';

const EMPTY_DATA: RecipeViewData = { meta: null, zutaten: [], schritte: [], tipps: [] };

export function GeneratePage() {
  const { mode, setMode, me, refreshMe } = useApp();
  const reduced = useReducedMotion();
  const queryClient = useQueryClient();

  // Wizard state
  const [step, setStep] = useState(0);
  const [kueche, setKueche] = useState('');
  const [kuecheFrei, setKuecheFrei] = useState('');
  const [geschmack, setGeschmack] = useState<string[]>([]);
  const [constraintsOpen, setConstraintsOpen] = useState(false);
  const [vegetarisch, setVegetarisch] = useState(false);
  const [vegan, setVegan] = useState(false);
  const [glutenfrei, setGlutenfrei] = useState(false);
  const [laktosefrei, setLaktosefrei] = useState(false);
  const [maxZeit, setMaxZeit] = useState<number | null>(null);
  const [schwierigkeit, setSchwierigkeit] = useState<Schwierigkeit | null>(null);
  const [personen, setPersonen] = useState(me?.preferences?.standard_personen ?? 2);
  const [fridge, setFridge] = useState<string[]>([]);
  const [fridgeInput, setFridgeInput] = useState('');
  const [spirit, setSpirit] = useState('');
  const [alkoholfrei, setAlkoholfrei] = useState(false);

  // Stream state
  const [phase, setPhase] = useState<Phase>('wizard');
  const [data, setData] = useState<RecipeViewData>(EMPTY_DATA);
  const [recipeId, setRecipeId] = useState<number | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [streamError, setStreamError] = useState<ApiError | null>(null);
  const [cookOpen, setCookOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [adultOpen, setAdultOpen] = useState(false);
  const { show } = useSnackbar();
  const { withUndo } = useShoppingUndo();
  const abortRef = useRef<(() => void) | null>(null);
  const lastParams = useRef<GenerateParams | null>(null);

  useEffect(() => () => abortRef.current?.(), []);

  const buildParams = useCallback(
    (overrides: Partial<GenerateParams> = {}): GenerateParams => ({
      modus: mode,
      kueche,
      kueche_freitext: kuecheFrei,
      geschmack,
      vegetarisch,
      vegan,
      glutenfrei,
      laktosefrei,
      max_zeit_min: maxZeit,
      schwierigkeit,
      personen,
      vorhandene_zutaten: fridge,
      basis_spirituose: spirit,
      alkoholfrei,
      ...overrides,
    }),
    [mode, kueche, kuecheFrei, geschmack, vegetarisch, vegan, glutenfrei, laktosefrei, maxZeit, schwierigkeit, personen, fridge, spirit, alkoholfrei],
  );

  const start = useCallback(
    (params: GenerateParams) => {
      abortRef.current?.();
      lastParams.current = params;
      setData(EMPTY_DATA);
      setRecipeId(null);
      setIsFavorite(false);
      setStreamError(null);
      setPhase('streaming');
      abortRef.current = streamRecipe(params, {
        onMeta: (meta) => setData((d) => ({ ...d, meta })),
        onZutat: (z) => setData((d) => ({ ...d, zutaten: [...d.zutaten, z] })),
        onSchritt: (s) => setData((d) => ({ ...d, schritte: [...d.schritte, s] })),
        onTipp: (tip) => setData((d) => ({ ...d, tipps: [...d.tipps, tip] })),
        onDone: (recipe) =>
          setData({
            meta: recipe,
            zutaten: recipe.zutaten,
            schritte: recipe.schritte,
            tipps: recipe.tipps,
            naehrwerte: recipe.naehrwerte,
            glas: recipe.glas,
            garnitur: recipe.garnitur,
          }),
        onSaved: (info) => {
          setRecipeId(info.recipe_id);
          setRemaining(info.remaining);
          setPhase('done');
          void queryClient.invalidateQueries({ queryKey: ['recipes'] });
        },
        onError: (error) => {
          if (error.code.startsWith('daily_limit')) {
            setStreamError(error);
            setPhase('limit');
          } else {
            setStreamError(error);
            setPhase('done');
          }
        },
      });
    },
    [queryClient],
  );

  const generate = (overrides: Partial<GenerateParams> = {}) => start(buildParams(overrides));

  const handleModeChange = (next: Modus) => {
    if (next === 'cocktail' && me && !me.adult_confirmed) {
      setAdultOpen(true);
      return;
    }
    setMode(next);
  };

  const confirmAdult = async () => {
    await api.confirmAdult();
    refreshMe();
    setAdultOpen(false);
    setMode('cocktail');
  };

  const toggleFavorite = async () => {
    if (recipeId == null) return;
    const next = !isFavorite;
    setIsFavorite(next);
    await api.favorite(recipeId, next);
    void queryClient.invalidateQueries({ queryKey: ['recipes'] });
    if (!next) {
      show(t('recipe.favoriteRemoved'), {
        actionLabel: t('undo'),
        onAction: async () => {
          setIsFavorite(true);
          await api.favorite(recipeId, true);
          void queryClient.invalidateQueries({ queryKey: ['recipes'] });
        },
      });
    }
  };

  const addFridgeItem = () => {
    const item = fridgeInput.trim();
    if (item && !fridge.includes(item) && fridge.length < 30) setFridge([...fridge, item]);
    setFridgeInput('');
  };

  /* ---------- render: streaming / result ---------- */
  if (phase === 'streaming' || phase === 'done') {
    return (
      <div>
        <div className="stream__toolbar">
          <Button variant="text" onClick={() => { abortRef.current?.(); setPhase('wizard'); }}>
            ← {t('wizard.back')}
          </Button>
          {remaining != null && <span className="muted">{strings.stream.remainingToday(remaining)}</span>}
        </div>

        {streamError && phase === 'done' && (
          <div className="card card--outlined" style={{ marginBottom: 'var(--space-4)' }}>
            <p>{t('stream.failed')}</p>
            <div className="actions">
              <Button onClick={() => lastParams.current && start(lastParams.current)}>{t('common.retry')}</Button>
            </div>
          </div>
        )}

        {!data.meta && phase === 'streaming' && (
          <motion.div
            className="limitbox"
            initial={reduced ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="limitbox__emoji"
              animate={reduced ? undefined : { rotate: [0, -8, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              aria-hidden
            >
              🪄
            </motion.div>
            <p className="muted" role="status">{t('stream.conjuring')}</p>
          </motion.div>
        )}

        <RecipeView
          data={data}
          mode={mode}
          streaming={phase === 'streaming'}
          actions={
            phase === 'done' && !streamError ? (
              <>
                <Button variant={isFavorite ? 'tonal' : 'outlined'} onClick={() => void toggleFavorite()}>
                  {isFavorite ? '⭐' : '☆'} {t('recipe.favorite')}
                </Button>
                {recipeId != null && (
                  <Button
                    variant="outlined"
                    onClick={() => void withUndo(t('shopping.recipeAdded'), () => api.shoppingFromRecipe(recipeId))}
                  >
                    🛒 {t('recipe.toShoppingList')}
                  </Button>
                )}
                {recipeId != null && (
                  <Button variant="outlined" onClick={() => setShareOpen(true)}>
                    📤 {t('recipe.share')}
                  </Button>
                )}
                {data.schritte.length > 0 && (
                  <Button onClick={() => setCookOpen(true)}>👨‍🍳 {t('recipe.cookMode')}</Button>
                )}
                <Button variant="text" onClick={() => generate({ regenerate: true })}>
                  🎲 {t('stream.regenerate')}
                </Button>
              </>
            ) : null
          }
        />

        {phase === 'done' && recipeId != null && !streamError && <FeedbackBar recipeId={recipeId} />}

        {recipeId != null && data.meta && (
          <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} recipeId={recipeId} titel={data.meta.titel} />
        )}
        <AnimatePresence>
          {cookOpen && <CookMode schritte={data.schritte} mode={mode} onClose={() => setCookOpen(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  /* ---------- render: daily limit ---------- */
  if (phase === 'limit') {
    return (
      <div className="limitbox">
        <div className="limitbox__emoji" aria-hidden>😴</div>
        <h2>{t('stream.limitReached')}</h2>
        <p className="muted" style={{ marginTop: 'var(--space-3)' }}>{streamError?.message}</p>
        <div style={{ marginTop: 'var(--space-6)' }}>
          <Button variant="tonal" onClick={() => setPhase('wizard')}>← {t('wizard.back')}</Button>
        </div>
      </div>
    );
  }

  /* ---------- render: wizard ---------- */
  const steps = [t('wizard.stepCuisine'), t('wizard.stepTaste'), t('wizard.stepDetails')];

  return (
    <div>
      <div className="wiz__mode">
        <Segmented<Modus>
          options={[
            { value: 'kochen', label: `🍳 ${t('wizard.modeKochen')}` },
            { value: 'cocktail', label: `🍸 ${t('wizard.modeCocktail')}` },
          ]}
          value={mode}
          onChange={handleModeChange}
        />
      </div>

      <div className="wiz__progress" aria-hidden>
        {steps.map((_, i) => (
          <div key={i} className="wiz__bar">
            <motion.div
              className="wiz__bar-fill"
              initial={false}
              animate={{ scaleX: i <= step ? 1 : 0 }}
              style={{ transformOrigin: 'left' }}
              transition={spring}
            />
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={reduced ? undefined : { opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduced ? undefined : { opacity: 0, x: -40 }}
          transition={springSnappy}
        >
          {step === 0 && (
            <section>
              <h2 className="wiz__step-title">{t('wizard.cuisineTitle')}</h2>
              <div className="chips">
                {strings.cuisines.map((c) => (
                  <Chip key={c} selected={kueche === c} onToggle={() => setKueche(kueche === c ? '' : c)}>
                    {c}
                  </Chip>
                ))}
              </div>
              <div className="wiz__free">
                <label htmlFor="kueche-frei">{t('wizard.cuisineFreeLabel')}</label>
                <input
                  id="kueche-frei"
                  className="input"
                  value={kuecheFrei}
                  onChange={(e) => setKuecheFrei(e.target.value)}
                  placeholder={t('wizard.cuisineFreePlaceholder')}
                  maxLength={120}
                />
              </div>
            </section>
          )}

          {step === 1 && (
            <section>
              <h2 className="wiz__step-title">{t('wizard.tasteTitle')}</h2>
              <div className="chips">
                {strings.tastes.map((taste) => (
                  <Chip
                    key={taste}
                    selected={geschmack.includes(taste)}
                    onToggle={() =>
                      setGeschmack((g) => (g.includes(taste) ? g.filter((x) => x !== taste) : [...g, taste]))
                    }
                  >
                    {taste}
                  </Chip>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="stack">
              <h2 className="wiz__step-title">{t('wizard.detailsTitle')}</h2>

              <div className="wiz__row">
                <span className="wiz__row-label">
                  {mode === 'cocktail' ? t('wizard.drinks') : t('wizard.servings')}
                </span>
                <div className="stepper">
                  <button className="stepper__btn" onClick={() => setPersonen(Math.max(1, personen - 1))} aria-label="−">−</button>
                  <span className="stepper__value" style={{ height: 'auto' }}>{personen}</span>
                  <button className="stepper__btn" onClick={() => setPersonen(Math.min(12, personen + 1))} aria-label="+">+</button>
                </div>
              </div>

              {mode === 'cocktail' ? (
                <>
                  <div className="wiz__row">
                    <span className="wiz__row-label">{t('wizard.alcoholFree')}</span>
                    <Switch checked={alkoholfrei} onChange={setAlkoholfrei} label={t('wizard.alcoholFree')} />
                  </div>
                  {!alkoholfrei && (
                    <div>
                      <span className="wiz__row-label">{t('wizard.baseSpirit')}</span>
                      <div className="chips" style={{ marginTop: 'var(--space-2)' }}>
                        {strings.spirits.map((s) => (
                          <Chip key={s} selected={spirit === s} onToggle={() => setSpirit(spirit === s ? '' : s)}>
                            {s}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Button variant="tonal" onClick={() => setConstraintsOpen(true)}>
                    ⚙️ {t('wizard.constraints')}
                  </Button>
                  <div>
                    <span className="wiz__row-label">{t('wizard.fridgeTitle')}</span>
                    <input
                      className="input"
                      style={{ marginTop: 'var(--space-2)' }}
                      value={fridgeInput}
                      onChange={(e) => setFridgeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addFridgeItem()}
                      placeholder={t('wizard.fridgePlaceholder')}
                      maxLength={60}
                    />
                    {fridge.length > 0 && (
                      <div className="wiz__fridge-list">
                        {fridge.map((item) => (
                          <Chip key={item} selected onToggle={() => setFridge(fridge.filter((x) => x !== item))}>
                            {item} ✕
                          </Chip>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="wiz__nav">
        {step > 0 ? (
          <Button variant="text" onClick={() => setStep(step - 1)}>← {t('wizard.back')}</Button>
        ) : (
          <span />
        )}
        {step < 2 ? (
          <Button onClick={() => setStep(step + 1)}>{t('wizard.next')} →</Button>
        ) : (
          <Button big onClick={() => generate()}>🪄 {t('wizard.generate')}</Button>
        )}
      </div>

      <div className="wiz__surprise">
        <Button variant="outlined" onClick={() => generate({ ueberrasch_mich: true, kueche: '', kueche_freitext: '' })}>
          🎁 {t('wizard.surpriseMe')}
        </Button>
      </div>

      {/* Constraints bottom sheet */}
      <Sheet open={constraintsOpen} onClose={() => setConstraintsOpen(false)} label={t('wizard.constraints')}>
        <div className="stack">
          <h3>{t('wizard.constraints')}</h3>
          <div className="wiz__row">
            <span className="wiz__row-label">{t('wizard.vegetarian')}</span>
            <Switch checked={vegetarisch} onChange={setVegetarisch} label={t('wizard.vegetarian')} />
          </div>
          <div className="wiz__row">
            <span className="wiz__row-label">{t('wizard.vegan')}</span>
            <Switch checked={vegan} onChange={(v) => { setVegan(v); if (v) setVegetarisch(true); }} label={t('wizard.vegan')} />
          </div>
          <div className="wiz__row">
            <span className="wiz__row-label">{t('wizard.glutenFree')}</span>
            <Switch checked={glutenfrei} onChange={setGlutenfrei} label={t('wizard.glutenFree')} />
          </div>
          <div className="wiz__row">
            <span className="wiz__row-label">{t('wizard.lactoseFree')}</span>
            <Switch checked={laktosefrei} onChange={setLaktosefrei} label={t('wizard.lactoseFree')} />
          </div>
          <div>
            <span className="wiz__row-label">{t('wizard.maxTime')}</span>
            <div className="chips" style={{ marginTop: 'var(--space-2)' }}>
              {[15, 30, 45, 60, 90].map((min) => (
                <Chip key={min} selected={maxZeit === min} onToggle={() => setMaxZeit(maxZeit === min ? null : min)}>
                  {min} {t('wizard.minutes')}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <span className="wiz__row-label">{t('wizard.difficulty')}</span>
            <div className="chips" style={{ marginTop: 'var(--space-2)' }}>
              {([['einfach', t('wizard.easy')], ['mittel', t('wizard.medium')], ['anspruchsvoll', t('wizard.hard')]] as const).map(
                ([value, label]) => (
                  <Chip
                    key={value}
                    selected={schwierigkeit === value}
                    onToggle={() => setSchwierigkeit(schwierigkeit === value ? null : value)}
                  >
                    {label}
                  </Chip>
                ),
              )}
            </div>
          </div>
          <Button onClick={() => setConstraintsOpen(false)}>{t('common.save')}</Button>
        </div>
      </Sheet>

      {/* 18+ dialog */}
      <Dialog open={adultOpen} onClose={() => setAdultOpen(false)} label={t('adult.title')}>
        <div className="stack">
          <h3>{t('adult.title')}</h3>
          <p className="muted">{t('adult.text')}</p>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="text" onClick={() => setAdultOpen(false)}>{t('adult.cancel')}</Button>
            <Button onClick={() => void confirmAdult()}>{t('adult.confirm')}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
