import { describe, expect, it } from 'vitest';

import { recipeToText } from './units';

const RECIPE = {
  titel: 'Pasta al Limone',
  teaser: 'Cremig-frische Zitronenpasta.',
  portionen: 2,
  zutaten: [
    { menge: 250, einheit: 'g', name: 'Spaghetti', gruppe: '' },
    { menge: 'nach Geschmack', einheit: '', name: 'Salz', gruppe: '' },
    { menge: null, einheit: '', name: 'Pfeffer', gruppe: '' },
  ],
  schritte: [
    { nr: 1, titel: 'Kochen', text: 'Spaghetti kochen.' },
    { nr: 2, titel: 'Mischen', text: 'Alles vermengen.' },
  ],
  tipps: ['Pasta-Wasser aufheben.'],
};

describe('recipeToText', () => {
  it('renders a complete shareable text', () => {
    const text = recipeToText(RECIPE);
    expect(text).toContain('Pasta al Limone');
    expect(text).toContain('Zutaten (2 Portionen):');
    expect(text).toContain('- 250 g Spaghetti');
    expect(text).toContain('- nach Geschmack Salz');
    expect(text).toContain('- Pfeffer'); // no amount -> plain
    expect(text).toContain('1. Kochen: Spaghetti kochen.');
    expect(text).toContain('Tipps:');
    expect(text).toContain('zauberkoch.de');
  });

  it('scales amounts and servings with the factor', () => {
    const text = recipeToText(RECIPE, 2);
    expect(text).toContain('Zutaten (4 Portionen):');
    expect(text).toContain('- 500 g Spaghetti');
    expect(text).toContain('- nach Geschmack Salz'); // free text untouched
  });

  it('omits the tips section when there are none', () => {
    const text = recipeToText({ ...RECIPE, tipps: [] });
    expect(text).not.toContain('Tipps:');
  });
});
