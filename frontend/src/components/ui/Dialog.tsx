/** Centered modal dialog with spring entrance. */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';

import { springBouncy } from '../../motion/springs';
import './ui.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}

export function Dialog({ open, onClose, label, children }: DialogProps) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
          <motion.div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={reduced ? { opacity: 0, x: '-50%', y: '-50%' } : { opacity: 0, scale: 0.8, x: '-50%', y: '-50%' }}
            animate={reduced ? { opacity: 1, x: '-50%', y: '-50%' } : { opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, x: '-50%', y: '-50%' }}
            transition={springBouncy}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
