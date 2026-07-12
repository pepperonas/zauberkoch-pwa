/** Meal-type × cuisine sanity for the kochen wizard.
 *
 * Country/regional cuisines (Italienisch, Thai, Deutsch, … ~90 catalog
 * entries) work with EVERY meal type — every culture has breakfast, dessert,
 * sides, etc. Only dish-form/style entries (pizza, pasta, sushi, …) are bound
 * to a form and clash with a few meal types (the classic "Frühstück + Pizza").
 *
 * Conservative by design: we forbid only clearly-absurd pairs, never a whole
 * country cuisine. Matching is by keyword on the lowercased name, so it covers
 * both the catalog entries and free-text input ("Steinofenpizza" → pizza).
 */

/** keyword (tested on the lowercased cuisine) → meal types it does NOT support */
const RESTRICTIONS: { pattern: RegExp; forbids: readonly string[] }[] = [
  { pattern: /pizza/, forbids: ['Frühstück', 'Dessert'] },
  { pattern: /pasta/, forbids: ['Frühstück', 'Dessert'] },
  { pattern: /bbq|smoker/, forbids: ['Frühstück', 'Dessert'] },
  { pattern: /sushi|sashimi/, forbids: ['Frühstück', 'Dessert'] },
  { pattern: /ramen|nudelsupp/, forbids: ['Dessert'] }, // breakfast noodle soup is real
  { pattern: /tapas|pintxo/, forbids: ['Frühstück', 'Dessert'] },
  { pattern: /mezze/, forbids: ['Frühstück', 'Dessert'] },
];

/** True if the (cuisine, meal type) pair is sensible. Empty side → no constraint. */
export function cuisineAllowsMeal(kueche: string, gerichtTyp: string): boolean {
  if (!kueche || !gerichtTyp) return true;
  const hay = kueche.toLowerCase();
  for (const { pattern, forbids } of RESTRICTIONS) {
    if (pattern.test(hay) && forbids.includes(gerichtTyp)) return false;
  }
  return true;
}
