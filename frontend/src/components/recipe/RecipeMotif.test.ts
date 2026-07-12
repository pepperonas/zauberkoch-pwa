import { describe, expect, it } from 'vitest';

import { motifForRecipe } from './RecipeMotif';

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
