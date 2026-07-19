/** Count-up number reveal for stat values (nutrition).
 *
 * Starts when the number scrolls into view (once), driven by motion's
 * `animate()` with the effects-class `countUp` spring — no overshoot, a value
 * never runs past itself. tabular-nums so the layout doesn't wobble while
 * counting. reduced-motion: renders the final value immediately.
 */
import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import { countUp } from '../../motion/tokens';

interface Props {
  value: number;
  /** Fraction digits (de-DE formatted); 0 for kcal, 1 for gram values. */
  decimals?: number;
}

export function CountUp({ value, decimals = 0 }: Props) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-32px' });
  const [shown, setShown] = useState(() => (reduced ? value : 0));

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    if (!inView) return;
    const controls = animate(0, value, { ...countUp, onUpdate: setShown });
    // land EXACTLY on the value — the spring's settle tail otherwise leaves
    // the display one rounding step short (519 for 520)
    void controls.then(() => setShown(value));
    return () => controls.stop();
  }, [inView, value, reduced]);

  const fmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: decimals });
  return (
    <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {fmt.format(shown)}
    </span>
  );
}
