/** Amount scaling (portion stepper) + display formatting. Pure functions, unit-tested. */

import type { Zutat } from './types';

/** Scale a single amount by factor. Free-text amounts ("nach Geschmack") pass through. */
export function scaleAmount(menge: number | string | null, factor: number): number | string | null {
  if (typeof menge === 'number') return menge * factor;
  return menge;
}

/** Sensible rounding for kitchen amounts: 0.33, 1.5, 12.5, 250 … */
export function roundAmount(value: number): number {
  if (value >= 100) return Math.round(value);
  if (value >= 10) return Math.round(value * 2) / 2;
  if (value >= 1) return Math.round(value * 10) / 10;
  return Math.round(value * 100) / 100;
}

/** Upgrade base units for readability (1500 g -> 1.5 kg). */
export function normalizeDisplay(menge: number, einheit: string): { menge: number; einheit: string } {
  const unit = einheit.trim();
  if (unit === 'g' && menge >= 1000) return { menge: roundAmount(menge / 1000), einheit: 'kg' };
  if ((unit === 'ml' || unit === 'cl') && menge * (unit === 'cl' ? 10 : 1) >= 1000) {
    return { menge: roundAmount((menge * (unit === 'cl' ? 10 : 1)) / 1000), einheit: 'l' };
  }
  return { menge: roundAmount(menge), einheit: unit };
}

const NUMBER_FORMAT = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });

/** Format a scaled ingredient for display: "375 g", "1,5 kg", "nach Geschmack". */
export function formatZutatMenge(zutat: Zutat, factor: number): string {
  const scaled = scaleAmount(zutat.menge, factor);
  if (scaled === null || scaled === undefined) return '';
  if (typeof scaled === 'string') return scaled;
  const { menge, einheit } = normalizeDisplay(scaled, zutat.einheit);
  return einheit ? `${NUMBER_FORMAT.format(menge)} ${einheit}` : NUMBER_FORMAT.format(menge);
}

/** Recipe as plain text (share / copy). */
export function recipeToText(recipe: {
  titel: string;
  teaser: string;
  portionen: number;
  zutaten: Zutat[];
  schritte: { nr: number; titel: string; text: string }[];
  tipps: string[];
}, factor = 1): string {
  const lines: string[] = [recipe.titel, recipe.teaser, ''];
  lines.push(`Zutaten (${Math.round(recipe.portionen * factor)} Portionen):`);
  for (const z of recipe.zutaten) {
    const amount = formatZutatMenge(z, factor);
    lines.push(`- ${amount ? `${amount} ` : ''}${z.name}`);
  }
  lines.push('', 'Zubereitung:');
  for (const s of recipe.schritte) lines.push(`${s.nr}. ${s.titel}: ${s.text}`);
  if (recipe.tipps.length) {
    lines.push('', 'Tipps:');
    for (const tip of recipe.tipps) lines.push(`- ${tip}`);
  }
  lines.push('', 'Gezaubert mit zauberkoch.de');
  return lines.join('\n');
}
