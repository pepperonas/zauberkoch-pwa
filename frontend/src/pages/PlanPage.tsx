/** Weekly meal planner: assign recipes to days, push the whole week to the
 * shopping list. Deliberately simple — one week visible, ‹ › to move. */

import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Icon } from '../components/icons';
import { motifForRecipe, RecipeMotif } from '../components/recipe/RecipeMotif';
import '../components/recipe/recipe.css';
import { Button, IconButton } from '../components/ui';
import { Sheet } from '../components/ui/Sheet';
import { useSnackbar } from '../components/ui/Snackbar';
import { useShoppingUndo } from '../state/useShoppingUndo';
import { strings, t } from '../i18n';
import { api } from '../lib/api';
import type { PlanEntry } from '../lib/types';
import { riseIn, spring, stagger } from '../motion/springs';

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDay(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' });
}

export function PlanPage() {
  const reduced = useReducedMotion();
  const queryClient = useQueryClient();
  const { show } = useSnackbar();
  const { withUndo } = useShoppingUndo();
  const [start, setStart] = useState<string | undefined>(undefined);
  const [pickerDay, setPickerDay] = useState<string | null>(null);

  const week = useQuery({ queryKey: ['plan', start ?? 'current'], queryFn: () => api.planWeek(start) });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['plan'] });

  const today = new Date().toISOString().slice(0, 10);
  const monday = week.data?.start;
  const hasEntries = (week.data?.days ?? []).some((d) => d.entries.length > 0);

  const remove = async (entry: PlanEntry) => {
    await api.planRemove(entry.id);
    invalidate();
    show(t('plan.entryRemoved'), {
      actionLabel: t('undo'),
      onAction: async () => {
        const day = week.data?.days.find((d) => d.entries.some((e) => e.id === entry.id));
        if (day) await api.planAdd(day.datum, entry.recipe_id);
        invalidate();
      },
    });
  };

  const weekToShopping = () => {
    if (!monday) return;
    void withUndo(t('plan.weekAdded'), () => api.planToShopping(monday));
  };

  return (
    <div>
      <h1 className="page__title"><Icon name="calendar" size={22} /> {t('plan.title')}</h1>

      <div className="row row--between" style={{ marginBottom: 'var(--space-4)' }}>
        <IconButton label="‹" onClick={() => monday && setStart(addDays(monday, -7))}>‹</IconButton>
        <button className="muted" onClick={() => setStart(undefined)} style={{ font: 'var(--type-title)' }}>
          {monday && start === undefined ? t('plan.thisWeek') : monday ? strings.plan.weekOf(fmtDay(monday)) : '…'}
        </button>
        <IconButton label="›" onClick={() => monday && setStart(addDays(monday, 7))}>›</IconButton>
      </div>

      <div className="stack">
        {(week.data?.days ?? []).map((day, i) => (
          <motion.div
            key={day.datum}
            className={`card card--outlined ${day.datum === today ? 'plan__today' : ''}`}
            {...(reduced ? {} : riseIn)}
            transition={stagger(i, 0.04)}
          >
            <div className="row row--between">
              <span style={{ font: 'var(--type-title)' }}>
                {strings.plan.dayNames[i]}{' '}
                <span className="muted" style={{ font: 'var(--type-label-sm)' }}>{fmtDay(day.datum)}</span>
              </span>
              <IconButton label={t('plan.addRecipe')} onClick={() => setPickerDay(day.datum)}>＋</IconButton>
            </div>
            {day.entries.map((entry) => (
              <div key={entry.id} className="row row--between" style={{ minHeight: 56 }}>
                <span className="row" style={{ minWidth: 0 }}>
                  <span className="motif-tile">
                    <RecipeMotif motif={motifForRecipe(entry)} seed={entry.titel} size={48} fit />
                  </span>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.titel}
                  </span>
                </span>
                <IconButton label={t('common.delete')} onClick={() => void remove(entry)}><Icon name="close" size={18} /></IconButton>
              </div>
            ))}
          </motion.div>
        ))}
      </div>

      {hasEntries && (
        <div className="actions" style={{ marginTop: 'var(--space-5)' }}>
          <Button big onClick={weekToShopping}>
            <Icon name="cart" size={20} /> {t('plan.toShopping')}
          </Button>
        </div>
      )}

      <RecipePicker
        day={pickerDay}
        onClose={() => setPickerDay(null)}
        onPicked={() => {
          setPickerDay(null);
          invalidate();
          show(t('plan.entryAdded'));
        }}
      />
    </div>
  );
}

function RecipePicker({ day, onClose, onPicked }: { day: string | null; onClose: () => void; onPicked: () => void }) {
  const [q, setQ] = useState('');
  const recipes = useQuery({ queryKey: ['recipes', 'plan-picker'], queryFn: () => api.recipes(), enabled: day != null });
  const query = q.trim().toLowerCase();
  const items = (recipes.data?.items ?? []).filter(
    (r) => !query || r.titel.toLowerCase().includes(query) || r.kueche.toLowerCase().includes(query),
  );

  return (
    <Sheet open={day != null} onClose={onClose} label={t('plan.pickerTitle')}>
      <div className="stack">
        <h3>{t('plan.pickerTitle')}</h3>
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('plan.pickerSearch')}
          aria-label={t('plan.pickerSearch')}
        />
        {items.length === 0 && <p className="muted">{t('shopping.noRecipes')}</p>}
        {items.map((item) => (
          <motion.button
            key={item.id}
            className="picker-row"
            whileTap={{ scale: 0.98 }}
            transition={spring}
            onClick={() => {
              if (day) void api.planAdd(day, item.id).then(onPicked);
            }}
          >
            <span className="motif-tile">
              <RecipeMotif motif={motifForRecipe(item)} seed={item.titel} size={48} fit />
            </span>
            <span className="picker-row__text">
              <span className="picker-row__title">{item.titel}</span>
              <span className="picker-row__sub">
                {item.mode === 'cocktail' ? <Icon name="cocktail" size={13} /> : null}
                {item.kueche}
              </span>
            </span>
          </motion.button>
        ))}
      </div>
    </Sheet>
  );
}
