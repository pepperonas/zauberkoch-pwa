import { describe, expect, it } from 'vitest';

import { strings, t } from './index';

describe('t()', () => {
  it('resolves nested keys', () => {
    expect(t('recipe.ingredients')).toBe('Zutaten');
    expect(t('app.name')).toBe('Zauberkoch');
  });

  it('returns the path for unknown keys instead of crashing', () => {
    expect(t('does.not.exist')).toBe('does.not.exist');
    expect(t('recipe')).toBe('recipe'); // non-leaf is not a string
  });
});

describe('dictionary invariants', () => {
  it('function-valued entries produce strings', () => {
    expect(strings.stream.remainingToday(5)).toContain('5');
    expect(strings.cook.stepOf(2, 7)).toBe('Schritt 2 von 7');
  });

  it('taste/cuisine lists are non-empty and unique', () => {
    expect(strings.tastes.length).toBeGreaterThan(0);
    expect(new Set(strings.cuisines).size).toBe(strings.cuisines.length);
  });

  it('cuisine catalog offers 100+ unique entries incl. all defaults', () => {
    const all = strings.cuisineRegions.flatMap((r) => r.items);
    expect(all.length).toBeGreaterThanOrEqual(100);
    expect(new Set(all).size).toBe(all.length); // no duplicates across regions
    for (const d of strings.cuisines) expect(all).toContain(d);
  });
});

describe('units.duration', () => {
  it('formats minutes, hours and days sensibly', () => {
    expect(strings.units.duration(0)).toBe('< 1 Min.');
    expect(strings.units.duration(45)).toBe('45 Min.');
    expect(strings.units.duration(89)).toBe('89 Min.');
    expect(strings.units.duration(90)).toBe('1 h 30 Min.');
    expect(strings.units.duration(120)).toBe('2 h');
    expect(strings.units.duration(150)).toBe('2 h 30 Min.');
    expect(strings.units.duration(4320)).toBe('3 Tage'); // the marinade case
    expect(strings.units.duration(1440)).toBe('24 h');
    expect(strings.units.duration(2880)).toBe('2 Tage');
    expect(strings.units.duration(3060)).toBe('2 Tage 3 h');
    expect(strings.units.duration(2 * 1440 + 1435)).toBe('3 Tage'); // rounding carry
  });
});
