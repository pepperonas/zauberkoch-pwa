/** Centered modal dialog with a CRT power-on / power-off entrance & exit.
 *
 * TV-ON (open): a dot blooms, snaps out into a horizontal scanline, and the
 * panel then stretches vertically OUT of that line with a phosphor-bright
 * flash that settles to the real picture.
 * TV-OFF (close): the picture collapses vertically into the bright scanline,
 * the line runs together into a dot and the phosphor burns out.
 *
 * Scoped to the panel (its own transform + a phosphor line element) — unlike
 * the login/logout `CrtOn`/`CrtOff`, which snapshot the whole page. Deliberate
 * cathode easings (hard ease-in for the collapse, ease-out for the arrival);
 * springs would break the tube illusion. `prefers-reduced-motion` → a plain
 * fade, no CRT.
 */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';

import { useFocusTrap } from '../../state/useFocusTrap';
import './ui.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}

/* Arrival: fast start, soft landing. Collapse: slow start, violent finish. */
const ON_EASE = [0.15, 0.65, 0.45, 1] as const;
const OFF_EASE = [0.55, 0, 0.85, 0.35] as const;
/* Residual scale for the "line becomes a dot" pinch. */
const DOT = 0.012;
const ON_MS = 0.5;
const OFF_MS = 0.44;

export function Dialog({ open, onClose, label, children }: DialogProps) {
  const reduced = useReducedMotion();
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Panel: dot → line → picture (on); picture → line → dot → burnout (off).
  const panelMotion = reduced
    ? {
        initial: { opacity: 0, x: '-50%', y: '-50%' },
        animate: { opacity: 1, x: '-50%', y: '-50%' },
        exit: { opacity: 0, x: '-50%', y: '-50%' },
        transition: { duration: 0.16 },
      }
    : {
        initial: { opacity: 1, x: '-50%', y: '-50%', scaleX: 0.02, scaleY: DOT, filter: 'brightness(2.6)' },
        animate: {
          opacity: 1,
          x: '-50%',
          y: '-50%',
          scaleX: [0.02, 1, 1, 1],
          scaleY: [DOT, DOT, 1.06, 1],
          filter: ['brightness(2.6)', 'brightness(2.2)', 'brightness(1.2)', 'brightness(1)'],
          transition: { duration: ON_MS, times: [0, 0.34, 0.82, 1], ease: ON_EASE },
        },
        exit: {
          opacity: [1, 1, 1, 0],
          x: '-50%',
          y: '-50%',
          scaleX: [1, 1, 1.04, 0.02],
          scaleY: [1, DOT, DOT, DOT],
          filter: ['brightness(1)', 'brightness(2.4)', 'brightness(2.8)', 'brightness(3)'],
          transition: { duration: OFF_MS, times: [0, 0.62, 0.82, 1], ease: OFF_EASE },
        },
      };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Phosphor scanline: flashes bright as the panel passes through the
              line phase (on) and again as it collapses (off). */}
          {!reduced && (
            <motion.div
              className="dialog__scanline"
              aria-hidden
              initial={{ opacity: 0, scaleX: 0.02 }}
              animate={{
                opacity: [0, 1, 0.4, 0],
                scaleX: [0.02, 1, 1, 1],
                transition: { duration: ON_MS, times: [0, 0.34, 0.55, 0.9], ease: ON_EASE },
              }}
              exit={{
                opacity: [0, 0.5, 1, 0],
                scaleX: [1, 1, 1, 0.02],
                transition: { duration: OFF_MS, times: [0, 0.5, 0.82, 1], ease: OFF_EASE },
              }}
            />
          )}

          <motion.div
            ref={trapRef}
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            {...panelMotion}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
