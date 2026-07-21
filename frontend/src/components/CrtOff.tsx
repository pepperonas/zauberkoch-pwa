/** CRT power-off overlay — the logout signature moment.
 *
 * Three phases like an old tube TV shutting down:
 *   1. collapse-y: the (dimming) picture collapses vertically into a hot
 *      white line at screen center, with a subtle brightness flicker
 *   2. collapse-x: the line runs together horizontally into a single dot
 *   3. afterglow: the dot blooms briefly, then burns out to black
 *
 * Deliberate deviations from the spring rule (documented like the ambient
 * loops): this imitates cathode hardware, so it uses a hard cubic ease-in
 * for the collapses and ease-out for the afterglow — a spring overshoot
 * would break the illusion. Transform/opacity only (GPU-composited).
 *
 * The caller keeps the overlay mounted until logout has ACTUALLY completed
 * (after the dot dies it holds the theme background — light mode dims to the
 * light surface, dark mode to near-black) and unmounts it via
 * AnimatePresence for a short reveal fade. prefers-reduced-motion is handled
 * by the caller: it skips rendering this entirely and logs out directly.
 */

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

import { t } from '../i18n';
import './crt.css';

const COLLAPSE_Y_S = 0.22;
const COLLAPSE_X_S = 0.18;
const AFTERGLOW_S = 0.24;
/** Forced completion even if rAF stalls (hidden tab) — never trap the user. */
const SAFETY_MS = 2000;

/** Hard cathode collapse: slow start, violent finish. */
const COLLAPSE_EASE = [0.55, 0, 0.85, 0.35] as const;
/** Residual line/dot thickness while collapsing (scale factors). */
const LINE_Y = 0.006;
const DOT_X = 0.004;

type Phase = 'collapse-y' | 'collapse-x' | 'afterglow';

interface Props {
  /** Fired once the tube is dark (or by the safety timeout). */
  onDone: () => void;
}

export function CrtOff({ onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('collapse-y');

  useEffect(() => {
    const id = window.setTimeout(onDone, SAFETY_MS);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <motion.div
      className="crt"
      role="status"
      aria-live="polite"
      exit={{ opacity: 0, transition: { duration: 0.25, ease: 'easeOut' } }}
    >
      <span className="crt__sr">{t('auth.loggingOut')}</span>

      {/* the rest of the screen dims to black while the picture collapses */}
      <motion.div
        className="crt__dim"
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: COLLAPSE_Y_S, ease: 'easeIn' }}
      />

      {/* the "picture": a white field collapsing to a line, then to a dot */}
      <motion.div
        className="crt__beam"
        aria-hidden
        initial={{ scaleY: 1, scaleX: 1, opacity: 1 }}
        animate={
          phase === 'collapse-y'
            ? { scaleY: LINE_Y, opacity: [1, 0.88, 1, 0.94, 1] } // flicker on the way down
            : { scaleY: LINE_Y, scaleX: DOT_X, opacity: phase === 'afterglow' ? 0 : 1 }
        }
        transition={
          phase === 'collapse-y'
            ? { duration: COLLAPSE_Y_S, ease: COLLAPSE_EASE }
            : phase === 'collapse-x'
              ? { duration: COLLAPSE_X_S, ease: COLLAPSE_EASE }
              : { duration: 0.05 }
        }
        onAnimationComplete={() =>
          setPhase((p) => (p === 'collapse-y' ? 'collapse-x' : p === 'collapse-x' ? 'afterglow' : p))
        }
      />

      {/* phosphor bloom around the line, collapsing with it */}
      <motion.div
        className="crt__lineglow"
        aria-hidden
        initial={{ opacity: 0, scaleX: 1 }}
        animate={
          phase === 'collapse-y'
            ? { opacity: 0.9 }
            : phase === 'collapse-x'
              ? // fade WHILE collapsing — a blurred 26px element squeezed to a
                // few px reads as a vertical smear, not a dot, if left visible
                { opacity: [0.9, 0.5, 0], scaleX: DOT_X }
              : { opacity: 0, scaleX: DOT_X }
        }
        transition={
          phase === 'collapse-x'
            ? { duration: COLLAPSE_X_S, ease: COLLAPSE_EASE }
            : { duration: phase === 'collapse-y' ? COLLAPSE_Y_S : 0.08, ease: 'easeIn' }
        }
      />

      {/* the dying dot: quick bloom, then burn out */}
      {phase === 'afterglow' && (
        <motion.div
          className="crt__dot"
          aria-hidden
          initial={{ scale: 0.6, opacity: 1 }}
          animate={{ scale: [0.6, 1.6, 0.9], opacity: [1, 1, 0] }}
          transition={{ duration: AFTERGLOW_S, times: [0, 0.35, 1], ease: 'easeOut' }}
          onAnimationComplete={onDone}
        />
      )}
    </motion.div>
  );
}

/* ============================== power-ON ============================== */

/** CRT power-ON reveal — the logout sequence in reverse, played after a
 * successful login (OAuth round-trip): the dark tube (current theme surface)
 * holds while the session resolves, then the dot blooms in, stretches into a
 * scanline, and the picture opens vertically from the line — two theme-colored
 * panels retract outward, revealing the real app underneath. Same deliberate
 * hardware easings as CrtOff (ease-out here: arrival, not collapse); the
 * caller skips rendering entirely under prefers-reduced-motion. */

const ON_DOT_S = 0.18;
const ON_LINE_S = 0.18;
const ON_OPEN_S = 0.26;
/** Reverse of COLLAPSE_EASE: fast start, soft landing. */
const OPEN_EASE = [0.15, 0.65, 0.45, 1] as const;
/** Forced completion even if a phase callback never fires. */
const ON_SAFETY_MS = 4000;

type OnPhase = 'hold' | 'dot' | 'line' | 'open';

interface OnProps {
  /** False while the session is still resolving — the tube stays dark. */
  ready: boolean;
  onDone: () => void;
}

export function CrtOn({ ready, onDone }: OnProps) {
  const [phase, setPhase] = useState<OnPhase>('hold');

  useEffect(() => {
    if (ready) setPhase((p) => (p === 'hold' ? 'dot' : p));
  }, [ready]);

  useEffect(() => {
    const id = window.setTimeout(onDone, ON_SAFETY_MS);
    return () => window.clearTimeout(id);
  }, [onDone]);

  const opening = phase === 'open';

  return (
    <div className="crt" role="status" aria-live="polite">
      <span className="crt__sr">{t('auth.loggingIn')}</span>

      {/* dark tube: two theme-surface panels that retract outward on open */}
      <motion.div
        className="crt__panel crt__panel--top"
        aria-hidden
        animate={{ scaleY: opening ? 0 : 1 }}
        transition={{ duration: ON_OPEN_S, ease: OPEN_EASE }}
        onAnimationComplete={() => opening && onDone()}
      />
      <motion.div
        className="crt__panel crt__panel--bottom"
        aria-hidden
        animate={{ scaleY: opening ? 0 : 1 }}
        transition={{ duration: ON_OPEN_S, ease: OPEN_EASE }}
      />

      {/* waking dot: blooms in, then hands over to the line */}
      {phase === 'dot' && (
        <motion.div
          className="crt__dot"
          aria-hidden
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 1] }}
          transition={{ duration: ON_DOT_S, times: [0, 0.6, 1], ease: 'easeOut' }}
          onAnimationComplete={() => setPhase('line')}
        />
      )}

      {/* scanline stretching out of the dot, glow fading as the picture opens */}
      {(phase === 'line' || opening) && (
        <>
          <motion.div
            className="crt__lineglow"
            aria-hidden
            initial={{ scaleX: 0.004, opacity: 1 }}
            animate={opening ? { scaleX: 1, opacity: 0 } : { scaleX: 1, opacity: 1 }}
            transition={
              opening
                ? { duration: ON_OPEN_S, ease: 'easeOut' }
                : { duration: ON_LINE_S, ease: OPEN_EASE }
            }
          />
          <motion.div
            className="crt__line"
            aria-hidden
            initial={{ scaleX: 0.004 }}
            animate={{ scaleX: 1, opacity: opening ? 0 : 1 }}
            transition={
              opening
                ? { duration: ON_OPEN_S, ease: 'easeOut' }
                : { duration: ON_LINE_S, ease: OPEN_EASE }
            }
            onAnimationComplete={() => phase === 'line' && setPhase('open')}
          />
        </>
      )}
    </div>
  );
}
