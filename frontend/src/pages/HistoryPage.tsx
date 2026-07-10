/** History: everything the user ever generated, with search + mode filter. */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { RecipeCard } from '../components/recipe/RecipeCard';
import { Chip } from '../components/ui';
import { t } from '../i18n';
import { api } from '../lib/api';

export function HistoryPage() {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState('');

  const recipes = useQuery({
    queryKey: ['recipes', 'history', q, mode],
    queryFn: () => api.recipes({ q, mode }),
  });

  const items = recipes.data?.items ?? [];

  return (
    <div>
      <h1 className="page__title">{t('history.title')}</h1>
      <div className="stack">
        <input
          className="input"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('history.searchPlaceholder')}
          aria-label={t('history.searchPlaceholder')}
        />
        <div className="chips">
          <Chip selected={mode === ''} onToggle={() => setMode('')}>{t('favorites.filterAll')}</Chip>
          <Chip selected={mode === 'kochen'} onToggle={() => setMode(mode === 'kochen' ? '' : 'kochen')}>
            🍳 {t('wizard.modeKochen')}
          </Chip>
          <Chip selected={mode === 'cocktail'} onToggle={() => setMode(mode === 'cocktail' ? '' : 'cocktail')}>
            🍸 {t('wizard.modeCocktail')}
          </Chip>
        </div>
        {recipes.isLoading ? (
          <p className="muted">{t('common.loading')}</p>
        ) : items.length === 0 ? (
          <p className="muted">{t('history.empty')}</p>
        ) : (
          items.map((item, i) => <RecipeCard key={item.id} item={item} index={i} />)
        )}
      </div>
    </div>
  );
}
