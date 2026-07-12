/** Home: 3-step wizard (skippable) -> live conjuring stage + streaming recipe.
 * The stream itself lives in the global generation store (state/generation.ts)
 * so it keeps running when the user navigates elsewhere. */

import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { CuisineSheet } from '../components/CuisineSheet';
import { Icon } from '../components/icons';
import { FavoriteButton } from '../components/recipe/FavoriteButton';
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
import { downscaleToJpegBase64 } from '../lib/imageScale';
import { api } from '../lib/api';
import type { GenerateParams, Modus, Schwierigkeit } from '../lib/types';
import { spring, springSnappy } from '../motion/springs';
import { slowSpatial, staggerIn } from '../motion/tokens';
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
  const [gerichtTyp, setGerichtTyp] = useState('');
  const [geschmack, setGeschmack] = useState<string[]>([]);
  const [constraintsOpen, setConstraintsOpen] = useState(false);
  const [vegetarisch, setVegetarisch] = useState(false);
  const [vegan, setVegan] = useState(false);
  const [glutenfrei, setGlutenfrei] = useState(false);
  const [laktosefrei, setLaktosefrei] = useState(false);
  const [proteinreich, setProteinreich] = useState(false);
  const [ketogen, setKetogen] = useState(false);
  const [maxZeit, setMaxZeit] = useState<number | null>(null);
  const [schwierigkeit, setSchwierigkeit] = useState<Schwierigkeit | null>(null);
  const [personen, setPersonen] = useState(me?.preferences?.standard_personen ?? 2);
  const [fridge, setFridge] = useState<string[]>([]);
  const [fridgeInput, setFridgeInput] = useState('');
  // Pantry staples arrive pre-selected; tapping deselects them for this run.
  const [pantryOff, setPantryOff] = useState<Set<string>>(new Set());
  const pantry = me?.preferences?.vorraete ?? [];
  const pantrySelected = pantry.filter((p) => !pantryOff.has(p));
  const [spirit, setSpirit] = useState('');
  const [alkoholfrei, setAlkoholfrei] = useState(false);
  const [drinkTyp, setDrinkTyp] = useState('');
  const [drinkTypFrei, setDrinkTypFrei] = useState('');

  // Stream state lives in the global store — survives navigation.
  const gen = useGeneration();
  const [burst, setBurst] = useState(false);
  const [reveal, setReveal] = useState(false);
  const heroControls = useAnimationControls();
  const [cookOpen, setCookOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [adultOpen, setAdultOpen] = useState(false);
  const [adaptOpen, setAdaptOpen] = useState(false);
  const [adaptTarget, setAdaptTarget] = useState<number | null>(null);
  const [cuisineEditOpen, setCuisineEditOpen] = useState(false);
  const { show } = useSnackbar();
  const { withUndo } = useShoppingUndo();
  const prevPhase = useRef(gen.phase);
  const location = useLocation();
  const navigate = useNavigate();

  // The user is looking at the result -> pill elsewhere can stand down.
  useEffect(() => {
    if (gen.phase === 'done' || gen.phase === 'limit') markGenerationSeen();
  }, [gen.phase]);

  // Hero moment: the emotional peak when a live run lands while we're watching.
  // Spark burst + one-shot card settle-pop + reveal glow sweep + haptics.
  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = gen.phase;
    if (prev === 'streaming' && gen.phase === 'done' && !gen.error) {
      if (reduced) return;
      setBurst(true);
      setReveal(true);
      void heroControls.start({ scale: [1, 1.025, 1] }, slowSpatial);
      // feature-detected haptic tick (mobile) — gated on reduced-motion too
      navigator.vibrate?.([10, 40, 16]);
      const b = window.setTimeout(() => setBurst(false), 1100);
      const r = window.setTimeout(() => setReveal(false), 1300);
      return () => {
        window.clearTimeout(b);
        window.clearTimeout(r);
      };
    }
  }, [gen.phase, gen.error, reduced, heroControls]);

  const buildParams = useCallback(
    (overrides: Partial<GenerateParams> = {}): GenerateParams => ({
      modus: mode,
      kueche: mode === 'cocktail' ? '' : kueche,
      kueche_freitext: mode === 'cocktail' ? '' : kuecheFrei,
      gericht_typ: mode === 'cocktail' ? '' : gerichtTyp,
      drink_typ: mode === 'cocktail' ? (drinkTypFrei.trim() || drinkTyp) : '',
      geschmack,
      vegetarisch,
      vegan,
      glutenfrei,
      laktosefrei,
      proteinreich,
      ketogen,
      max_zeit_min: maxZeit,
      schwierigkeit,
      personen,
      vorhandene_zutaten: [...pantrySelected, ...fridge],
      basis_spirituose: spirit,
      alkoholfrei,
      ...overrides,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, kueche, kuecheFrei, gerichtTyp, drinkTyp, drinkTypFrei, geschmack, vegetarisch, vegan, glutenfrei, laktosefrei, proteinreich, ketogen, maxZeit, schwierigkeit, personen, fridge, spirit, alkoholfrei, pantryOff, me],
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
    if (next !== mode) setGeschmack([]);
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

  const [scanning, setScanning] = useState(false);
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const onScanFile = async (file: File | undefined) => {
    if (!file) return;
    setScanning(true);
    try {
      const image = await downscaleToJpegBase64(file);
      const res = await api.fridgeScan(image);
      const fresh = res.zutaten.filter((z) => !fridge.some((f) => f.toLowerCase() === z.toLowerCase()));
      if (fresh.length > 0) {
        setFridge((prev) => [...prev, ...fresh].slice(0, 30));
        show(strings.wizard.fridgeScanFound(fresh.length));
      } else {
        show(t('wizard.fridgeScanNothing'));
      }
    } catch {
      show(t('wizard.fridgeScanFailed'));
    } finally {
      setScanning(false);
      if (scanInputRef.current) scanInputRef.current.value = '';
    }
  };

  /* ---------- render: streaming / result ---------- */
  if (gen.phase === 'streaming' || gen.phase === 'done') {
    const { data, recipeId, error } = gen;
    return (
      <div>
        <div className="stream__toolbar">
          {gen.phase === 'streaming' ? (
            <Button variant="text" onClick={cancelGeneration}><Icon name="close" size={18} /> {t('common.cancel')}</Button>
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

        <motion.div animate={heroControls} style={{ transformOrigin: 'top center', position: 'relative' }}>
          {reveal && !reduced && (
            <div className="hero-reveal-clip" aria-hidden>
              <motion.div
                className="hero-reveal"
                initial={{ x: '-110%', opacity: 0 }}
                animate={{ x: '120%', opacity: [0, 0.85, 0] }}
                transition={slowSpatial}
              />
            </div>
          )}
          <RecipeView
            data={data}
            mode={gen.mode}
            streaming={gen.phase === 'streaming'}
            actions={
              gen.phase === 'done' && !error
                ? [
                    <FavoriteButton
                      key="fav"
                      active={gen.isFavorite}
                      onToggle={() => void toggleFavorite()}
                      label={t('recipe.favorite')}
                    />,
                    recipeId != null && (
                      <Button
                        key="shop"
                        variant="outlined"
                        onClick={() => void withUndo(t('shopping.recipeAdded'), () => api.shoppingFromRecipe(recipeId))}
                      >
                        <Icon name="cart" size={18} /> {t('recipe.toShoppingList')}
                      </Button>
                    ),
                    recipeId != null && (
                      <Button key="share" variant="outlined" onClick={() => setShareOpen(true)}>
                        <Icon name="share" size={18} /> {t('recipe.share')}
                      </Button>
                    ),
                    data.schritte.length > 0 && (
                      <Button key="cook" onClick={() => setCookOpen(true)}>
                        <Icon name="chefhat" size={18} /> {t('recipe.cookMode')}
                      </Button>
                    ),
                    recipeId != null && (
                      <Button
                        key="adapt"
                        variant="tonal"
                        onClick={() => {
                          setAdaptTarget(recipeId);
                          setAdaptOpen(true);
                        }}
                      >
                        <Icon name="sparkles" size={18} /> {t('adapt.button')}
                      </Button>
                    ),
                    gen.canRegenerate && (
                      <Button key="regen" variant="text" onClick={regenerateGeneration}>
                        <Icon name="dice" size={18} /> {t('stream.regenerate')}
                      </Button>
                    ),
                  ]
                    .filter((el): el is React.ReactElement => Boolean(el))
                    .map((el, i) => (
                      <motion.div
                        key={el.key ?? i}
                        className="actions__item"
                        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={reduced ? { duration: 0.12 } : staggerIn(i, 0.05)}
                      >
                        {el}
                      </motion.div>
                    ))
                : null
            }
          />
        </motion.div>

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
        <div className="limitbox__emoji" aria-hidden><Icon name="snooze" size={52} /></div>
        <h2>{t('stream.limitReached')}</h2>
        <p className="muted" style={{ marginTop: 'var(--space-3)' }}>{gen.error?.message}</p>
        <div style={{ marginTop: 'var(--space-6)' }}>
          <Button variant="tonal" onClick={cancelGeneration}>← {t('wizard.back')}</Button>
        </div>
      </div>
    );
  }

  /* ---------- render: wizard ---------- */
  const steps = [mode === 'cocktail' ? t('wizard.stepDrinkType') : t('wizard.stepCuisine'), t('wizard.stepTaste'), t('wizard.stepDetails')];

  return (
    <div>
      <div className="wiz__mode">
        <Segmented<Modus>
          options={[
            { value: 'kochen', label: <><Icon name="pan" size={17} /> {t('wizard.modeKochen')}</> },
            { value: 'cocktail', label: <><Icon name="cocktail" size={17} /> {t('wizard.modeCocktail')}</> },
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
          {step === 0 && mode === 'cocktail' && (
            <section>
              <h2 className="wiz__step-title">{t('wizard.drinkTypeTitle')}</h2>
              <div className="chips">
                {strings.drinkTypes.map((d) => (
                  <Chip key={d} selected={drinkTyp === d} onToggle={() => setDrinkTyp(drinkTyp === d ? '' : d)}>
                    {d}
                  </Chip>
                ))}
              </div>
              <div className="wiz__free">
                <label htmlFor="drink-frei">{t('wizard.drinkFreeLabel')}</label>
                <input
                  id="drink-frei"
                  className="input"
                  value={drinkTypFrei}
                  onChange={(e) => setDrinkTypFrei(e.target.value)}
                  placeholder={t('wizard.drinkFreePlaceholder')}
                  maxLength={64}
                />
              </div>
            </section>
          )}

          {step === 0 && mode !== 'cocktail' && (
            <section>
              <span className="wiz__row-label">{t('wizard.gerichtTypLabel')}</span>
              <div className="chips" style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
                {strings.gerichtTypen.map((g) => (
                  <Chip key={g} selected={gerichtTyp === g} onToggle={() => setGerichtTyp(gerichtTyp === g ? '' : g)}>
                    {g}
                  </Chip>
                ))}
              </div>
              <h2 className="wiz__step-title">{t('wizard.cuisineTitle')}</h2>
              <div className="chips">
                {(me?.preferences?.kuechen?.length ? me.preferences.kuechen : strings.cuisines).map((c) => (
                  <Chip key={c} selected={kueche === c} onToggle={() => setKueche(kueche === c ? '' : c)}>
                    {c}
                  </Chip>
                ))}
                <Chip selected={false} onToggle={() => setCuisineEditOpen(true)}>
                  <Icon name="edit" size={13} /> {t('wizard.cuisineEdit')}
                </Chip>
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
                {(mode === 'cocktail' ? strings.tastesCocktail : strings.tastes).map((taste) => (
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
                    <Icon name="settings" size={18} /> {t('wizard.constraints')}
                  </Button>
                  <div>
                    <span className="wiz__row-label">{t('wizard.fridgeTitle')}</span>
                    {pantry.length > 0 && (
                      <div className="wiz__fridge-list">
                        {pantry.map((item) => (
                          <Chip
                            key={item}
                            selected={!pantryOff.has(item)}
                            onToggle={() =>
                              setPantryOff((prev) => {
                                const next = new Set(prev);
                                if (next.has(item)) next.delete(item);
                                else next.add(item);
                                return next;
                              })
                            }
                          >
                            {item}
                          </Chip>
                        ))}
                      </div>
                    )}
                    <input
                      className="input"
                      style={{ marginTop: 'var(--space-2)' }}
                      value={fridgeInput}
                      onChange={(e) => setFridgeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addFridgeItem()}
                      placeholder={t('wizard.fridgePlaceholder')}
                      maxLength={60}
                    />
                    <div style={{ marginTop: 'var(--space-3)' }}>
                      <Button variant="outlined" onClick={() => scanInputRef.current?.click()} disabled={scanning}>
                        <Icon name="camera" size={18} /> {scanning ? t('wizard.fridgeScanning') : t('wizard.fridgeScan')}
                      </Button>
                      <input
                        ref={scanInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        hidden
                        onChange={(e) => void onScanFile(e.target.files?.[0])}
                      />
                    </div>
                    {fridge.length > 0 && (
                      <div className="wiz__fridge-list">
                        {fridge.map((item) => (
                          <Chip key={item} selected onToggle={() => setFridge(fridge.filter((x) => x !== item))}>
                            {item} <Icon name="close" size={13} />
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
          <Button big onClick={() => generate()}><Icon name="wand" size={20} /> {t('wizard.generate')}</Button>
        )}
      </div>

      <div className="wiz__surprise">
        <Button variant="outlined" onClick={() => generate({ ueberrasch_mich: true, kueche: '', kueche_freitext: '', gericht_typ: '', drink_typ: '' })}>
          <Icon name="gift" size={18} /> {t('wizard.surpriseMe')}
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
          <div className="wiz__row">
            <span className="wiz__row-label">{t('wizard.highProtein')}</span>
            <Switch checked={proteinreich} onChange={setProteinreich} label={t('wizard.highProtein')} />
          </div>
          <div className="wiz__row">
            <span className="wiz__row-label">{t('wizard.keto')}</span>
            <Switch checked={ketogen} onChange={setKetogen} label={t('wizard.keto')} />
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

      {/* Cuisine chip editor */}
      <CuisineSheet
        open={cuisineEditOpen}
        onClose={() => setCuisineEditOpen(false)}
        onSaved={(list) => {
          if (kueche && !list.some((k) => k.toLowerCase() === kueche.toLowerCase())) setKueche('');
        }}
      />

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
