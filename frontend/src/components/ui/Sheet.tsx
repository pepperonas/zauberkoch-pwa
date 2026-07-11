/** Bottom sheet with real drag: velocity decides snap-back vs dismiss. */

import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react';
import { useEffect, type ReactNode } from 'react';

import { spring } from '../../motion/springs';
import { useFocusTrap } from '../../state/useFocusTrap';
import './ui.css';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
}

export function Sheet({ open, onClose, children, label }: SheetProps) {
  const reduced = useReducedMotion();
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y + info.velocity.y * 0.25 > 140) onClose();
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
          <motion.div
            ref={trapRef}
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={reduced ? { opacity: 0 } : { y: '100%' }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: '100%' }}
            transition={spring}
            drag={reduced ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.02, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div className="sheet__handle" aria-hidden />
            <div style={{ touchAction: 'pan-y' }}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
