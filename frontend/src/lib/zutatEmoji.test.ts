import { describe, expect, it } from 'vitest';

import { emojiForZutat } from './zutatEmoji';

describe('emojiForZutat', () => {
  it('matches German ingredient names including compounds', () => {
    expect(emojiForZutat('Cherrytomaten')).toBe('🍅');
    expect(emojiForZutat('Olivenöl')).toBe('🫒');
    expect(emojiForZutat('Rotwein')).toBe('🍷');
    expect(emojiForZutat('Parmesan')).toBe('🧀');
    expect(emojiForZutat('Limettensaft')).toBe('🍋');
  });

  it('treats short keywords as word prefixes, not substrings', () => {
    expect(emojiForZutat('Eier')).toBe('🥚');
    expect(emojiForZutat('Eiswürfel')).toBe('🧊');
    expect(emojiForZutat('Rinderfleisch')).toBe('🥩'); // not 🥚/🧊 via "ei"/"eis"
  });

  it('falls back to sparkles for unknown ingredients', () => {
    expect(['✨', '🌟', '🫧']).toContain(emojiForZutat('Xylit'));
  });
});
