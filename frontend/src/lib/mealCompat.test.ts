import { describe, expect, it } from 'vitest';

import { cuisineAllowsMeal } from './mealCompat';
import { strings } from '../i18n';

describe('cuisineAllowsMeal', () => {
  const MEALS = strings.gerichtTypen;

  it('never constrains when a side is empty', () => {
    expect(cuisineAllowsMeal('', 'Frühstück')).toBe(true);
    expect(cuisineAllowsMeal('Pizza Napoletana', '')).toBe(true);
  });

  it('country cuisines are compatible with EVERY meal type', () => {
    const countries = ['Italienisch', 'Japanisch', 'Thai', 'Deutsch', 'Levante', 'Mexikanisch', 'Französisch', 'Marokkanisch', 'Koreanisch'];
    for (const c of countries) {
      for (const m of MEALS) expect(cuisineAllowsMeal(c, m), `${c} × ${m}`).toBe(true);
    }
  });

  it('blocks the classic absurd pairs', () => {
    expect(cuisineAllowsMeal('Pizza Napoletana', 'Frühstück')).toBe(false);
    expect(cuisineAllowsMeal('Pizza Napoletana', 'Dessert')).toBe(false);
    expect(cuisineAllowsMeal('Pasta-Klassiker', 'Frühstück')).toBe(false);
    expect(cuisineAllowsMeal('BBQ & Smoker', 'Frühstück')).toBe(false);
    expect(cuisineAllowsMeal('Sushi & Sashimi', 'Dessert')).toBe(false);
    expect(cuisineAllowsMeal('Tapas & Pintxos', 'Frühstück')).toBe(false);
  });

  it('stays conservative: restricted styles keep their sensible meal types', () => {
    expect(cuisineAllowsMeal('Pizza Napoletana', 'Hauptgericht')).toBe(true);
    expect(cuisineAllowsMeal('Pizza Napoletana', 'Snack')).toBe(true);
    expect(cuisineAllowsMeal('Pasta-Klassiker', 'Vorspeise')).toBe(true);
    expect(cuisineAllowsMeal('Pasta-Klassiker', 'Meal-Prep')).toBe(true);
    // breakfast noodle soup is real -> only dessert is blocked for ramen
    expect(cuisineAllowsMeal('Ramen & Nudelsuppen', 'Frühstück')).toBe(true);
    expect(cuisineAllowsMeal('Ramen & Nudelsuppen', 'Dessert')).toBe(false);
    // flexible styles are never restricted
    for (const m of MEALS) {
      expect(cuisineAllowsMeal('Streetfood', m)).toBe(true);
      expect(cuisineAllowsMeal('Bowls', m)).toBe(true);
      expect(cuisineAllowsMeal('Fine Dining', m)).toBe(true);
    }
  });

  it('matches free-text variants by keyword', () => {
    expect(cuisineAllowsMeal('Steinofenpizza', 'Frühstück')).toBe(false);
    expect(cuisineAllowsMeal('Cremige Pasta', 'Dessert')).toBe(false);
  });
});
