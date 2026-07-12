/** Dev QA harness: render every icon glyph into a static HTML gallery
 * (light + dark, both mode palettes) for visual review via screenshot.
 *   npx esbuild scripts/icon-gallery.tsx --bundle --platform=node --format=esm \
 *     --jsx=automatic --packages=external --outfile=.icon-gallery.mjs \
 *     && node .icon-gallery.mjs && rm -f .icon-gallery.mjs
 * Writes /tmp/zk-icon-gallery.html — NOT part of the build or deploy.
 */

import fs from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';

import { GLYPHS, type IconName } from '../src/components/icons/glyphs';

function cell(name: IconName, size: number): string {
  const Glyph = GLYPHS[name];
  const svg = renderToStaticMarkup(
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <Glyph />
    </svg>,
  );
  return `<div class="cell">${svg}<span>${name}</span></div>`;
}

const names = Object.keys(GLYPHS) as IconName[];
const panel = (cls: string, title: string, vars: string) =>
  `<section class="panel ${cls}" style="${vars}"><h2>${title}</h2><div class="grid">${names
    .map((n) => cell(n, 28))
    .join('')}</div></section>`;

const html = `<!doctype html><meta charset="utf-8"><style>
  body { margin: 0; font: 12px system-ui; display: grid; grid-template-columns: 1fr 1fr; }
  .panel { padding: 20px; }
  .panel h2 { font-size: 13px; margin: 0 0 12px; opacity: .6; }
  .grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px 8px; }
  .cell { display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; }
  .cell span { font-size: 9px; opacity: .55; }
</style>
${panel('light-kochen', 'Kochen · Light', 'background:#f7fbf1;color:#1a1c18;--c-primary:#2e6c34;--c-tertiary:#39656d;')}
${panel('dark-kochen', 'Kochen · Dark', 'background:#11150f;color:#e2e3da;--c-primary:#96d98d;--c-tertiary:#a1ced8;')}
${panel('light-drinks', 'Drinks · Light', 'background:#fffbff;color:#1d1a20;--c-primary:#6a4fa3;--c-tertiary:#815250;')}
${panel('dark-drinks', 'Drinks · Dark', 'background:#151218;color:#e7e0e8;--c-primary:#d0bcff;--c-tertiary:#f5b7b3;')}
`;

fs.writeFileSync('/tmp/zk-icon-gallery.html', html);
console.log('wrote /tmp/zk-icon-gallery.html');
