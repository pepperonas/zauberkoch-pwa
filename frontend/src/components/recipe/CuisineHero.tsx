/** Curated SVG motifs per cuisine — deliberately NOT AI images. */

interface Props {
  kueche: string;
  mode: 'kochen' | 'cocktail';
}

type Motif = 'noodles' | 'torii' | 'cactus' | 'wok' | 'spice' | 'eiffel' | 'olive' | 'default' | 'cocktail';

function motifFor(kueche: string, mode: 'kochen' | 'cocktail'): Motif {
  if (mode === 'cocktail') return 'cocktail';
  const k = kueche.toLowerCase();
  if (k.includes('ital')) return 'noodles';
  if (k.includes('japan') || k.includes('korea')) return 'torii';
  if (k.includes('mexik') || k.includes('peru')) return 'cactus';
  if (k.includes('thai') || k.includes('chin') || k.includes('viet')) return 'wok';
  if (k.includes('ind')) return 'spice';
  if (k.includes('franz')) return 'eiffel';
  if (k.includes('levante') || k.includes('griech') || k.includes('orient')) return 'olive';
  return 'default';
}

const PATHS: Record<Motif, string> = {
  noodles:
    'M20 90 Q35 40 50 90 Q65 40 80 90 Q95 40 110 90 M15 100 h100 l-8 30 a10 10 0 0 1 -10 8 h-64 a10 10 0 0 1 -10 -8 z',
  torii:
    'M20 50 h90 M25 40 q40 -14 80 0 M35 50 v70 M95 50 v70 M30 78 h70',
  cactus:
    'M60 130 v-70 a12 12 0 0 1 24 0 v70 M60 90 h-16 a10 10 0 0 1 -10 -10 v-18 M84 78 h16 a10 10 0 0 0 10 -10 v-10 M40 130 h64',
  wok: 'M18 80 q47 50 94 0 M30 80 h70 M12 80 h8 M110 80 h8 M45 62 q8 -18 0 -32 M65 62 q8 -18 0 -32',
  spice:
    'M40 110 a26 26 0 1 1 52 0 z M66 74 v-18 M52 60 q14 -12 28 0 M30 118 h72',
  eiffel:
    'M65 20 l22 100 M65 20 l-22 100 M50 80 h30 M40 105 h50 M35 120 q30 -14 60 0',
  olive:
    'M40 90 a22 30 0 1 0 44 0 a22 30 0 1 0 -44 0 M62 58 q4 -18 22 -22 M62 58 q-2 -12 8 -20',
  default:
    'M35 60 a28 28 0 0 1 56 0 M30 60 h66 M40 60 v55 a8 8 0 0 0 8 8 h30 a8 8 0 0 0 8 -8 v-55',
  cocktail:
    'M30 30 h66 l-33 42 z M63 72 v40 M45 112 h36 M84 24 l10 -12 M40 42 h30',
};

export function CuisineHero({ kueche, mode }: Props) {
  const motif = motifFor(kueche, mode);
  return (
    <svg className="hero__svg" viewBox="0 0 130 150" fill="none" aria-hidden focusable="false">
      <path
        d={PATHS[motif]}
        stroke="var(--c-primary)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
    </svg>
  );
}
