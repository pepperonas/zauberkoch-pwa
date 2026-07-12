/** Export all card motifs as transparent PNGs for the backend OG renderer.
 * Run after changing RecipeMotif.tsx:
 *   cd frontend && npm run export:motifs
 * Renders the React SVGs to static markup and screenshots them (480x480,
 * transparent) into backend/app/assets/motifs/.
 */

import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from '@playwright/test';

import { MOTIF_VARIANTS, RecipeMotif, type Motif } from '../src/components/recipe/RecipeMotif';

const MOTIFS: Motif[] = [
  'highball', 'tumbler', 'coupe', 'tiki', 'martini', 'wine', 'flute', 'mule',
  'shot', 'mug', 'beer', 'margarita', 'punch',
  'pasta', 'bowl', 'suppe', 'pfanne', 'pizza', 'salat', 'burger', 'fisch',
  'steak', 'dessert', 'taco', 'auflauf', 'pancakes', 'sandwich',
  'sushi', 'kuchen', 'eis', 'spiess', 'dumpling', 'wrap', 'brot',
];

// cwd-relative (run from frontend/): the script gets bundled before running,
// so import.meta.url would point at the bundle, not this file.
const OUT = path.resolve(process.cwd(), '../backend/app/assets/motifs') + path.sep;
fs.mkdirSync(OUT, { recursive: true });

// Seeds chosen so variantFor(seed, count) hits 0,1,2 in order:
// '' -> 0; 'a' (97) -> 97%3=1, 97%2=1; 'b' (98) -> 98%3=2
const SEEDS = ['', 'a', 'b'];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 480 } });
for (const motif of MOTIFS) {
  for (let v = 0; v < (MOTIF_VARIANTS[motif] ?? 1); v += 1) {
    const seed = SEEDS[v];
    const svg = renderToStaticMarkup(<RecipeMotif motif={motif} seed={seed} size={480} />);
    await page.setContent(`<!doctype html><style>*{margin:0}</style>${svg}`);
    await page.locator('svg').screenshot({ path: `${OUT}${motif}-v${v}.png`, omitBackground: true });
    console.log('exported', `${motif}-v${v}`);
  }
}
await browser.close();
