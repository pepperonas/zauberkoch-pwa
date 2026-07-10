/** Global M3 snackbar with optional undo action. One at a time, spring entrance. */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

import { spring } from '../../motion/springs';
import './ui.css';

interface SnackbarOptions {
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  durationMs?: number;
}

interface SnackbarState extends SnackbarOptions {
  id: number;
  message: string;
}

const SnackbarContext = createContext<{ show: (message: string, options?: SnackbarOptions) => void } | null>(null);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [snack, setSnack] = useState<SnackbarState | null>(null);
  const timer = useRef<number | null>(null);
  const counter = useRef(0);

  const dismiss = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    setSnack(null);
  }, []);

  const show = useCallback((message: string, options: SnackbarOptions = {}) => {
    if (timer.current) window.clearTimeout(timer.current);
    const id = ++counter.current;
    setSnack({ id, message, ...options });
    const duration = options.durationMs ?? (options.onAction ? 6000 : 3500);
    timer.current = window.setTimeout(() => setSnack((s) => (s?.id === id ? null : s)), duration);
  }, []);

  const runAction = async () => {
    const action = snack?.onAction;
    dismiss();
    await action?.();
  };

  return (
    <SnackbarContext.Provider value={{ show }}>
      {children}
      <AnimatePresence>
        {snack && (
          <motion.div
            key={snack.id}
            className="snackbar"
            role="status"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.95 }}
            transition={spring}
          >
            <span className="snackbar__msg">{snack.message}</span>
            {snack.onAction && snack.actionLabel && (
              <button className="snackbar__action" onClick={() => void runAction()}>
                {snack.actionLabel}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar outside SnackbarProvider');
  return ctx;
}
