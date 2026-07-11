/** Cook mode: fullscreen, one step per screen, swipe navigation,
 * built-in timer for steps with dauer_sek, screen wake lock.
 */

import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { strings, t } from '../../i18n';
import type { Modus, Schritt } from '../../lib/types';
import { spring, springSnappy } from '../../motion/springs';
import { Button, IconButton } from '../ui';
import './recipe.css';

interface Props {
  schritte: Schritt[];
  mode: Modus;
  onClose: () => void;
}

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) await lock.release();
      } catch {
        /* wake lock unavailable (low battery, unsupported) — non-fatal */
      }
    };
    void acquire();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void lock?.release();
    };
  }, [active]);
}

function timerDone() {
  if ('vibrate' in navigator) navigator.vibrate?.([200, 100, 200]);
  try {
    // short two-tone chime via WebAudio — no asset needed
    const ctx = new AudioContext();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain).connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.25 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.25 + 0.22);
      osc.start(ctx.currentTime + i * 0.25);
      osc.stop(ctx.currentTime + i * 0.25 + 0.25);
    });
    window.setTimeout(() => void ctx.close(), 800);
  } catch {
    /* audio unavailable */
  }
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('⏲ Zauberkoch', { body: 'Timer abgelaufen!' });
  }
}


function StepTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const interval = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    interval.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          timerDone();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (interval.current) window.clearInterval(interval.current);
    };
  }, [running]);

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <div>
      <div className="cook__timer" role="timer" aria-live="off">
        {mm}:{String(ss).padStart(2, '0')}
      </div>
      <Button
        variant={running ? 'tonal' : 'filled'}
        onClick={() => {
          if (!running && 'Notification' in window && Notification.permission === 'default') {
            void Notification.requestPermission();
          }
          setRunning((r) => !r);
        }}
      >
        {running ? t('cook.timerStop') : t('cook.timerStart')}
      </Button>
    </div>
  );
}

export function CookMode({ schritte, mode, onClose }: Props) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const total = schritte.length;
  const done = index >= total;
  useWakeLock(true);

  const go = useCallback(
    (delta: number) => {
      setDirection(delta);
      setIndex((i) => Math.min(Math.max(i + delta, 0), total));
    },
    [total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const power = info.offset.x + info.velocity.x * 0.2;
    if (power < -80) go(1);
    else if (power > 80) go(-1);
  };

  const schritt = schritte[index];

  return (
    <motion.div
      className="cook"
      initial={reduced ? undefined : { opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduced ? undefined : { opacity: 0, scale: 1.04 }}
      transition={spring}
    >
      <div className="cook__head">
        <span className="cook__progress">
          {done ? '' : strings.cook.stepOf(index + 1, total)}
        </span>
        <IconButton label={t('cook.exit')} onClick={onClose}>
          ✕
        </IconButton>
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        {done ? (
          <motion.div
            key="done"
            className="cook__body"
            initial={reduced ? undefined : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            style={{ textAlign: 'center' }}
          >
            <div style={{ fontSize: '4rem' }} aria-hidden>
              {mode === 'cocktail' ? '🍸' : '🎉'}
            </div>
            <h1 className="cook__titel">{mode === 'cocktail' ? t('cook.cheers') : t('cook.done')}</h1>
            <div className="cook__nav">
              <Button big onClick={onClose}>
                {t('cook.exit')}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={index}
            className="cook__body"
            drag={reduced ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={onDragEnd}
            initial={reduced ? undefined : { opacity: 0, x: 80 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, x: -80 * direction }}
            transition={springSnappy}
          >
            <span className="schritt__nr" aria-hidden>
              {schritt.nr}
            </span>
            <h1 className="cook__titel">{schritt.titel}</h1>
            <p className="cook__text">{schritt.text}</p>
            {schritt.dauer_sek != null && schritt.dauer_sek > 0 && <StepTimer seconds={schritt.dauer_sek} />}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="cook__dots" aria-hidden>
        {schritte.map((_, i) => (
          <span key={i} className={`cook__dot ${i === index ? 'cook__dot--active' : ''}`} />
        ))}
      </div>
      <div className="cook__nav" style={{ marginTop: 'var(--space-4)' }}>
        <Button variant="outlined" onClick={() => go(-1)} disabled={index === 0}>
          ← {t('wizard.back')}
        </Button>
        <Button onClick={() => go(1)} disabled={done}>
          {t('wizard.next')} →
        </Button>
      </div>
    </motion.div>
  );
}
