/** Stored recipe detail: full RecipeView + actions (favorite, shopping, share, copy, cook mode). */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { CookMode } from '../components/recipe/CookMode';
import { FeedbackBar } from '../components/recipe/FeedbackBar';
import { RecipeView } from '../components/recipe/RecipeView';
import { ShareDialog } from '../components/recipe/ShareDialog';
import { Button } from '../components/ui';
import { useSnackbar } from '../components/ui/Snackbar';
import { strings, t } from '../i18n';
import { api } from '../lib/api';
import { recipeToText } from '../lib/units';
import { spring } from '../motion/springs';
import { useShoppingUndo } from '../state/useShoppingUndo';

export function RecipeDetailPage() {
  const { id } = useParams();
  const recipeId = Number(id);
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const queryClient = useQueryClient();
  const { show } = useSnackbar();
  const { withUndo } = useShoppingUndo();
  const [cookOpen, setCookOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [notiz, setNotiz] = useState<string | null>(null);
  const [gekocht, setGekocht] = useState<number | null>(null);
  const [portionen, setPortionen] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');

  const detail = useQuery({
    queryKey: ['recipes', recipeId],
    queryFn: () => api.recipe(recipeId),
    enabled: Number.isFinite(recipeId),
  });

  const favorite = useMutation({
    mutationFn: (on: boolean) => api.favorite(recipeId, on),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });

  if (detail.isLoading) return <p className="muted page__title">{t('common.loading')}</p>;
  if (!detail.data) return <p className="muted page__title">{t('stream.failed')}</p>;

  const { recipe, mode, is_favorite } = detail.data;
  const isFav = favorite.data?.is_favorite ?? is_favorite;
  const factor = portionen != null && recipe.portionen > 0 ? portionen / recipe.portionen : 1;

  const flash = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(''), 2200);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(recipeToText(recipe, factor));
    flash(t('recipe.copied'));
  };

  const toShopping = () =>
    withUndo(t('shopping.recipeAdded'), () => api.shoppingFromRecipe(recipeId, portionen ?? undefined));

  const toggleFavorite = () => {
    const next = !isFav;
    favorite.mutate(next);
    if (!next) {
      show(t('recipe.favoriteRemoved'), {
        actionLabel: t('undo'),
        onAction: async () => {
          favorite.mutate(true);
        },
      });
    }
  };

  return (
    <motion.div layoutId={reduced ? undefined : `recipe-card-${recipeId}`} transition={spring}>
      <div className="stream__toolbar">
        <Button variant="text" onClick={() => navigate(-1)}>← {t('wizard.back')}</Button>
        <AnimatePresence>
          {feedback && (
            <motion.span
              className="muted"
              role="status"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              ✓ {feedback}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <RecipeView
        data={{
          meta: recipe,
          zutaten: recipe.zutaten,
          schritte: recipe.schritte,
          tipps: recipe.tipps,
          naehrwerte: recipe.naehrwerte,
          glas: recipe.glas,
          garnitur: recipe.garnitur,
        }}
        mode={mode}
        onPortionenChange={setPortionen}
        actions={
          <>
            <Button variant={isFav ? 'tonal' : 'outlined'} onClick={toggleFavorite} aria-pressed={isFav}>
              {isFav ? '⭐' : '☆'} {t('recipe.favorite')}
            </Button>
            <Button variant="outlined" onClick={() => void toShopping()}>🛒 {t('recipe.toShoppingList')}</Button>
            <Button variant="outlined" onClick={() => setShareOpen(true)}>📤 {t('recipe.share')}</Button>
            <Button variant="outlined" onClick={() => void copy()}>📋 {t('recipe.copy')}</Button>
            {recipe.schritte.length > 0 && (
              <Button onClick={() => setCookOpen(true)}>👨‍🍳 {t('recipe.cookMode')}</Button>
            )}
            <Button
              variant="tonal"
              onClick={() => navigate('/', { state: { adaptId: recipeId, openAdapt: true } })}
            >
              ✨ {t('adapt.button')}
            </Button>
            <Button
              variant="outlined"
              onClick={() => void api.markCooked(recipeId).then((r) => { setGekocht(r.gekocht_count); show(t('notes.cooked')); })}
            >
              ✅ {(gekocht ?? detail.data.gekocht_count) > 0
                ? strings.notes.cookedCount(gekocht ?? detail.data.gekocht_count)
                : t('notes.cooked')}
            </Button>
          </>
        }
      />

      <section className="section">
        <label className="muted" htmlFor="notiz" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
          📝 {t('notes.label')}
        </label>
        <textarea
          id="notiz"
          className="input"
          style={{ minHeight: 88, padding: 'var(--space-3) var(--space-4)', resize: 'vertical' }}
          defaultValue={detail.data.notiz}
          placeholder={t('notes.placeholder')}
          maxLength={2000}
          onBlur={(e) => {
            const value = e.target.value.trim();
            if (value !== (notiz ?? detail.data.notiz)) {
              setNotiz(value);
              void api.setNotiz(recipeId, value).then(() => show(t('notes.saved')));
            }
          }}
        />
      </section>

      <FeedbackBar recipeId={recipeId} initial={detail.data.feedback ?? null} />


      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} recipeId={recipeId} titel={recipe.titel} />
      <AnimatePresence>
        {cookOpen && <CookMode schritte={recipe.schritte} mode={mode} onClose={() => setCookOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
