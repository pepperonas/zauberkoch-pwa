/** Global generation indicators, shown while the user is on another page:
 * - GenerationBar: slim indeterminate progress bar docked under the header
 * - GenerationPill: floating pill above the nav, taps back to the recipe
 * Both live in one lazy chunk to keep motion-dom out of the entry bundle. */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';

import { strings, t } from '../i18n';
import { spring } from '../motion/springs';
import { useGeneration } from '../state/generation';

/** Indeterminate progress bar at the header's bottom edge while a generation
 * streams in the background. Springs in from the left (transform-only);
 * the runner loop is a CSS ambient animation. */
export function GenerationBar() {
  const gen = useGeneration();
  const location = useLocation();
  const reduced = useReducedMotion();
  const visible = gen.phase === 'streaming' && location.pathname !== '/';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="genbar"
          role="progressbar"
          aria-label={t('stream.pillBrewing')}
          initial={reduced ? { opacity: 0 } : { opacity: 0, scaleX: 0 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0 }}
          transition={spring}
          style={{ transformOrigin: 'left' }}
        >
          <span className="genbar__runner" aria-hidden />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function GenerationPill() {
  const gen = useGeneration();
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const onGeneratePage = location.pathname === '/';
  const finishedUnseen = (gen.phase === 'done' || gen.phase === 'limit') && !gen.seen;
  const visible = !onGeneratePage && (gen.phase === 'streaming' || finishedUnseen);
  const failed = gen.phase === 'limit' || gen.error != null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          className={`genpill ${gen.phase !== 'streaming' ? 'genpill--ready' : ''}`}
          onClick={() => navigate('/')}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 72, scale: 0.9 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 72, scale: 0.9 }}
          transition={spring}
          whileTap={reduced ? undefined : { scale: 0.96 }}
        >
          {gen.phase === 'streaming' ? (
            <>
              <motion.span
                className="genpill__icon"
                aria-hidden
                animate={reduced ? undefined : { rotate: [0, -12, 12, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              >
                🪄
              </motion.span>
              <span className="genpill__label">
                {t('stream.pillBrewing')}
                {gen.data.zutaten.length > 0 && (
                  <span className="genpill__meta">
                    {strings.stream.pillProgress(gen.data.zutaten.length, gen.data.schritte.length)}
                  </span>
                )}
              </span>
            </>
          ) : (
            <>
              <span className="genpill__icon" aria-hidden>{failed ? '⚠️' : '✨'}</span>
              <span className="genpill__label">{failed ? t('stream.pillFailed') : t('stream.pillReady')}</span>
            </>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
