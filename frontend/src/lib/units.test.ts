import { describe, expect, it } from 'vitest';

import { formatZutatMenge, normalizeDisplay, roundAmount, scaleAmount } from './units';

describe('scaleAmount', () => {
  it('scales numeric amounts', () => {
    expect(scaleAmount(250, 2)).toBe(500);
    expect(scaleAmount(250, 0.5)).toBe(125);
  });
  it('passes free-text and null through', () => {
    expect(scaleAmount('nach Geschmack', 3)).toBe('nach Geschmack');
    expect(scaleAmount(null, 2)).toBeNull();
  });
});

describe('roundAmount', () => {
  it('rounds kitchen-friendly', () => {
    expect(roundAmount(333.333)).toBe(333);
    expect(roundAmount(12.3)).toBe(12.5);
    expect(roundAmount(1.13)).toBe(1.1);
    expect(roundAmount(0.333)).toBe(0.33);
  });
});

describe('normalizeDisplay', () => {
  it('upgrades g to kg at 1000', () => {
    expect(normalizeDisplay(1500, 'g')).toEqual({ menge: 1.5, einheit: 'kg' });
    expect(normalizeDisplay(900, 'g')).toEqual({ menge: 900, einheit: 'g' });
  });
  it('upgrades ml and cl to l', () => {
    expect(normalizeDisplay(2000, 'ml')).toEqual({ menge: 2, einheit: 'l' });
    expect(normalizeDisplay(120, 'cl')).toEqual({ menge: 1.2, einheit: 'l' });
  });
});

describe('formatZutatMenge', () => {
  const zutat = { menge: 250, einheit: 'g', name: 'Mehl', gruppe: '' };
  it('formats scaled amounts in German locale', () => {
    expect(formatZutatMenge(zutat, 1)).toBe('250 g');
    expect(formatZutatMenge(zutat, 6)).toBe('1,5 kg');
  });
  it('handles free-text amounts', () => {
    expect(formatZutatMenge({ ...zutat, menge: 'nach Geschmack' }, 2)).toBe('nach Geschmack');
  });
  it('handles missing amounts', () => {
    expect(formatZutatMenge({ ...zutat, menge: null }, 2)).toBe('');
  });
});
