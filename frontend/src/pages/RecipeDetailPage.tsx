/** Stored recipe detail: full RecipeView + actions (favorite, shopping, share, copy, cook mode). */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { CookMode } from '../components/recipe/CookMode';
import { RecipeView } from '../components/recipe/RecipeView';
import { Button } from '../components/ui';
import { t } from '../i18n';
import { api } from '../lib/api';
import { recipeToText } from '../lib/units';
import { spring } from '../motion/springs';

export function RecipeDetailPage() {
  const { id } = useParams();
  const recipeId = Number(id);
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const queryClient = useQueryClient();
  const [cookOpen, setCookOpen] = useState(false);
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

  const share = async () => {
    const text = recipeToText(recipe, factor);
    if (navigator.share) {
      try {
        await navigator.share({ title: recipe.titel, text });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      flash(t('recipe.copied'));
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(recipeToText(recipe, factor));
    flash(t('recipe.copied'));
  };

  const toShopping = async () => {
    await api.shoppingFromRecipe(recipeId, portionen ?? undefined);
    void queryClient.invalidateQueries({ queryKey: ['shopping'] });
    flash(t('recipe.addedToList'));
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
            <Button
              variant={isFav ? 'tonal' : 'outlined'}
              onClick={() => favorite.mutate(!isFav)}
              aria-pressed={isFav}
            >
              {isFav ? '⭐' : '☆'} {t('recipe.favorite')}
            </Button>
            <Button variant="outlined" onClick={() => void toShopping()}>🛒 {t('recipe.toShoppingList')}</Button>
            <Button variant="outlined" onClick={() => void share()}>📤 {t('recipe.share')}</Button>
            <Button variant="outlined" onClick={() => void copy()}>📋 {t('recipe.copy')}</Button>
            {recipe.schritte.length > 0 && (
              <Button onClick={() => setCookOpen(true)}>👨‍🍳 {t('recipe.cookMode')}</Button>
            )}
          </>
        }
      />

      <AnimatePresence>
        {cookOpen && <CookMode schritte={recipe.schritte} mode={mode} onClose={() => setCookOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
