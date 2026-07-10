/** Shared spring presets (M3 Expressive motion). All animation goes through these. */
import type { Transition } from 'motion/react';

/** Standard spatial spring — cards, sheets, layout shifts. */
export const spring: Transition = { type: 'spring', stiffness: 380, damping: 34 };

/** Expressive with overshoot — chip select, favorite star, playful accents. */
export const springBouncy: Transition = { type: 'spring', stiffness: 500, damping: 22 };

/** Snappy, no overshoot — press feedback, small movements. */
export const springSnappy: Transition = { type: 'spring', stiffness: 700, damping: 40 };

/** Soft & slow — hero elements, page-level entrances. */
export const springSoft: Transition = { type: 'spring', stiffness: 200, damping: 26 };

/** Stagger helper for cascading list entrances. */
export const stagger = (index: number, base = 0.045): Transition => ({
  ...spring,
  delay: index * base,
});

/** Entrance variants used by streaming lists (ingredients, steps). */
export const riseIn = {
  initial: { opacity: 0, y: 18, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
} as const;

export const popIn = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1 },
} as const;

/** Press-scale for buttons/cards (whileTap). */
export const pressScale = { scale: 0.97 } as const;
