/** Central icon component — renders a named glyph from the registry.
 *
 * Sizes (consistent across the app): nav 24 · header logo 28 · text buttons 18
 * · inline meta/stats 16 · chip affixes 13–14 · empty-state hero 48+.
 * Functional icons inherit `currentColor`, so active/hover states color them
 * for free; brand glyphs (logo, wand) carry their own theme-token colors. */

import type { SVGProps } from 'react';

import { GLYPHS, type IconName } from './glyphs';
import './icons.css';

export type { IconName };

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  /** Accessible name. Omitted = decorative (aria-hidden). */
  label?: string;
}

export function Icon({ name, size = 20, label, className = '', ...rest }: IconProps) {
  const Glyph = GLYPHS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={`zki ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      <Glyph />
    </svg>
  );
}
