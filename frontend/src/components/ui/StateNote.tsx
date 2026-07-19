/** Animated list-state note (loading / empty).
 *
 * Replaces the bare `<p class="muted">` so state flips (loading → empty →
 * filled) stop feeling abrupt: the text fades in (effects spring), an optional
 * icon settles with a soft spatial pop. Entrance-only BY DESIGN — an exit
 * choreography would require AnimatePresence around the sibling card list,
 * whose entrance is view-transition-suppression-sensitive (see motion rules).
 */
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

import { defaultSpatial, effectsDefault, reducedFade } from '../../motion/tokens';
import { Icon, type IconName } from '../icons';
import './ui.css';

interface Props {
  icon?: IconName;
  children: ReactNode;
}

export function StateNote({ icon, children }: Props) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="statenote"
      role="status"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduced ? reducedFade : effectsDefault}
    >
      {icon && (
        <motion.span
          className="statenote__icon"
          aria-hidden
          initial={reduced ? undefined : { scale: 0.6, y: 8 }}
          animate={reduced ? undefined : { scale: 1, y: 0 }}
          transition={defaultSpatial}
        >
          <Icon name={icon} size={48} />
        </motion.span>
      )}
      <p className="muted">{children}</p>
    </motion.div>
  );
}
