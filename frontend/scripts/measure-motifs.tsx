/** Measure the tight bounding box of every card motif (viewBox 0..120).
 * Reports, per motif+variant, the subject bbox with and without the ground
 * shadow, so we can spot motifs that under-fill the 120x120 canvas. */

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
const SEEDS = ['', 'a', 'b'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 480 } });

type Row = { name: string; x: number; y: number; w: number; h: number; wNG: number; hNG: number; yNG: number };
const rows: Row[] = [];

for (const motif of MOTIFS) {
  for (let v = 0; v < (MOTIF_VARIANTS[motif] ?? 1); v += 1) {
    const svg = renderToStaticMarkup(<RecipeMotif motif={motif} seed={SEEDS[v]} size={120} />);
    await page.setContent(`<!doctype html><style>*{margin:0}</style>${svg}`);
    const m = await page.evaluate(() => {
      const svgEl = document.querySelector('svg')!;
      const all = svgEl.getBBox();
      // ground shadow = the faint ellipse near cy≈106; drop it for the "no-ground" box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      svgEl.querySelectorAll('*').forEach((el) => {
        const g = el as SVGGraphicsElement;
        if (typeof g.getBBox !== 'function') return;
        if (el.tagName === 'ellipse') {
          const cy = parseFloat((el as SVGEllipseElement).getAttribute('cy') || '0');
          const ry = parseFloat((el as SVGEllipseElement).getAttribute('ry') || '0');
          if (cy > 100 && ry < 6) return; // ground shadow
        }
        if (el.tagName === 'g' || el.tagName === 'defs' || el.tagName === 'svg') return;
        let b;
        try { b = g.getBBox(); } catch { return; }
        if (b.width === 0 && b.height === 0) return;
        minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height);
      });
      return { all: { x: all.x, y: all.y, w: all.width, h: all.height },
               ng: { x: minX, y: minY, w: maxX - minX, h: maxY - minY } };
    });
    rows.push({ name: `${motif}-v${v}`, x: m.all.x, y: m.all.y, w: m.all.w, h: m.all.h,
                wNG: m.ng.w, hNG: m.ng.h, yNG: m.ng.y });
  }
}
await browser.close();

const f = (n: number) => n.toFixed(1).padStart(6);
console.log('motif           |  bbox(all) x/y/w/h            | subject(no ground) x/y/w/h');
for (const r of rows.sort((a, b) => a.hNG - b.hNG)) {
  console.log(
    `${r.name.padEnd(15)} | ${f(r.x)} ${f(r.y)} ${f(r.w)} ${f(r.h)}  | ` +
    `${f(r.x)} ${f(r.yNG)} ${f(r.wNG)} ${f(r.hNG)}`,
  );
}
