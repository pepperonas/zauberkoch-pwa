/** Recipe list card — shared element (layoutId) expands into the detail page.
 * Root is a div (not button): the favorite star is its own nested button. */

import { motion, useReducedMotion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { t } from '../../i18n';
import { api } from '../../lib/api';
import type { RecipeListItem } from '../../lib/types';
import { riseIn, spring, stagger } from '../../motion/springs';
import { Icon } from '../icons';
import { useSnackbar } from '../ui/Snackbar';
import { motifForRecipe, RecipeMotif } from './RecipeMotif';
import { fmtMin } from './RecipeView';
import './recipe.css';

export function RecipeCard({ item, index = 0 }: { item: RecipeListItem; index?: number }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const queryClient = useQueryClient();
  const { show } = useSnackbar();

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['recipes'] });

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !item.is_favorite;
    await api.favorite(item.id, next);
    invalidate();
    if (!next) {
      show(t('recipe.favoriteRemoved'), {
        actionLabel: t('undo'),
        onAction: async () => {
          await api.favorite(item.id, true);
          invalidate();
        },
      });
    }
  };

  return (
    <motion.div
      className="card card--outlined recipecard"
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/rezept/${item.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/rezept/${item.id}`);
        }
      }}
      {...(reduced ? {} : riseIn)}
      transition={stagger(Math.min(index, 8))}
      whileTap={reduced ? undefined : { scale: 0.98 }}
    >
      <div className="row row--between">
        <span className="hero__kueche">
          {item.mode === 'cocktail' ? <><Icon name="cocktail" size={14} />{' '}</> : null}
          {item.kueche}
        </span>
        <motion.button
          className="recipecard__star"
          aria-label={item.is_favorite ? t('recipe.unfavorite') : t('recipe.favorite')}
          aria-pressed={item.is_favorite}
          onClick={(e) => void toggleFavorite(e)}
          whileTap={reduced ? undefined : { scale: 1.25, rotate: 12 }}
          transition={spring}
        >
          <Icon name={item.is_favorite ? 'star' : 'starOff'} size={22} />
        </motion.button>
      </div>
      <div className="recipecard__body">
        <div className="recipecard__text">
          <h3 style={{ margin: 'var(--space-2) 0' }}>{item.titel}</h3>
          <p className="muted" style={{ font: 'var(--type-body)' }}>{item.teaser}</p>
          <div className="hero__stats">
            {item.zeit_gesamt != null && <span className="stat"><Icon name="clock" size={15} /> {fmtMin(item.zeit_gesamt)}</span>}
            {item.schwierigkeit && <span className="stat"><Icon name="gauge" size={15} /> {item.schwierigkeit}</span>}
          </div>
        </div>
        <RecipeMotif motif={motifForRecipe(item)} seed={item.titel} className="recipecard__motif" />
      </div>
    </motion.div>
  );
}

export { spring };
