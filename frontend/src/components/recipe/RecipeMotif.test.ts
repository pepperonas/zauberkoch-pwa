import { describe, expect, it } from 'vitest';

import { motifForRecipe, MOTIF_VARIANTS, variantFor, variantForMotif } from './RecipeMotif';

describe('motifForRecipe', () => {
  it('picks cocktail motifs by glass type first', () => {
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Jungle Bird', glas: 'Tiki-Becher' })).toBe('tiki');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Gin Basil Smash', glas: 'Tumbler' })).toBe('tumbler');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Daiquiri', glas: 'Coupe' })).toBe('coupe');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Espresso Martini', glas: 'Cocktailschale' })).toBe('coupe');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Tom Collins', glas: 'Longdrinkglas' })).toBe('highball');
  });

  it('falls back to title keywords and tumbler for drinks', () => {
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Moscow Mule', glas: null })).toBe('mule');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Old Fashioned', glas: null })).toBe('tumbler');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Irgendwas Neues', glas: null })).toBe('tumbler');
  });

  it('picks dish motifs by keywords with bowl fallback', () => {
    expect(motifForRecipe({ mode: 'kochen', titel: 'Spaghetti alle Vongole' })).toBe('pasta');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Tagliatelle al Ragù', tags: ['pasta'] })).toBe('pasta');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Ramen mit Ei' })).toBe('suppe'); // soup beats noodle
    expect(motifForRecipe({ mode: 'kochen', titel: 'Grüne Currybowl' })).toBe('bowl');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Poke Bowl mit Lachs' })).toBe('bowl'); // bowl beats fish
  });

  it('covers the extended glass set', () => {
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Mai Tai', glas: 'Tiki-Becher' })).toBe('tiki');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Moscow Mule', glas: 'Kupferbecher' })).toBe('mule');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Dry Martini', glas: 'Martiniglas' })).toBe('martini');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Aperol Spritz', glas: 'Weinglas' })).toBe('wine');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'French 75', glas: 'Sektflöte' })).toBe('flute');
  });

  it('covers the extended dish set (specific beats generic)', () => {
    expect(motifForRecipe({ mode: 'kochen', titel: 'Pizza Napoletana' })).toBe('pizza');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Lasagne al Forno' })).toBe('auflauf'); // not pasta
    expect(motifForRecipe({ mode: 'kochen', titel: 'Smash Burger' })).toBe('burger');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Minestrone' })).toBe('suppe');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Caesar Salat' })).toBe('salat');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Lachsfilet mit Dill' })).toBe('fisch');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Rheinischer Sauerbraten' })).toBe('steak');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Tiramisu' })).toBe('dessert');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Tacos al Pastor' })).toBe('taco');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Pancakes mit Ahornsirup' })).toBe('pancakes');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Club Sandwich' })).toBe('sandwich');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Gemüse-Wok' })).toBe('pfanne');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Kartoffelgratin' })).toBe('auflauf');
    // "Fleisch"/"Eis" substrings must not trigger dessert
    expect(motifForRecipe({ mode: 'kochen', titel: 'Fleischbällchen in Tomatensauce' })).toBe('steak');
  });
});

describe('variantFor (must match backend variant_for)', () => {
  it('is deterministic and language-portable', () => {
    // constants mirrored in backend/tests/test_share.py — keep in sync
    expect(variantFor('Spaghetti alle Vongole', 3)).toBe(0);
    expect(variantFor('Jungle Bird', 3)).toBe(1);
    expect(variantFor('Tequila Sunrise', 3)).toBe(2);
    expect(variantFor('Spaghetti alle Vongole', 2)).toBe(1);
    expect(variantFor('', 3)).toBe(0);
    expect(variantFor('anything', 1)).toBe(0);
  });

  it('semantic hints beat the hash (mirrored in backend test_share.py)', () => {
    expect(variantForMotif('bowl', 'Thailändisches Massaman-Curry mit Rindfleisch')).toBe(1);
    expect(variantForMotif('pasta', 'Spaghetti Carbonara')).toBe(2);
    expect(variantForMotif('pasta', 'Pasta al Pesto Genovese')).toBe(1);
    expect(variantForMotif('steak', 'Wiener Schnitzel')).toBe(1);
    expect(variantForMotif('highball', 'Mojito Royal')).toBe(2);
    expect(variantForMotif('pasta', 'Spaghetti alle Vongole')).toBe(2);
    expect(variantForMotif('coupe', 'Gin Sour Royal')).toBe(2);
  });

  it('declares at least 40 distinct visuals', () => {
    const total = Object.values(MOTIF_VARIANTS).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(40);
  });
});
