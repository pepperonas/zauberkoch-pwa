/** MD3 Expressive Motion tokens — the single source for all spring physics.
 *
 * Spatial springs carry OVERSHOOT (bounce) and drive only spatial properties
 * (scale / translate / rotate). Effects springs NEVER overshoot and drive
 * opacity / color — a fading element must not wobble.
 *
 * Expressed via framer-motion's physical spring API (`visualDuration` +
 * `bounce`, where bounce ≈ 1 − dampingRatio). No component may hardcode
 * stiffness/damping/duration/ease for motion — import from here.
 */
import type { Transition } from 'motion/react';

/* ---------- Spatial springs (overshoot allowed) ---------- */

/** Micro-interactions / small elements — quick, crisp, slight overshoot. */
export const fastSpatial: Transition = { type: 'spring', visualDuration: 0.22, bounce: 0.42 };

/** Standard spatial transitions — cards, sheets, sliding indicators. */
export const defaultSpatial: Transition = { type: 'spring', visualDuration: 0.4, bounce: 0.3 };

/** Large / hero moments — slower, with clearly visible bounce. */
export const slowSpatial: Transition = { type: 'spring', visualDuration: 0.62, bounce: 0.5 };

/* ---------- Effects springs (NO overshoot — opacity/color only) ---------- */

export const effectsFast: Transition = { type: 'spring', visualDuration: 0.16, bounce: 0 };
export const effectsDefault: Transition = { type: 'spring', visualDuration: 0.3, bounce: 0 };

/* ---------- Reduced motion ---------- */

/** prefers-reduced-motion fallback: a short, flat fade (no spatial travel). */
export const reducedFade: Transition = { duration: 0.12, ease: 'linear' };

/* ---------- Helpers ---------- */

/** Cascading entrance delay for staggered children. */
export const staggerIn = (index: number, base = 0.05, transition: Transition = defaultSpatial): Transition => ({
  ...transition,
  delay: index * base,
});

/* ---------- Named variant/keyframe presets (no inline magic numbers) ---------- */

/** Hero card entrance: settles with overshoot (spatial), fades in (effects). */
export const heroEnter = {
  initial: { opacity: 0, y: 24, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1 },
} as const;

/** Staggered content item inside the hero. */
export const heroItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
} as const;

/**
 * Favorite reward "pop" — a framer JS keyframe (transform only, interruptible,
 * NOT a CSS keyframe). Peaks at 1.3 with a lively counter-rotation, then
 * settles. Driven by a spring so segments carry their own physics.
 */
export const rewardPop = { scale: [0.8, 1.3, 1], rotate: [-8, 4, 0] } as const;

/** Restrained un-favorite acknowledgement — dip and return, no overshoot up. */
export const dismissDip = { scale: [1, 0.82, 1] } as const;

/** Press feedback for the favorite icon. */
export const pressStar = { scale: 0.8 } as const;
