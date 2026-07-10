/** Recipe list card — shared element (layoutId) expands into the detail page. */

import { motion, useReducedMotion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

import type { RecipeListItem } from '../../lib/types';
import { riseIn, spring, stagger } from '../../motion/springs';
import { fmtMin } from './RecipeView';
import './recipe.css';

export function RecipeCard({ item, index = 0 }: { item: RecipeListItem; index?: number }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  return (
    <motion.button
      className="card card--outlined"
      style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
      layoutId={reduced ? undefined : `recipe-card-${item.id}`}
      onClick={() => navigate(`/rezept/${item.id}`)}
      {...(reduced ? {} : riseIn)}
      transition={stagger(Math.min(index, 8))}
      whileTap={reduced ? undefined : { scale: 0.98 }}
    >
      <div className="row row--between">
        <span className="hero__kueche">
          {item.mode === 'cocktail' ? '🍸 ' : ''}
          {item.kueche}
        </span>
        {item.is_favorite && <span aria-label="Favorit">⭐</span>}
      </div>
      <h3 style={{ margin: 'var(--space-2) 0' }}>{item.titel}</h3>
      <p className="muted" style={{ font: 'var(--type-body)' }}>{item.teaser}</p>
      <div className="hero__stats">
        {item.zeit_gesamt != null && <span className="stat">🕐 {fmtMin(item.zeit_gesamt)}</span>}
        {item.schwierigkeit && <span className="stat">📶 {item.schwierigkeit}</span>}
      </div>
    </motion.button>
  );
}

export { spring };
