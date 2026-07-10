/** Rolling-digit number (portion stepper). */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import { springBouncy } from '../../motion/springs';

export function NumberTicker({ value }: { value: number }) {
  const reduced = useReducedMotion();
  if (reduced) return <span className="stepper__value">{value}</span>;
  return (
    <span className="stepper__value" aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '0.9em', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-0.9em', opacity: 0 }}
          transition={springBouncy}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
