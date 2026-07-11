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
});
