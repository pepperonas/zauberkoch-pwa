/** Favorites with cuisine/mode filter chips. */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { RecipeCard } from '../components/recipe/RecipeCard';
import { Chip } from '../components/ui';
import { t } from '../i18n';
import { api } from '../lib/api';

export function FavoritesPage() {
  const [mode, setMode] = useState('');
  const [kueche, setKueche] = useState('');

  const recipes = useQuery({
    queryKey: ['recipes', 'favorites', mode],
    queryFn: () => api.recipes({ mode, favorites_only: true }),
  });

  const items = recipes.data?.items ?? [];
  const kuechen = useMemo(() => [...new Set(items.map((i) => i.kueche).filter(Boolean))], [items]);
  const filtered = kueche ? items.filter((i) => i.kueche === kueche) : items;

  return (
    <div>
      <h1 className="page__title">{t('favorites.title')}</h1>
      <div className="stack">
        <div className="chips">
          <Chip selected={mode === ''} onToggle={() => setMode('')}>{t('favorites.filterAll')}</Chip>
          <Chip selected={mode === 'kochen'} onToggle={() => setMode(mode === 'kochen' ? '' : 'kochen')}>
            🍳 {t('wizard.modeKochen')}
          </Chip>
          <Chip selected={mode === 'cocktail'} onToggle={() => setMode(mode === 'cocktail' ? '' : 'cocktail')}>
            🍸 {t('wizard.modeCocktail')}
          </Chip>
          {kuechen.map((k) => (
            <Chip key={k} selected={kueche === k} onToggle={() => setKueche(kueche === k ? '' : k)}>
              {k}
            </Chip>
          ))}
        </div>
        {recipes.isLoading ? (
          <p className="muted">{t('common.loading')}</p>
        ) : filtered.length === 0 ? (
          <p className="muted">{t('favorites.empty')}</p>
        ) : (
          filtered.map((item, i) => <RecipeCard key={item.id} item={item} index={i} />)
        )}
      </div>
    </div>
  );
}
