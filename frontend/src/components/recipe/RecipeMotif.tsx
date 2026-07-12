/** Curated flat-vector card motifs for dishes & drinks (no AI images).
 * Style system: 120x120 canvas, soft ground shadow, translucent glass /
 * ceramic, vertical liquid gradients, rounded garnish shapes. New motifs:
 * see .claude/skills/recipe-motifs/ for the generator prompt + style spec.
 */

import { useId } from 'react';

import type { Modus } from '../../lib/types';

export type Motif = 'highball' | 'tumbler' | 'coupe' | 'pasta' | 'bowl';

interface MatchInput {
  mode: Modus;
  titel: string;
  tags?: string[];
  kueche?: string;
  glas?: string | null;
}

/** Pick the motif for a recipe — glass type first (cocktails), then dish
 * keywords. Fallbacks: tumbler (drinks) / bowl (dishes). */
export function motifForRecipe(item: MatchInput): Motif {
  const hay = `${item.glas ?? ''} ${item.titel} ${(item.tags ?? []).join(' ')} ${item.kueche ?? ''}`.toLowerCase();
  if (item.mode === 'cocktail') {
    if (/coupe|martini|cocktailschale|schale|nick|nora|sekt|champagner|flöte|flute|spitz/.test(hay)) return 'coupe';
    if (/longdrink|highball|collins|becher|tiki|hurricane|mule|fizz|spritz|weinglas|ballon/.test(hay)) return 'highball';
    return 'tumbler'; // tumbler / old fashioned / rocks + default
  }
  if (/ramen|udon|soba|pho|suppe|eintopf|chowder/.test(hay)) return 'bowl';
  if (/pasta|spaghetti|tagliatelle|linguine|penne|nudel|lasagne|gnocchi|carbonara/.test(hay)) return 'pasta';
  if (/pizza|flammkuchen/.test(hay)) return 'pasta';
  return 'bowl'; // bowls, curry, reis, salat + default
}

interface Props {
  motif: Motif;
  size?: number;
  className?: string;
}

export function RecipeMotif({ motif, size = 84, className = '' }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const common = { width: size, height: size, viewBox: '0 0 120 120', className, 'aria-hidden': true as const };
  switch (motif) {
    case 'highball':
      return <Highball id={id} {...common} />;
    case 'coupe':
      return <Coupe id={id} {...common} />;
    case 'pasta':
      return <Pasta id={id} {...common} />;
    case 'bowl':
      return <Bowl id={id} {...common} />;
    default:
      return <Tumbler id={id} {...common} />;
  }
}

type SvgProps = React.SVGProps<SVGSVGElement> & { id: string };

/* Sunny longdrink: tall glass, ice, straw, lime wheel. */
function Highball({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-liq`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe27a" />
          <stop offset="1" stopColor="#f5b73c" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="107" rx="30" ry="5.5" fill="#000" opacity="0.08" />
      {/* straw behind the rim */}
      <rect x="70" y="8" width="7" height="52" rx="3.5" transform="rotate(14 73 34)" fill="#4cb96b" />
      <rect x="70" y="8" width="7" height="14" rx="3.5" transform="rotate(14 73 34)" fill="#3aa257" />
      {/* glass body (slight taper) */}
      <path d="M41 30 L45 104 Q45 107 49 107 L71 107 Q75 107 75 104 L79 30 Z" fill="#fff" opacity="0.5" />
      {/* liquid */}
      <path d="M43.2 46 L46.5 102 Q46.7 105 50 105 L70 105 Q73.3 105 73.5 102 L76.8 46 Z" fill={`url(#${id}-liq)`} />
      {/* ice cubes */}
      <rect x="49" y="52" width="15" height="15" rx="4" transform="rotate(-12 56 60)" fill="#fff" opacity="0.45" />
      <rect x="58" y="74" width="14" height="14" rx="4" transform="rotate(9 65 81)" fill="#fff" opacity="0.4" />
      {/* rim highlight */}
      <path d="M41 30 L79 30" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      {/* glass edge shine */}
      <path d="M46 38 L48.5 98" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.5" />
      {/* lime wheel on the rim */}
      <g transform="translate(80 32) rotate(18)">
        <circle r="12.5" fill="#7ed26a" />
        <circle r="10" fill="#c9ef9a" />
        <g stroke="#8fd979" strokeWidth="2">
          <line x1="0" y1="-9" x2="0" y2="9" />
          <line x1="-9" y1="0" x2="9" y2="0" />
          <line x1="-6.4" y1="-6.4" x2="6.4" y2="6.4" />
          <line x1="-6.4" y1="6.4" x2="6.4" y2="-6.4" />
        </g>
        <circle r="10" fill="none" stroke="#a5e284" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

/* Old fashioned: low wide glass, amber liquid, big ice, orange peel. */
function Tumbler({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-liq`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0a95c" />
          <stop offset="1" stopColor="#c96f2e" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="105" rx="32" ry="5.5" fill="#000" opacity="0.08" />
      {/* glass */}
      <path d="M32 48 L36 100 Q36.3 104 41 104 L79 104 Q83.7 104 84 100 L88 48 Z" fill="#fff" opacity="0.5" />
      {/* liquid */}
      <path d="M34.5 62 L38.3 99 Q38.6 102 42 102 L78 102 Q81.4 102 81.7 99 L85.5 62 Z" fill={`url(#${id}-liq)`} />
      {/* big clear ice cube */}
      <rect x="47" y="64" width="22" height="22" rx="5" transform="rotate(-8 58 75)" fill="#fff" opacity="0.5" />
      <rect x="52" y="69" width="8" height="8" rx="2.5" transform="rotate(-8 56 73)" fill="#fff" opacity="0.55" />
      {/* rim + shine */}
      <path d="M32 48 L88 48" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <path d="M38 55 L41 96" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.5" />
      {/* orange peel twist over the rim */}
      <path d="M84 44 Q94 40 92 30 Q91 24 85 24" fill="none" stroke="#f59a3d" strokeWidth="6" strokeLinecap="round" />
      <circle cx="85" cy="24" r="3" fill="#e8842b" />
    </svg>
  );
}

/* Coupe: shallow bowl on a stem, rosé liquid, cocktail cherry on a pick. */
function Coupe({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-liq`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff9c9c" />
          <stop offset="1" stopColor="#e85d75" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="107" rx="26" ry="5" fill="#000" opacity="0.08" />
      {/* bowl */}
      <path d="M26 34 Q28 62 60 62 Q92 62 94 34 Z" fill="#fff" opacity="0.5" />
      {/* liquid */}
      <path d="M30 40 Q33 58 60 58 Q87 58 90 40 Z" fill={`url(#${id}-liq)`} />
      {/* stem + foot */}
      <rect x="57" y="62" width="6" height="34" rx="3" fill="#fff" opacity="0.6" />
      <path d="M40 102 Q40 96 60 96 Q80 96 80 102 Q80 105 76 105 L44 105 Q40 105 40 102 Z" fill="#fff" opacity="0.6" />
      {/* rim + shine */}
      <path d="M26 34 L94 34" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <path d="M34 42 Q38 53 48 57" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.5" />
      {/* cherry on a pick */}
      <line x1="72" y1="14" x2="60" y2="46" stroke="#e6c98f" strokeWidth="3" strokeLinecap="round" />
      <circle cx="66" cy="30" r="7" fill="#d6334f" />
      <circle cx="63.5" cy="27.5" r="2.2" fill="#ef7a8d" />
    </svg>
  );
}

/* Pasta: plate with a spaghetti nest, cherry tomatoes and basil. */
function Pasta({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-plate`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ece7e0" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="102" rx="40" ry="6" fill="#000" opacity="0.08" />
      {/* plate */}
      <ellipse cx="60" cy="78" rx="46" ry="21" fill={`url(#${id}-plate)`} />
      <ellipse cx="60" cy="76" rx="36" ry="15.5" fill="#f7f3ec" />
      {/* spaghetti nest */}
      <g fill="none" stroke="#f3c25a" strokeWidth="5" strokeLinecap="round">
        <path d="M34 74 Q45 56 62 62 Q80 68 84 76" />
        <path d="M38 80 Q52 62 70 66 Q82 69 85 79" />
        <path d="M42 84 Q50 72 63 71 Q77 70 80 83" />
        <path d="M46 66 Q58 54 72 60" />
      </g>
      <g fill="none" stroke="#e8ae3f" strokeWidth="3" strokeLinecap="round" opacity="0.8">
        <path d="M44 76 Q56 63 71 68" />
        <path d="M49 82 Q60 71 74 74" />
      </g>
      {/* cherry tomatoes */}
      <circle cx="46" cy="66" r="6.5" fill="#e6503f" />
      <circle cx="44" cy="64" r="2" fill="#f28a76" />
      <circle cx="76" cy="80" r="5.5" fill="#e6503f" />
      <circle cx="74.5" cy="78.5" r="1.7" fill="#f28a76" />
      {/* basil leaves */}
      <g fill="#4fae5c">
        <path d="M62 52 Q68 46 74 51 Q69 57 62 55 Z" />
        <path d="M60 52 Q54 45 47 50 Q52 57 60 55 Z" />
      </g>
      <line x1="60" y1="55" x2="60" y2="60" stroke="#3d8c49" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* Bowl: rice, salmon + avocado toppings, sesame, chopsticks. */
function Bowl({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-bowl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f7d8c" />
          <stop offset="1" stopColor="#2c5a66" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="104" rx="34" ry="5.5" fill="#000" opacity="0.08" />
      {/* chopsticks */}
      <rect x="66" y="18" width="5" height="52" rx="2.5" transform="rotate(32 68 44)" fill="#d9a05f" />
      <rect x="76" y="14" width="5" height="52" rx="2.5" transform="rotate(38 78 40)" fill="#c98f4e" />
      {/* rice mound (behind the rim) */}
      <path d="M32 58 Q38 44 50 48 Q54 38 64 42 Q74 36 80 46 Q90 46 88 58 Z" fill="#fdfaf3" />
      {/* toppings */}
      <rect x="38" y="48" width="13" height="10" rx="3" transform="rotate(-8 44 53)" fill="#f28a5b" />
      <rect x="41.5" y="50.5" width="6" height="1.8" rx="0.9" transform="rotate(-8 44 53)" fill="#fbb797" />
      <rect x="55" y="44" width="13" height="10" rx="3" transform="rotate(6 61 49)" fill="#f28a5b" />
      <rect x="58.5" y="46.5" width="6" height="1.8" rx="0.9" transform="rotate(6 61 49)" fill="#fbb797" />
      <path d="M72 46 Q80 42 82 52 Q76 56 71 52 Z" fill="#8cc76f" />
      <path d="M74 47.5 Q79.5 45 80.8 51 Q76.5 53.5 73.5 51 Z" fill="#b9e197" />
      {/* sesame */}
      <g fill="#6b6257">
        <ellipse cx="50" cy="45" rx="1.6" ry="1" transform="rotate(20 50 45)" />
        <ellipse cx="68" cy="42" rx="1.6" ry="1" transform="rotate(-15 68 42)" />
        <ellipse cx="60" cy="39" rx="1.6" ry="1" transform="rotate(40 60 39)" />
      </g>
      {/* bowl */}
      <path d="M26 58 Q26 88 48 94 L46 102 Q46 104 49 104 L71 104 Q74 104 74 102 L72 94 Q94 88 94 58 Z" fill={`url(#${id}-bowl)`} />
      <path d="M26 58 L94 58" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
      {/* bowl pattern + shine */}
      <path d="M34 72 Q60 80 86 72" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
      <path d="M33 64 Q36 78 44 85" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}
