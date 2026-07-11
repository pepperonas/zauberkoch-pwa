/** E2E smoke: mocked login -> generate a recipe (mocked SSE) -> favorite it.
 * All /api calls are intercepted — no backend, no Anthropic tokens.
 */

import { expect, test, type Page } from '@playwright/test';

const ME = {
  authenticated: true,
  is_admin: false,
  id: 1,
  email: 'alice@example.com',
  name: 'Alice',
  picture_url: '',
  adult_confirmed: true,
  csrf_token: 'test-csrf',
  preferences: { vegetarisch: false, vegan: false, glutenfrei: false, laktosefrei: false, vermeiden: [], standard_personen: 2 },
};

const RECIPE = {
  titel: 'Pasta al Limone',
  teaser: 'Cremig-frische Zitronenpasta.',
  kueche: 'Italienisch',
  tags: ['pasta'],
  portionen: 2,
  zeit_aktiv: 15,
  zeit_gesamt: 20,
  schwierigkeit: 'einfach',
  zutaten: [
    { menge: 250, einheit: 'g', name: 'Spaghetti', gruppe: '' },
    { menge: 60, einheit: 'g', name: 'Parmesan', gruppe: '' },
  ],
  schritte: [
    { nr: 1, titel: 'Kochen', text: 'Spaghetti bissfest kochen.', dauer_sek: 540 },
    { nr: 2, titel: 'Mischen', text: 'Alles vermengen.', dauer_sek: null },
  ],
  tipps: ['Pasta-Wasser aufheben.'],
  naehrwerte: null,
  glas: null,
  garnitur: null,
};

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

const STREAM_BODY =
  sse('meta', RECIPE) +
  RECIPE.zutaten.map((z) => sse('zutat', z)).join('') +
  RECIPE.schritte.map((s) => sse('schritt', s)).join('') +
  sse('tipp', RECIPE.tipps[0]) +
  sse('done', RECIPE) +
  sse('saved', { recipe_id: 42, cached: false, remaining: 19 });

async function mockApi(page: Page) {
  const favoriteCalls: string[] = [];
  await page.route('**/api/v1/me', (route) => route.fulfill({ json: ME }));
  await page.route('**/api/v1/recipes/generate', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: STREAM_BODY,
    }),
  );
  await page.route('**/api/v1/recipes/42/favorite', (route) => {
    favoriteCalls.push(route.request().method());
    return route.fulfill({ json: { is_favorite: route.request().method() === 'PUT' } });
  });
  await page.route('**/api/v1/recipes?**', (route) => route.fulfill({ json: { items: [] } }));
  await page.route('**/api/v1/shopping', (route) => route.fulfill({ json: { items: [] } }));
  return favoriteCalls;
}

test('login -> generate -> favorite', async ({ page }) => {
  const favoriteCalls = await mockApi(page);

  await page.goto('/');

  // Logged in: wizard is visible (mode segmented button)
  await expect(page.getByRole('button', { name: /Kochen/ })).toBeVisible();

  // Walk the wizard: cuisine -> taste -> details -> generate
  await page.getByRole('button', { name: 'Italienisch' }).click();
  await page.getByRole('button', { name: /Weiter/ }).click();
  await page.getByRole('button', { name: 'frisch', exact: false }).click();
  await page.getByRole('button', { name: /Weiter/ }).click();
  await page.getByRole('button', { name: /Rezept zaubern/ }).click();

  // Streamed recipe renders
  await expect(page.getByRole('heading', { name: 'Pasta al Limone' })).toBeVisible();
  await expect(page.getByRole('button', { name: /250\s?g Spaghetti/ })).toBeVisible();
  await expect(page.getByText('Pasta-Wasser aufheben.')).toBeVisible();
  await expect(page.getByText(/Noch 19 Zauber heute/)).toBeVisible();

  // Favorite it
  await page.getByRole('button', { name: /Favorit/ }).click();
  await expect.poll(() => favoriteCalls).toContain('PUT');
});

test('generation survives navigation and is reachable via the pill', async ({ page }) => {
  await mockApi(page);
  // Slow stream: response arrives after 1.5s so the run is "in flight" while we navigate
  await page.unroute('**/api/v1/recipes/generate');
  await page.route('**/api/v1/recipes/generate', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body: STREAM_BODY });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Italienisch' }).click();
  await page.getByRole('button', { name: /Weiter/ }).click();
  await page.getByRole('button', { name: /Weiter/ }).click();
  await page.getByRole('button', { name: /Rezept zaubern/ }).click();

  // Conjuring stage is up -> navigate away while the stream is running
  await expect(page.getByText('Der Zauberkoch schwingt den Stab …')).toBeVisible();
  await page.getByRole('link', { name: /Favoriten/ }).click();

  // Floating pill: first brewing, then ready — generation kept running
  await expect(page.getByRole('button', { name: /Rezept wird gezaubert/ })).toBeVisible();
  await page.getByRole('button', { name: /Dein Rezept ist fertig/ }).click();
  await expect(page.getByRole('heading', { name: 'Pasta al Limone' })).toBeVisible();
});

test('landing page for logged-out users', async ({ page }) => {
  await page.route('**/api/v1/me', (route) =>
    route.fulfill({ status: 401, json: { error: { code: 'unauthorized', message: 'x' } } }),
  );
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Mit Google anmelden' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Was kochen wir heute?' })).toBeVisible();
});
