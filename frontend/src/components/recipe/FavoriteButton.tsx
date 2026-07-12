/** Playful, rewarding favorite toggle (MD3 Expressive).
 * - press: icon scales to 0.8 (fast spatial)
 * - favoriting: reward pop (0.8 → 1.3 → 1) + counter-rotation (slow spatial)
 *   with a radial spark burst in theme colors; icon color fades outline→gold
 *   (effects spring, no overshoot)
 * - un-favoriting: restrained scale dip, no burst (removal must not reward)
 * All physics come from src/motion/tokens.ts — no inline magic numbers. */

import { motion, useAnimationControls, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import {
  dismissDip,
  effectsDefault,
  fastSpatial,
  pressStar,
  rewardPop,
  slowSpatial,
} from '../../motion/tokens';
import { Icon } from '../icons';

/** Deterministic radial burst directions (transform-only, no layout shift). */
const BURST = Array.from({ length: 7 }, (_, i) => {
  const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
  return { x: Math.cos(a) * 34, y: Math.sin(a) * 34 };
});
const SPARK_COLORS = ['var(--c-primary)', 'var(--c-tertiary)', 'var(--icon-gold)'];

interface Props {
  active: boolean;
  onToggle: () => void;
  label: string;
}

export function FavoriteButton({ active, onToggle, label }: Props) {
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  const first = useRef(true);
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    if (active) {
      void controls.start({ scale: [...rewardPop.scale], rotate: [...rewardPop.rotate] }, slowSpatial);
      setBurstKey((k) => k + 1);
    } else {
      void controls.start({ scale: [...dismissDip.scale], rotate: 0 }, fastSpatial);
    }
  }, [active, reduced, controls]);

  return (
    <motion.button
      type="button"
      className={`btn btn--${active ? 'tonal' : 'outlined'}`}
      onClick={onToggle}
      aria-pressed={active}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={fastSpatial}
    >
      <span className="favbtn__icon" aria-hidden>
        {/* spatial layer: press / pop / rotate */}
        <motion.span
          className="favbtn__star"
          animate={controls}
          whileTap={reduced ? undefined : pressStar}
          transition={fastSpatial}
        >
          {/* effects layer: outline → gold, never overshoots */}
          <motion.span
            className="favbtn__star"
            animate={{ color: active ? 'var(--icon-gold)' : 'var(--c-on-surface-variant)' }}
            transition={effectsDefault}
          >
            <Icon name={active ? 'star' : 'starOff'} size={18} />
          </motion.span>
        </motion.span>
        {!reduced && active && (
          <span className="favbtn__burst" key={burstKey}>
            {BURST.map((p, i) => (
              <motion.span
                key={i}
                className="favbtn__spark"
                style={{ background: SPARK_COLORS[i % SPARK_COLORS.length] }}
                initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
                animate={{ x: p.x, y: p.y, scale: [0.3, 1, 0.5], opacity: [0, 1, 0] }}
                transition={{ ...fastSpatial, delay: i * 0.02 }}
              />
            ))}
          </span>
        )}
      </span>
      {label}
    </motion.button>
  );
}
