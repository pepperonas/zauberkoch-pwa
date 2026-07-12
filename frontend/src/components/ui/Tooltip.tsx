/** Hover/focus tooltip that supplements a control with a short explanation.
 * Desktop-only by design (shown via CSS under `(hover: hover) and (pointer:
 * fine)`); on touch the control's visible label carries the meaning. The text
 * is also exposed to assistive tech via role="tooltip". */

import type { ReactNode } from 'react';

import './ui.css';

interface Props {
  text: string;
  children: ReactNode;
}

export function Tooltip({ text, children }: Props) {
  return (
    <span className="tt">
      {children}
      <span className="tt__bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}
