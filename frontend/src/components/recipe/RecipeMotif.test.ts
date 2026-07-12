import { describe, expect, it } from 'vitest';

import { motifForRecipe } from './RecipeMotif';

describe('motifForRecipe', () => {
  it('picks cocktail motifs by glass type first', () => {
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Jungle Bird', glas: 'Tiki-Becher' })).toBe('highball');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Gin Basil Smash', glas: 'Tumbler' })).toBe('tumbler');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Daiquiri', glas: 'Coupe' })).toBe('coupe');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Espresso Martini', glas: 'Cocktailschale' })).toBe('coupe');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Tom Collins', glas: 'Longdrinkglas' })).toBe('highball');
  });

  it('falls back to title keywords and tumbler for drinks', () => {
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Moscow Mule', glas: null })).toBe('highball');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Old Fashioned', glas: null })).toBe('tumbler');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Irgendwas Neues', glas: null })).toBe('tumbler');
  });

  it('picks dish motifs by keywords with bowl fallback', () => {
    expect(motifForRecipe({ mode: 'kochen', titel: 'Spaghetti alle Vongole' })).toBe('pasta');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Tagliatelle al Ragù', tags: ['pasta'] })).toBe('pasta');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Ramen mit Ei' })).toBe('bowl'); // soup beats noodle
    expect(motifForRecipe({ mode: 'kochen', titel: 'Grüne Currybowl' })).toBe('bowl');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Rheinischer Sauerbraten' })).toBe('bowl');
  });
});
