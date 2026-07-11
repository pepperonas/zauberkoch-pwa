/** Home: 3-step wizard (skippable) -> live conjuring stage + streaming recipe.
 * The stream itself lives in the global generation store (state/generation.ts)
 * so it keeps running when the user navigates elsewhere. */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { AdaptSheet } from '../components/recipe/AdaptSheet';
import { ConjureStage, SparkBurst } from '../components/recipe/ConjureStage';
import { CookMode } from '../components/recipe/CookMode';
import { FeedbackBar } from '../components/recipe/FeedbackBar';
import { RecipeView } from '../components/recipe/RecipeView';
import { ShareDialog } from '../components/recipe/ShareDialog';
import { Button, Chip, Segmented, Switch } from '../components/ui';
import { Dialog } from '../components/ui/Dialog';
import { Sheet } from '../components/ui/Sheet';
import { useSnackbar } from '../components/ui/Snackbar';
import { useShoppingUndo } from '../state/useShoppingUndo';
import { strings, t } from '../i18n';
import { api } from '../lib/api';
import type { GenerateParams, Modus, Schwierigkeit } from '../lib/types';
import { spring, springSnappy } from '../motion/springs';
import { useApp } from '../state/app';
import {
  cancelGeneration,
  markGenerationSeen,
  regenerateGeneration,
  retryGeneration,
  setGenerationFavorite,
  startAdaptGeneration,
  startRecipeGeneration,
  useGeneration,
} from '../state/generation';
import './wizard.css';

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

  // Stream state lives in the global store — survives navigation.
  const gen = useGeneration();
  const [burst, setBurst] = useState(false);
  const [cookOpen, setCookOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [adultOpen, setAdultOpen] = useState(false);
  const [adaptOpen, setAdaptOpen] = useState(false);
  const [adaptTarget, setAdaptTarget] = useState<number | null>(null);
  const { show } = useSnackbar();
  const { withUndo } = useShoppingUndo();
  const prevPhase = useRef(gen.phase);
  const location = useLocation();
  const navigate = useNavigate();

  // The user is looking at the result -> pill elsewhere can stand down.
  useEffect(() => {
    if (gen.phase === 'done' || gen.phase === 'limit') markGenerationSeen();
  }, [gen.phase]);

  // Celebratory spark burst when a live run lands while we're watching.
  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = gen.phase;
    if (prev === 'streaming' && gen.phase === 'done' && !gen.error) {
      setBurst(true);
      const id = window.setTimeout(() => setBurst(false), 1100);
      return () => window.clearTimeout(id);
    }
  }, [gen.phase, gen.error]);

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

  const invalidateRecipes = useCallback(
    () => void queryClient.invalidateQueries({ queryKey: ['recipes'] }),
    [queryClient],
  );

  const generate = (overrides: Partial<GenerateParams> = {}) => {
    startRecipeGeneration(buildParams(overrides), invalidateRecipes);
  };

  const runAdapt = useCallback(
    (id: number, anweisung: string) => startAdaptGeneration(id, anweisung, mode, invalidateRecipes),
    [mode, invalidateRecipes],
  );

  // Adapt requests handed over from the detail page via router state
  useEffect(() => {
    const state = location.state as { adaptId?: number; openAdapt?: boolean } | null;
    if (state?.adaptId && state.openAdapt) {
      navigate('.', { replace: true, state: null });
      setAdaptTarget(state.adaptId);
      setAdaptOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const recipeId = gen.recipeId;
    if (recipeId == null) return;
    const next = !gen.isFavorite;
    setGenerationFavorite(next);
    await api.favorite(recipeId, next);
    invalidateRecipes();
    if (!next) {
      show(t('recipe.favoriteRemoved'), {
        actionLabel: t('undo'),
        onAction: async () => {
          setGenerationFavorite(true);
          await api.favorite(recipeId, true);
          invalidateRecipes();
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
  if (gen.phase === 'streaming' || gen.phase === 'done') {
    const { data, recipeId, error } = gen;
    return (
      <div>
        <div className="stream__toolbar">
          {gen.phase === 'streaming' ? (
            <Button variant="text" onClick={cancelGeneration}>✕ {t('common.cancel')}</Button>
          ) : (
            <Button variant="text" onClick={cancelGeneration}>← {t('stream.newRecipe')}</Button>
          )}
          {gen.remaining != null && <span className="muted">{strings.stream.remainingToday(gen.remaining)}</span>}
        </div>

        {error && gen.phase === 'done' && (
          <div className="card card--outlined" style={{ marginBottom: 'var(--space-4)' }}>
            <p>{t('stream.failed')}</p>
            <div className="actions">
              <Button onClick={retryGeneration}>{t('common.retry')}</Button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {gen.phase === 'streaming' && (
            <ConjureStage mode={gen.mode} data={data} lastEvent={gen.lastEvent} />
          )}
        </AnimatePresence>

        {burst && <SparkBurst />}

        <RecipeView
          data={data}
          mode={gen.mode}
          streaming={gen.phase === 'streaming'}
          actions={
            gen.phase === 'done' && !error ? (
              <>
                <Button variant={gen.isFavorite ? 'tonal' : 'outlined'} onClick={() => void toggleFavorite()}>
                  {gen.isFavorite ? '⭐' : '☆'} {t('recipe.favorite')}
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
                {recipeId != null && (
                  <Button variant="tonal" onClick={() => { setAdaptTarget(recipeId); setAdaptOpen(true); }}>
                    ✨ {t('adapt.button')}
                  </Button>
                )}
                {gen.canRegenerate && (
                  <Button variant="text" onClick={regenerateGeneration}>
                    🎲 {t('stream.regenerate')}
                  </Button>
                )}
              </>
            ) : null
          }
        />

        {gen.phase === 'done' && recipeId != null && !error && <FeedbackBar recipeId={recipeId} />}

        <AdaptSheet
          open={adaptOpen}
          onClose={() => setAdaptOpen(false)}
          onAdapt={(anweisung) => {
            const target = adaptTarget ?? recipeId;
            if (target != null) runAdapt(target, anweisung);
          }}
        />

        {recipeId != null && data.meta && (
          <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} recipeId={recipeId} titel={data.meta.titel} />
        )}
        <AnimatePresence>
          {cookOpen && <CookMode schritte={data.schritte} mode={gen.mode} onClose={() => setCookOpen(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  /* ---------- render: daily limit ---------- */
  if (gen.phase === 'limit') {
    return (
      <div className="limitbox">
        <div className="limitbox__emoji" aria-hidden>😴</div>
        <h2>{t('stream.limitReached')}</h2>
        <p className="muted" style={{ marginTop: 'var(--space-3)' }}>{gen.error?.message}</p>
        <div style={{ marginTop: 'var(--space-6)' }}>
          <Button variant="tonal" onClick={cancelGeneration}>← {t('wizard.back')}</Button>
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

      {/* Adapt handed over from the detail page (wizard phase) */}
      <AdaptSheet
        open={adaptOpen}
        onClose={() => setAdaptOpen(false)}
        onAdapt={(anweisung) => {
          const target = adaptTarget ?? gen.recipeId;
          if (target != null) runAdapt(target, anweisung);
        }}
      />

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
