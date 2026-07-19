/** Bottom sheet with real drag: velocity decides snap-back vs dismiss.
 *
 * Drag is bound to the grab HANDLE only (dragListener=false + dragControls) —
 * a sheet-wide drag listener + touch-action:none swallowed every vertical
 * swipe, so content taller than the sheet (e.g. the profile) could never be
 * scrolled on touch (desktop wheel ignores touch-action, which hid the bug). */

import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from 'motion/react';
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
  const dragControls = useDragControls();

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
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.02, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div
              className="sheet__griparea"
              aria-hidden
              onPointerDown={(e) => {
                if (!reduced) dragControls.start(e);
              }}
            >
              <div className="sheet__handle" />
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
