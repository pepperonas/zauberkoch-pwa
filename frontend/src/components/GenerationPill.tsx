/** Floating pill: a generation is running (or finished unseen) while the user
 * is on another page. Tapping it jumps back to the generation view. */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';

import { strings, t } from '../i18n';
import { spring } from '../motion/springs';
import { useGeneration } from '../state/generation';

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
