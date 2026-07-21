/** CRT power-off / power-on — the login/logout signature moments.
 *
 * 1:1 tube behaviour via View-Transition snapshots of the REAL page:
 *
 * OFF — the actual picture (full-page snapshot incl. header/nav) collapses
 * vertically into a white-hot scanline (brightness ramps up as the beam
 * compresses), the line runs together into a dot, the dot blooms and burns
 * out on the dark tube (theme surface). The caller holds the dark screen
 * until logout actually completed, then exit-fades onto the landing page.
 *
 * ON — after the OAuth round-trip the dark tube holds while the session
 * resolves, the dot blooms in, stretches into the scanline, then the real
 * app snapshot stretches OUT of the line (vertical expansion with a bloom
 * flash that settles) — not an overlay imitation, the actual picture.
 *
 * Deliberate deviations from the spring rule (documented like the ambient
 * loops): this imitates cathode hardware — hard cubic ease-in for collapse,
 * ease-out for arrival; springs would break the illusion. Snapshot transforms
 * are GPU-composited; the brightness ramp runs only for ~300ms on a static
 * snapshot. Browsers without startViewTransition skip the picture
 * collapse/stretch and keep the line/dot choreography. prefers-reduced-motion
 * is handled by the callers (no overlay, direct login/logout).
 */

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

import { t } from '../i18n';
import './crt.css';

type VT = { ready: Promise<void>; finished: Promise<void> };
type VTDocument = Document & { startViewTransition?: (cb: () => void) => VT };

/* Hard cathode collapse: slow start, violent finish. */
const COLLAPSE_EASE = [0.55, 0, 0.85, 0.35] as const;
/* Arrival: fast start, soft landing. */
const OPEN_EASE_CSS = 'cubic-bezier(0.15, 0.65, 0.45, 1)';

/* OFF timings */
const COLLAPSE_MS = 340; // picture -> line (incl. the pre-collapse flicker beat)
const LINEX_S = 0.16; // line -> dot
const AFTERGLOW_S = 0.28; // dot bloom + phosphor fade
/* ON timings */
const ON_DOT_S = 0.17;
const ON_LINE_S = 0.17;
const OPEN_MS = 320; // line -> full picture

/* Residual X scale for the "line becomes a dot" collapse. */
const DOT_X = 0.004;

/** Forced completion even if rAF stalls (hidden tab) — never trap the user. */
const SAFETY_MS = 2000;
const ON_SAFETY_MS = 4000;

/* ============================== power-OFF ============================== */

type OffPhase = 'pre' | 'linehold' | 'linex' | 'dot';

interface OffProps {
  /** Fired once the tube is dark (or by the safety timeout). */
  onDone: () => void;
}

export function CrtOff({ onDone }: OffProps) {
  const [phase, setPhase] = useState<OffPhase>('pre');

  useEffect(() => {
    const id = window.setTimeout(onDone, SAFETY_MS);
    return () => window.clearTimeout(id);
  }, [onDone]);

  // Phase A — collapse the real page into the scanline: a view transition
  // snapshots the app (old) and this overlay's lit line (new); WAAPI squishes
  // the old snapshot with a brightness ramp (beam energy compressing). The
  // 'pre' render is empty so the old snapshot is the untouched app.
  useEffect(() => {
    const doc = document as VTDocument;
    const root = document.documentElement;
    if (!doc.startViewTransition) {
      // No VT support: skip the picture collapse, open on the lit line.
      setPhase('linehold');
      const id = window.setTimeout(() => setPhase('linex'), 160);
      return () => window.clearTimeout(id);
    }
    root.classList.add('zk-crt-vt-off');
    const vt = doc.startViewTransition(() => flushSync(() => setPhase('linehold')));
    vt.ready
      .then(() =>
        root.animate(
          // Beat of flicker, then the vertical collapse with slight horizontal
          // bowing. The brightness whiteout is deliberately BACK-loaded (only
          // the last ~30%): the picture must stay recognizable while it
          // squishes — that's the 1:1 tube look — and only white out as the
          // beam fully compresses. Per-segment easings keep the collapse
          // violent without racing the whiteout.
          [
            { transform: 'scaleY(1) scaleX(1)', filter: 'brightness(1)' },
            { transform: 'scaleY(1) scaleX(1)', filter: 'brightness(0.8)', offset: 0.08 },
            {
              transform: 'scaleY(1) scaleX(1)',
              filter: 'brightness(1)',
              offset: 0.16,
              easing: 'cubic-bezier(0.55, 0, 0.8, 0.4)',
            },
            {
              transform: 'scaleY(0.4) scaleX(1.015)',
              filter: 'brightness(1.35)',
              offset: 0.68,
              easing: 'cubic-bezier(0.4, 0, 0.7, 0.3)',
            },
            { transform: `scaleY(${DOT_X}) scaleX(1.03)`, filter: 'brightness(3)' },
          ],
          { duration: COLLAPSE_MS, pseudoElement: '::view-transition-old(root)' },
        ).finished,
      )
      .catch(() => {});
    vt.finished.finally(() => {
      root.classList.remove('zk-crt-vt-off');
      setPhase('linex');
    });
    return () => root.classList.remove('zk-crt-vt-off');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="crt"
      role="status"
      aria-live="polite"
      exit={{ opacity: 0, transition: { duration: 0.25, ease: 'easeOut' } }}
    >
      <span className="crt__sr">{t('auth.loggingOut')}</span>

      {phase !== 'pre' && (
        <>
          <div className="crt__dim" aria-hidden />

          {(phase === 'linehold' || phase === 'linex') && (
            <>
              <motion.div
                className="crt__lineglow"
                aria-hidden
                initial={{ scaleX: 1, opacity: 1 }}
                animate={phase === 'linex' ? { scaleX: DOT_X, opacity: [1, 0.7, 0] } : { scaleX: 1 }}
                transition={{ duration: LINEX_S, ease: COLLAPSE_EASE }}
              />
              <motion.div
                className="crt__line"
                aria-hidden
                initial={{ scaleX: 1 }}
                animate={phase === 'linex' ? { scaleX: DOT_X } : { scaleX: 1 }}
                transition={{ duration: LINEX_S, ease: COLLAPSE_EASE }}
                onAnimationComplete={() => phase === 'linex' && setPhase('dot')}
              />
            </>
          )}

          {/* the dying dot: quick bloom, then the phosphor burns out */}
          {phase === 'dot' && (
            <motion.div
              className="crt__dot"
              aria-hidden
              initial={{ scale: 0.9, opacity: 1 }}
              animate={{ scale: [0.9, 1.6, 0.7], opacity: [1, 1, 0] }}
              transition={{ duration: AFTERGLOW_S, times: [0, 0.3, 1], ease: 'easeOut' }}
              onAnimationComplete={onDone}
            />
          )}
        </>
      )}
    </motion.div>
  );
}

/* ============================== power-ON ============================== */

type OnPhase = 'hold' | 'dot' | 'line' | 'opening';

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

  // Phase C — the picture stretches out of the line: the view transition
  // snapshots screen+line (old) and, after this overlay unmounts its content,
  // the real app (new); WAAPI expands the new snapshot vertically with a
  // bloom flash that settles. z-order (crt.css) keeps the growing picture
  // above the dark screen.
  const startOpen = () => {
    const doc = document as VTDocument;
    const root = document.documentElement;
    if (!doc.startViewTransition) {
      onDone(); // degraded: the screen simply lifts off the finished line
      return;
    }
    root.classList.add('zk-crt-vt-on');
    const vt = doc.startViewTransition(() => flushSync(() => setPhase('opening')));
    vt.ready
      .then(() =>
        root.animate(
          {
            transform: [
              `scaleY(${DOT_X}) scaleX(1.03)`,
              'scaleY(1.015) scaleX(1)',
              'scaleY(1) scaleX(1)',
            ],
            filter: ['brightness(3)', 'brightness(1.05)', 'brightness(1)'],
            offset: [0, 0.8, 1],
          },
          { duration: OPEN_MS, easing: OPEN_EASE_CSS, pseudoElement: '::view-transition-new(root)' },
        ).finished,
      )
      .catch(() => {});
    vt.finished.finally(() => {
      root.classList.remove('zk-crt-vt-on');
      onDone();
    });
  };

  if (phase === 'opening') return null; // the view transition owns the reveal

  return (
    <div className="crt" role="status" aria-live="polite">
      <span className="crt__sr">{t('auth.loggingIn')}</span>

      {/* dark tube (theme surface) — holds while /me resolves */}
      <div className="crt__dim" aria-hidden />

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

      {/* scanline stretching out of the dot */}
      {phase === 'line' && (
        <>
          <motion.div
            className="crt__lineglow"
            aria-hidden
            initial={{ scaleX: DOT_X, opacity: 1 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: ON_LINE_S, ease: 'easeOut' }}
          />
          <motion.div
            className="crt__line"
            aria-hidden
            initial={{ scaleX: DOT_X }}
            animate={{ scaleX: 1 }}
            transition={{ duration: ON_LINE_S, ease: 'easeOut' }}
            onAnimationComplete={startOpen}
          />
        </>
      )}
    </div>
  );
}
