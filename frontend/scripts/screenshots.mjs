/** Generate README screenshots against the preview build (API fully mocked).
 * Usage: npm run build && npm run preview -- --port 4173 &  then:
 *        node scripts/screenshots.mjs
 * Output: ../docs/screenshots/*.png
 */

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = new URL('../../docs/screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const ME = { authenticated: true, id: 1, email: 'demo@zauberkoch.de', name: 'Demo', picture_url: '', adult_confirmed: true, csrf_token: 'x', preferences: { vegetarisch: false, vegan: false, glutenfrei: false, laktosefrei: false, vermeiden: [], standard_personen: 2 } };

const RECIPE = {
  titel: 'Tom Kha Gai',
  teaser: 'Die thailändische Kokos-Hühnersuppe: cremig, zitronig, mit Galgant und Kaffirlimette — Streetfood-Klassiker in 35 Minuten.',
  kueche: 'Thai',
  tags: ['suppe', 'kokos', 'klassiker'],
  portionen: 2,
  zeit_aktiv: 25,
  zeit_gesamt: 35,
  schwierigkeit: 'mittel',
  zutaten: [
    { menge: 400, einheit: 'ml', name: 'Kokosmilch', gruppe: '' },
    { menge: 300, einheit: 'g', name: 'Hähnchenbrust, in Streifen', gruppe: '' },
    { menge: 200, einheit: 'ml', name: 'Hühnerbrühe', gruppe: '' },
    { menge: 3, einheit: 'Scheiben', name: 'Galgant', gruppe: '' },
    { menge: 2, einheit: 'Stängel', name: 'Zitronengras, angedrückt', gruppe: '' },
    { menge: 4, einheit: 'Blätter', name: 'Kaffirlimettenblätter', gruppe: '' },
    { menge: 200, einheit: 'g', name: 'Champignons, geviertelt', gruppe: '' },
    { menge: 2, einheit: 'EL', name: 'Fischsauce', gruppe: '' },
    { menge: 2, einheit: 'EL', name: 'Limettensaft, frisch', gruppe: '' },
    { menge: 1, einheit: 'TL', name: 'Palmzucker', gruppe: '' },
  ],
  schritte: [
    { nr: 1, titel: 'Aromaten ansetzen', text: 'Kokosmilch mit Brühe, Galgant, Zitronengras und Kaffirlimettenblättern aufkochen und 5 Minuten ziehen lassen.', dauer_sek: 300 },
    { nr: 2, titel: 'Hähnchen garen', text: 'Hähnchenstreifen und Pilze zugeben und bei sanfter Hitze 8–10 Minuten gar ziehen lassen — nicht kochen, sonst wird das Fleisch trocken.', dauer_sek: 540 },
    { nr: 3, titel: 'Abschmecken', text: 'Vom Herd nehmen. Fischsauce, Limettensaft und Palmzucker einrühren — erst jetzt, damit die Säure frisch bleibt.', dauer_sek: null },
  ],
  tipps: [
    'Galgant und Zitronengras isst man nicht mit — sie bleiben als Aromageber in der Suppe.',
    'Die Suppe darf nach dem Limettensaft nicht mehr kochen, sonst kippt die Frische.',
  ],
  naehrwerte: { kalorien_kcal: 520, eiweiss_g: 38, fett_g: 34, kohlenhydrate_g: 14 },
  glas: null,
  garnitur: null,
};

const sse = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const STREAM =
  sse('meta', RECIPE) +
  RECIPE.zutaten.map((z) => sse('zutat', z)).join('') +
  RECIPE.schritte.map((s) => sse('schritt', s)).join('') +
  RECIPE.tipps.map((t) => sse('tipp', t)).join('') +
  sse('done', RECIPE) +
  sse('saved', { recipe_id: 1, cached: false, remaining: 19 });

async function mock(page, { loggedIn }) {
  await page.route('**/api/v1/me', (r) =>
    loggedIn ? r.fulfill({ json: ME }) : r.fulfill({ json: { authenticated: false } }),
  );
  await page.route('**/api/v1/recipes/generate', (r) =>
    r.fulfill({ status: 200, contentType: 'text/event-stream', body: STREAM }),
  );
  await page.route('**/api/v1/recipes?**', (r) => r.fulfill({ json: { items: [] } }));
  await page.route('**/api/v1/shopping', (r) => r.fulfill({ json: { items: [] } }));
}

const browser = await chromium.launch();

async function shot(name, { viewport, theme = 'light', loggedIn = true, prepare }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await mock(page, { loggedIn });
  await page.addInitScript((t) => localStorage.setItem('zk-theme', t), theme);
  await page.goto(BASE);
  await page.waitForTimeout(600);
  if (prepare) await prepare(page);
  await page.waitForTimeout(900); // let springs settle
  await page.screenshot({ path: `${OUT}${name}.png` });
  await context.close();
  console.log(`✓ ${name}.png`);
}

await shot('landing', { viewport: { width: 1200, height: 760 }, loggedIn: false });

await shot('wizard-dark', { viewport: { width: 390, height: 780 }, theme: 'dark' });

const runWizard = async (page) => {
  await page.getByRole('button', { name: 'Thai' }).click();
  await page.getByRole('button', { name: /Weiter/ }).click();
  await page.getByRole('button', { name: 'frisch' }).click();
  await page.getByRole('button', { name: 'cremig' }).click();
  await page.getByRole('button', { name: /Weiter/ }).click();
  await page.getByRole('button', { name: /Rezept zaubern/ }).click();
  await page.getByRole('heading', { name: 'Tom Kha Gai' }).waitFor();
};

await shot('recipe', { viewport: { width: 390, height: 820 }, prepare: runWizard });

await shot('cook-mode', {
  viewport: { width: 390, height: 820 },
  theme: 'dark',
  prepare: async (page) => {
    await runWizard(page);
    await page.getByRole('button', { name: /Koch-Modus/ }).click();
    await page.waitForTimeout(400);
  },
});

await browser.close();
console.log('done');
