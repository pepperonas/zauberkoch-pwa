import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  motifForRecipe,
  MOTIF_FIT,
  MOTIF_VARIANTS,
  RecipeMotif,
  variantFor,
  variantForMotif,
  type Motif,
} from './RecipeMotif';

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

  it('covers the new drink motifs', () => {
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Frozen Margarita', glas: null })).toBe('margarita');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Feuerzangenbowle', glas: null })).toBe('punch');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Tequila Shooter', glas: null })).toBe('shot');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Irish Coffee', glas: null })).toBe('mug');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Hot Toddy', glas: null })).toBe('mug');
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Weizenbier', glas: null })).toBe('beer');
    // glühwein still reads as a wine glass (not stolen by mug)
    expect(motifForRecipe({ mode: 'cocktail', titel: 'Glühwein', glas: null })).toBe('wine');
  });

  it('covers the new dish motifs (specific beats generic)', () => {
    expect(motifForRecipe({ mode: 'kochen', titel: 'Lachs Nigiri' })).toBe('sushi'); // sushi beats fisch
    expect(motifForRecipe({ mode: 'kochen', titel: 'Chicken Burrito' })).toBe('wrap'); // wrap, not taco
    expect(motifForRecipe({ mode: 'kochen', titel: 'Quesadilla mit Käse' })).toBe('taco');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Gyoza mit Ponzu' })).toBe('dumpling');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Käsekuchen' })).toBe('kuchen'); // not dessert
    expect(motifForRecipe({ mode: 'kochen', titel: 'Eisbecher mit Früchten' })).toBe('eis');
    expect(motifForRecipe({ mode: 'kochen', titel: 'Hähnchenspieß' })).toBe('spiess'); // spiess beats steak
    expect(motifForRecipe({ mode: 'kochen', titel: 'Rustikales Sauerteigbrot' })).toBe('brot');
    // "…mit knusprigem Brot" must still resolve to the main component (fisch)
    expect(motifForRecipe({ mode: 'kochen', titel: 'Gambas al Ajillo mit knusprigem Brot' })).toBe('fisch');
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
    expect(variantForMotif('sushi', 'California Maki')).toBe(1);
    expect(variantForMotif('sushi', 'Lachs Nigiri')).toBe(0);
    expect(variantForMotif('spiess', 'Garnelenspieß')).toBe(1);
    expect(variantForMotif('mug', 'Irish Coffee')).toBe(1);
    expect(variantForMotif('shot', 'B-52 Shot')).toBe(1);
    expect(variantForMotif('kuchen', 'Schwarzwälder Torte')).toBe(1);
  });

  it('declares at least 55 distinct visuals', () => {
    const total = Object.values(MOTIF_VARIANTS).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(55);
  });
});

/* -------------------------------------------------------------------------- */
/* MOTIF_FIT: per-motif fill normalization for compact leading tiles.         */
/* The map + the `fit` prop are the 2026-07-15 addition; the suites above      */
/* predate them. Pure logic + SSR string render (no DOM — see testing.md).     */
/* -------------------------------------------------------------------------- */

/** Reference largest subject dimension per motif (subject bbox, ground shadow
 * excluded), from `npm run measure:motifs`. MOTIF_FIT was derived as
 * clamp(96 / max(w,h), 0.8, 1.38) against these — so this is the design target
 * the map is validated against, not a live measurement. */
const REF_MAXDIM: Record<Motif, number> = {
  highball: 108, tumbler: 100, coupe: 95, tiki: 115, martini: 87, wine: 95,
  flute: 87, mule: 111, shot: 100, mug: 100, beer: 77, margarita: 112, punch: 73,
  pasta: 90, bowl: 90, suppe: 86, pfanne: 98, pizza: 82, salat: 100, burger: 71,
  fisch: 114, steak: 114, dessert: 90, taco: 56, auflauf: 93, pancakes: 80,
  sandwich: 62, sushi: 110, kuchen: 68, eis: 82, spiess: 86, dumpling: 113,
  wrap: 110, brot: 80,
};

const svgStyle = (markup: string): string =>
  markup.match(/<svg[^>]*\sstyle="([^"]*)"/)?.[1] ?? '';

describe('MOTIF_FIT map', () => {
  it('has exactly one entry per motif (stays in sync with the registry)', () => {
    // A missing entry silently defaults to scale 1 (safe) but under-normalizes —
    // this is the guard that a newly added motif also gets a fit factor.
    expect(Object.keys(MOTIF_FIT).sort()).toEqual(Object.keys(MOTIF_VARIANTS).sort());
  });

  it('keeps every factor inside the documented clamp [0.8, 1.38]', () => {
    for (const [motif, f] of Object.entries(MOTIF_FIT)) {
      expect(f, motif).toBeGreaterThanOrEqual(0.8);
      expect(f, motif).toBeLessThanOrEqual(1.38);
    }
  });

  it('upscales tiny/flat motifs and downscales overflowing ones', () => {
    expect(MOTIF_FIT.spiess).toBeGreaterThan(1); // flat skewer (~21u tall) → grow
    expect(MOTIF_FIT.taco).toBeGreaterThan(1); // small
    expect(MOTIF_FIT.tiki).toBeLessThan(1); // overflows the viewBox → shrink
    expect(MOTIF_FIT.fisch).toBeLessThan(1);
    expect(MOTIF_FIT.tumbler).toBeCloseTo(1, 1); // already ~fills → near identity
  });

  it('collapses the raw size spread into a tight normalized band', () => {
    const fitted = (Object.keys(REF_MAXDIM) as Motif[]).map((m) => REF_MAXDIM[m] * MOTIF_FIT[m]);
    const raws = Object.values(REF_MAXDIM);
    const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs);

    for (const f of fitted) {
      expect(f).toBeGreaterThanOrEqual(75); // clamped small motifs (taco) sit here
      expect(f).toBeLessThanOrEqual(98);
    }
    expect(spread(raws)).toBeGreaterThan(55); // raw: 56 → 115
    expect(spread(fitted)).toBeLessThan(25); // normalized: ~19
    expect(spread(fitted)).toBeLessThan(spread(raws) / 2);
  });
});

describe('RecipeMotif `fit` prop (SSR markup)', () => {
  it('emits a scale() transform matching the motif factor when fit is on', () => {
    const html = renderToStaticMarkup(createElement(RecipeMotif, { motif: 'pasta', fit: true }));
    expect(svgStyle(html)).toContain(`transform:scale(${MOTIF_FIT.pasta})`);
  });

  it('emits no transform by default (large card/hero motifs stay unscaled)', () => {
    const html = renderToStaticMarkup(createElement(RecipeMotif, { motif: 'pasta' }));
    expect(html).not.toContain('scale(');
    expect(svgStyle(html)).not.toContain('transform');
  });

  it('appends the scale to an incoming transform instead of clobbering it', () => {
    const html = renderToStaticMarkup(
      createElement(RecipeMotif, { motif: 'pasta', fit: true, style: { transform: 'rotate(3deg)' } }),
    );
    expect(svgStyle(html)).toContain(`rotate(3deg) scale(${MOTIF_FIT.pasta})`);
  });

  it('preserves other passthrough style (e.g. viewTransitionName) alongside the scale', () => {
    const html = renderToStaticMarkup(
      createElement(RecipeMotif, { motif: 'pasta', fit: true, style: { viewTransitionName: 'zk-shared-motif' } }),
    );
    const style = svgStyle(html);
    expect(style).toContain('view-transition-name:zk-shared-motif');
    expect(style).toContain('scale(');
  });

  it('falls back to no transform for an unknown motif (?? 1 guard, no throw)', () => {
    const html = renderToStaticMarkup(createElement(RecipeMotif, { motif: 'nope' as Motif, fit: true }));
    expect(html).toContain('<svg'); // renders the Tumbler fallback rather than crashing
    expect(html).not.toContain('scale(');
  });
});
