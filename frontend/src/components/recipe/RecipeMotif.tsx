/** Curated flat-vector card motifs for dishes & drinks (no AI images).
 * Style system: 120x120 canvas, soft ground shadow, translucent glass /
 * ceramic, vertical liquid gradients, rounded garnish shapes. New motifs:
 * see .claude/skills/recipe-motifs/ for the generator prompt + style spec.
 */

import { useId } from 'react';

import type { Modus } from '../../lib/types';

export type Motif =
  | 'highball' | 'tumbler' | 'coupe' | 'tiki' | 'martini' | 'wine' | 'flute' | 'mule'
  | 'pasta' | 'bowl' | 'suppe' | 'pfanne' | 'pizza' | 'salat' | 'burger' | 'fisch'
  | 'steak' | 'dessert' | 'taco' | 'auflauf' | 'pancakes' | 'sandwich';

interface MatchInput {
  mode: Modus;
  titel: string;
  tags?: string[];
  kueche?: string;
  glas?: string | null;
}

/** Pick the motif for a recipe — glass type first (cocktails), then dish
 * keywords, SPECIFIC before generic ("Tiki-Becher" must not fall into the
 * generic highball "becher"). Fallbacks: tumbler (drinks) / bowl (dishes). */
export function motifForRecipe(item: MatchInput): Motif {
  const hay = `${item.glas ?? ''} ${item.titel} ${(item.tags ?? []).join(' ')} ${item.kueche ?? ''}`.toLowerCase();
  if (item.mode === 'cocktail') {
    const glassOf = (s: string): Motif | null => {
      if (/tiki|hurricane|zombie|mai tai/.test(s)) return 'tiki';
      if (/kupfer|mule|moscow/.test(s)) return 'mule';
      if (/coupe|cocktailschale|schale|nick|nora/.test(s)) return 'coupe';
      if (/martini|spitz|dreieck/.test(s)) return 'martini';
      if (/sekt|champagner|flöte|flute|prosecco/.test(s)) return 'flute';
      if (/weinglas|ballon|spritz|sangria|glühwein/.test(s)) return 'wine';
      if (/longdrink|highball|collins|becher|fizz|lemonade|limonade|eistee/.test(s)) return 'highball';
      if (/tumbler|old fashioned|rocks|whisk/.test(s)) return 'tumbler';
      return null;
    };
    // the stated glass wins over title words ("Espresso Martini" in a coupe)
    return glassOf((item.glas ?? '').toLowerCase()) ?? glassOf(hay) ?? 'tumbler';
  }
  if (/pfannkuchen|pancake|crêpe|crepe|waffel|kaiserschmarrn/.test(hay)) return 'pancakes';
  if (/burger/.test(hay)) return 'burger';
  if (/pizza|flammkuchen|galette/.test(hay)) return 'pizza';
  if (/taco|burrito|wrap|quesadilla|fajita|enchilada/.test(hay)) return 'taco';
  if (/sandwich|toast|stulle|bagel|panini|croque/.test(hay)) return 'sandwich';
  if (/ramen|udon|soba|pho|suppe|eintopf|chowder|brühe|minestrone|gulasch/.test(hay)) return 'suppe';
  if (/lasagne|auflauf|gratin|moussaka|casserole|überbacken|parmigiana/.test(hay)) return 'auflauf';
  if (/pasta|spaghetti|tagliatelle|linguine|penne|nudel|gnocchi|carbonara|orecchiette/.test(hay)) return 'pasta';
  if (/bowl|poke|buddha|curry|risotto|porridge|dal/.test(hay)) return 'bowl';
  if (/dessert|kuchen|torte|tiramisu|mousse|pudding|brownie|cheesecake|crumble|panna cotta|sorbet/.test(hay)) return 'dessert';
  if (/salat|caesar|caprese|tabouleh|slaw/.test(hay)) return 'salat';
  if (/fisch|lachs|forelle|dorade|thunfisch|garnele|gamba|shrimp|scampi|muschel|kabeljau|zander|pulpo|oktopus|tintenfisch/.test(hay)) return 'fisch';
  if (/steak|braten|filet|kotelett|schnitzel|rind|lamm|entrecôte|ribs|grill|bbq|hähnchen|fleisch|frikadelle|köfte/.test(hay)) return 'steak';
  if (/pfanne|wok|stir|geschnetzelt|shakshuka|rührei/.test(hay)) return 'pfanne';
  return 'bowl'; // bowls, curry, reis, risotto + default
}

/** Variant counts per motif — deterministic per-recipe variety so two pasta
 * dishes don't share one plate. MUST stay in sync with backend
 * og_image.MOTIF_VARIANTS (the OG renderer picks the same art). */
export const MOTIF_VARIANTS: Record<Motif, number> = {
  highball: 3, tumbler: 3, coupe: 3, tiki: 1, martini: 2, wine: 2, flute: 1, mule: 1,
  pasta: 3, bowl: 3, suppe: 2, pfanne: 2, pizza: 2, salat: 2, burger: 1, fisch: 2,
  steak: 2, dessert: 2, taco: 1, auflauf: 1, pancakes: 1, sandwich: 1,
};

/** Stable, language-portable hash (sum of UTF-16 code units) — the Python
 * OG renderer computes the identical value via ord(). */
export function variantFor(seed: string, count: number): number {
  if (count <= 1) return 0;
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return sum % count;
}

/** Semantic variant hints: when the title names the dish, pick the matching
 * variant instead of the hash ("Carbonara" -> the carbonara plate). MUST
 * stay in sync with backend og_image._VARIANT_HINTS. */
const VARIANT_HINTS: Partial<Record<Motif, [RegExp, number][]>> = {
  pasta: [[/pesto/, 1], [/carbonara|rahm|sahne|käse/, 2], [/pomodoro|tomate|arrabbiata|bolognese|napoli|vongole/, 0]],
  bowl: [[/curry|dal|masala|tikka/, 1], [/poke|lachs|thunfisch/, 0], [/buddha|falafel|kichererbse|veggie|gemüse/, 2]],
  tumbler: [[/negroni|americano|sour/, 2], [/cola|cuba libre|libre/, 1], [/whisk|old fashioned/, 0]],
  coupe: [[/espresso|kaffee/, 1], [/gimlet|basil|grün|matcha/, 2], [/daiquiri|clover|cosmo/, 0]],
  highball: [[/mojito|minze|hugo/, 2], [/sunrise|campari|paloma|zombie/, 1]],
  suppe: [[/tomate|gulasch|linsen|kürbis/, 0], [/kräuter|erbse|spinat|brokkoli|grün/, 1]],
  pfanne: [[/ei|shakshuka|omelett/, 1]],
  steak: [[/schnitzel|kotelett|paniert|cordon/, 1]],
  wine: [[/rotwein|glühwein|sangria|tinto/, 1], [/spritz|weiß|hugo/, 0]],
  fisch: [[/ganz|forelle|dorade|gegrillt/, 1]],
  dessert: [[/schoko|brownie|mousse au/, 1]],
  pizza: [[/verdure|vegetari|funghi|pilz|gemüse/, 1]],
  salat: [[/feta|hirten|griech/, 1]],
  martini: [[/twist|zitrone|lemon/, 1], [/dry|dirty|olive/, 0]],
};

/** Variant for a motif + title: semantic hint first, hash otherwise. */
export function variantForMotif(motif: Motif, seed: string): number {
  const count = MOTIF_VARIANTS[motif] ?? 1;
  if (count <= 1) return 0;
  const lower = seed.toLowerCase();
  for (const [pattern, v] of VARIANT_HINTS[motif] ?? []) {
    if (pattern.test(lower)) return v;
  }
  return variantFor(seed, count);
}

interface Props {
  motif: Motif;
  /** Usually the recipe title — picks the variant deterministically. */
  seed?: string;
  size?: number;
  className?: string;
}

export function RecipeMotif({ motif, seed = '', size = 84, className = '' }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const v = variantForMotif(motif, seed);
  const common = { width: size, height: size, viewBox: '0 0 120 120', className, 'aria-hidden': true as const };
  const MAP: Record<Motif, (p: SvgProps) => React.JSX.Element> = {
    highball: Highball, tumbler: Tumbler, coupe: Coupe, tiki: Tiki, martini: Martini,
    wine: Wine, flute: Flute, mule: Mule, pasta: Pasta, bowl: Bowl, suppe: Suppe,
    pfanne: Pfanne, pizza: Pizza, salat: Salat, burger: Burger, fisch: Fisch,
    steak: Steak, dessert: Dessert, taco: Taco, auflauf: Auflauf, pancakes: Pancakes,
    sandwich: Sandwich,
  };
  const Cmp = MAP[motif] ?? Tumbler;
  return <Cmp id={id} v={v} {...common} />;
}

type SvgProps = React.SVGProps<SVGSVGElement> & { id: string; v?: number };

/* Longdrink — v0 sunny (lime wheel), v1 sunrise (red->orange, orange slice),
   v2 mojito (lime green, mint, extra ice). */
function Highball({ id, v = 0, ...svg }: SvgProps) {
  const liq = [
    ['#ffe27a', '#f5b73c'],
    ['#ffb45c', '#e8483f'],
    ['#e7f5c3', '#b8dd8a'],
  ][v] ?? ['#ffe27a', '#f5b73c'];
  const straw = ['#4cb96b', '#e8483f', '#f5f0e8'][v] ?? '#4cb96b';
  const strawDark = ['#3aa257', '#c93a32', '#ddd5c8'][v] ?? '#3aa257';
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-liq`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={liq[0]} />
          <stop offset="1" stopColor={liq[1]} />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="107" rx="30" ry="5.5" fill="#000" opacity="0.08" />
      <rect x="70" y="8" width="7" height="52" rx="3.5" transform="rotate(14 73 34)" fill={straw} />
      <rect x="70" y="8" width="7" height="14" rx="3.5" transform="rotate(14 73 34)" fill={strawDark} />
      <path d="M41 30 L45 104 Q45 107 49 107 L71 107 Q75 107 75 104 L79 30 Z" fill="#fff" opacity="0.5" />
      <path d="M43.2 46 L46.5 102 Q46.7 105 50 105 L70 105 Q73.3 105 73.5 102 L76.8 46 Z" fill={`url(#${id}-liq)`} />
      <rect x="49" y="52" width="15" height="15" rx="4" transform="rotate(-12 56 60)" fill="#fff" opacity="0.45" />
      <rect x="58" y="74" width="14" height="14" rx="4" transform="rotate(9 65 81)" fill="#fff" opacity="0.4" />
      {v === 2 && <rect x="52" y="88" width="13" height="13" rx="4" transform="rotate(-7 58 94)" fill="#fff" opacity="0.4" />}
      <path d="M41 30 L79 30" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <path d="M46 38 L48.5 98" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.5" />
      {v === 0 && (
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
      )}
      {v === 1 && (
        <g transform="translate(81 31) rotate(16)">
          <path d="M-12 0 A12 12 0 0 1 12 0 Z" fill="#f59a3d" />
          <path d="M-9 -0.5 A9 9 0 0 1 9 -0.5 Z" fill="#ffd9a1" />
          <g stroke="#f5a955" strokeWidth="1.8">
            <line x1="0" y1="-1.5" x2="0" y2="-8.5" />
            <line x1="-5" y1="-1.5" x2="-7.5" y2="-6.5" />
            <line x1="5" y1="-1.5" x2="7.5" y2="-6.5" />
          </g>
        </g>
      )}
      {v === 2 && (
        <g fill="#4fae5c">
          <path d="M52 26 Q46 16 52 8 Q58 14 56 26 Z" />
          <path d="M60 27 Q62 15 71 12 Q69 22 62 28 Z" />
        </g>
      )}
    </svg>
  );
}

/* Tumbler — v0 whiskey (orange peel), v1 cola-dark (lime + straw),
   v2 negroni (red, orange slice inside). */
function Tumbler({ id, v = 0, ...svg }: SvgProps) {
  const liq = [
    ['#f0a95c', '#c96f2e'],
    ['#7a5236', '#3f2a1c'],
    ['#f0755a', '#c73a35'],
  ][v] ?? ['#f0a95c', '#c96f2e'];
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-liq`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={liq[0]} />
          <stop offset="1" stopColor={liq[1]} />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="105" rx="32" ry="5.5" fill="#000" opacity="0.08" />
      {v === 1 && (
        <>
          <rect x="66" y="18" width="7" height="42" rx="3.5" transform="rotate(12 69 39)" fill="#e8483f" />
          <rect x="66" y="18" width="7" height="12" rx="3.5" transform="rotate(12 69 39)" fill="#c93a32" />
        </>
      )}
      <path d="M32 48 L36 100 Q36.3 104 41 104 L79 104 Q83.7 104 84 100 L88 48 Z" fill="#fff" opacity="0.5" />
      <path d="M34.5 62 L38.3 99 Q38.6 102 42 102 L78 102 Q81.4 102 81.7 99 L85.5 62 Z" fill={`url(#${id}-liq)`} />
      {v === 2 && (
        <g transform="translate(70 80) rotate(-14)">
          <path d="M-11 0 A11 11 0 0 1 11 0 Z" fill="#f59a3d" opacity="0.95" />
          <path d="M-8 -0.5 A8 8 0 0 1 8 -0.5 Z" fill="#ffd9a1" opacity="0.95" />
        </g>
      )}
      <rect x="47" y="64" width="22" height="22" rx="5" transform="rotate(-8 58 75)" fill="#fff" opacity="0.5" />
      <rect x="52" y="69" width="8" height="8" rx="2.5" transform="rotate(-8 56 73)" fill="#fff" opacity="0.55" />
      <path d="M32 48 L88 48" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <path d="M38 55 L41 96" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.5" />
      {v === 0 && (
        <>
          <path d="M84 44 Q94 40 92 30 Q91 24 85 24" fill="none" stroke="#f59a3d" strokeWidth="6" strokeLinecap="round" />
          <circle cx="85" cy="24" r="3" fill="#e8842b" />
        </>
      )}
      {v === 1 && (
        <g transform="translate(34 46) rotate(-22)">
          <path d="M-10 0 A10 10 0 0 1 10 0 Z" fill="#7ed26a" />
          <path d="M-7.5 -0.5 A7.5 7.5 0 0 1 7.5 -0.5 Z" fill="#c9ef9a" />
        </g>
      )}
      {v === 2 && (
        <g transform="translate(85 42) rotate(24)">
          <path d="M-11 0 A11 11 0 0 1 11 0 Z" fill="#f59a3d" />
          <path d="M-8.5 -0.5 A8.5 8.5 0 0 1 8.5 -0.5 Z" fill="#ffd9a1" />
        </g>
      )}
    </svg>
  );
}

/* Coupe — v0 rosé (cherry), v1 espresso martini (coffee beans),
   v2 gimlet (lime green, lime wheel on rim). */
function Coupe({ id, v = 0, ...svg }: SvgProps) {
  const liq = [
    ['#ff9c9c', '#e85d75'],
    ['#8a5a3c', '#4a2c1a'],
    ['#dff2b8', '#a9d97a'],
  ][v] ?? ['#ff9c9c', '#e85d75'];
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-liq`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={liq[0]} />
          <stop offset="1" stopColor={liq[1]} />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="107" rx="26" ry="5" fill="#000" opacity="0.08" />
      <path d="M26 34 Q28 62 60 62 Q92 62 94 34 Z" fill="#fff" opacity="0.5" />
      <path d="M30 40 Q33 58 60 58 Q87 58 90 40 Z" fill={`url(#${id}-liq)`} />
      {v === 1 && (
        <>
          <ellipse cx="60" cy="41.5" rx="24" ry="3" fill="#c9a276" opacity="0.85" />
          <g fill="#3d2314">
            <ellipse cx="53" cy="41" rx="3.4" ry="2.4" transform="rotate(-18 53 41)" />
            <ellipse cx="61" cy="42.5" rx="3.4" ry="2.4" transform="rotate(14 61 42.5)" />
            <ellipse cx="68.5" cy="40.5" rx="3.4" ry="2.4" transform="rotate(-8 68.5 40.5)" />
          </g>
        </>
      )}
      <rect x="57" y="62" width="6" height="34" rx="3" fill="#fff" opacity="0.6" />
      <path d="M40 102 Q40 96 60 96 Q80 96 80 102 Q80 105 76 105 L44 105 Q40 105 40 102 Z" fill="#fff" opacity="0.6" />
      <path d="M26 34 L94 34" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <path d="M34 42 Q38 53 48 57" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.5" />
      {v === 0 && (
        <>
          <line x1="72" y1="14" x2="60" y2="46" stroke="#e6c98f" strokeWidth="3" strokeLinecap="round" />
          <circle cx="66" cy="30" r="7" fill="#d6334f" />
          <circle cx="63.5" cy="27.5" r="2.2" fill="#ef7a8d" />
        </>
      )}
      {v === 2 && (
        <g transform="translate(90 35) rotate(20)">
          <circle r="10.5" fill="#7ed26a" />
          <circle r="8.2" fill="#c9ef9a" />
          <g stroke="#8fd979" strokeWidth="1.8">
            <line x1="0" y1="-7.5" x2="0" y2="7.5" />
            <line x1="-7.5" y1="0" x2="7.5" y2="0" />
          </g>
        </g>
      )}
    </svg>
  );
}

/* Pasta — v0 pomodoro (tomatoes + basil), v1 pesto (green strands, pine
   nuts), v2 carbonara (cream strands, bacon, pepper). */
function Pasta({ id, v = 0, ...svg }: SvgProps) {
  const strand = ['#f3c25a', '#9cbf5a', '#f2d9a0'][v] ?? '#f3c25a';
  const strandDark = ['#e8ae3f', '#7fa543', '#e0be7e'][v] ?? '#e8ae3f';
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-plate`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ece7e0" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="102" rx="40" ry="6" fill="#000" opacity="0.08" />
      <ellipse cx="60" cy="78" rx="46" ry="21" fill={`url(#${id}-plate)`} />
      <ellipse cx="60" cy="76" rx="36" ry="15.5" fill="#f7f3ec" />
      <g fill="none" stroke={strand} strokeWidth="5" strokeLinecap="round">
        <path d="M34 74 Q45 56 62 62 Q80 68 84 76" />
        <path d="M38 80 Q52 62 70 66 Q82 69 85 79" />
        <path d="M42 84 Q50 72 63 71 Q77 70 80 83" />
        <path d="M46 66 Q58 54 72 60" />
      </g>
      <g fill="none" stroke={strandDark} strokeWidth="3" strokeLinecap="round" opacity="0.8">
        <path d="M44 76 Q56 63 71 68" />
        <path d="M49 82 Q60 71 74 74" />
      </g>
      {v === 0 && (
        <>
          <circle cx="46" cy="66" r="6.5" fill="#e6503f" />
          <circle cx="44" cy="64" r="2" fill="#f28a76" />
          <circle cx="76" cy="80" r="5.5" fill="#e6503f" />
          <circle cx="74.5" cy="78.5" r="1.7" fill="#f28a76" />
          <g fill="#4fae5c">
            <path d="M62 52 Q68 46 74 51 Q69 57 62 55 Z" />
            <path d="M60 52 Q54 45 47 50 Q52 57 60 55 Z" />
          </g>
          <line x1="60" y1="55" x2="60" y2="60" stroke="#3d8c49" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {v === 1 && (
        <>
          <g fill="#f2e3c0">
            <ellipse cx="50" cy="66" rx="3" ry="2" transform="rotate(20 50 66)" />
            <ellipse cx="66" cy="74" rx="3" ry="2" transform="rotate(-14 66 74)" />
            <ellipse cx="74" cy="64" rx="3" ry="2" transform="rotate(30 74 64)" />
          </g>
          <g fill="#4fae5c">
            <path d="M58 52 Q64 46 70 51 Q65 57 58 55 Z" />
            <path d="M56 52 Q50 45 43 50 Q48 57 56 55 Z" />
          </g>
        </>
      )}
      {v === 2 && (
        <>
          <g fill="#c46a4a">
            <rect x="46" y="63" width="9" height="5" rx="2" transform="rotate(-12 50 65)" />
            <rect x="66" y="70" width="9" height="5" rx="2" transform="rotate(16 70 72)" />
            <rect x="56" y="78" width="8" height="4.5" rx="2" transform="rotate(-6 60 80)" />
          </g>
          <g fill="#5b5148">
            <circle cx="52" cy="72" r="1.2" />
            <circle cx="64" cy="63" r="1.2" />
            <circle cx="72" cy="79" r="1.2" />
          </g>
        </>
      )}
    </svg>
  );
}

/* Bowl — v0 poke (teal, salmon), v1 curry (terracotta, turmeric pool,
   coriander), v2 buddha (charcoal bowl, avocado + chickpeas). */
function Bowl({ id, v = 0, ...svg }: SvgProps) {
  const bowlCol = [
    ['#3f7d8c', '#2c5a66'],
    ['#c9704d', '#a04e31'],
    ['#4a453f', '#2f2b27'],
  ][v] ?? ['#3f7d8c', '#2c5a66'];
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-bowl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bowlCol[0]} />
          <stop offset="1" stopColor={bowlCol[1]} />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="104" rx="34" ry="5.5" fill="#000" opacity="0.08" />
      {v !== 1 && (
        <>
          <rect x="66" y="18" width="5" height="52" rx="2.5" transform="rotate(32 68 44)" fill="#d9a05f" />
          <rect x="76" y="14" width="5" height="52" rx="2.5" transform="rotate(38 78 40)" fill="#c98f4e" />
        </>
      )}
      {v === 1 && (
        <>
          <line x1="88" y1="30" x2="94" y2="14" stroke="#b9b0a4" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="86" cy="34" rx="6.5" ry="8.5" transform="rotate(28 86 34)" fill="#cfc6ba" />
        </>
      )}
      <path d="M32 58 Q38 44 50 48 Q54 38 64 42 Q74 36 80 46 Q90 46 88 58 Z" fill="#fdfaf3" />
      {v === 0 && (
        <>
          <rect x="38" y="48" width="13" height="10" rx="3" transform="rotate(-8 44 53)" fill="#f28a5b" />
          <rect x="41.5" y="50.5" width="6" height="1.8" rx="0.9" transform="rotate(-8 44 53)" fill="#fbb797" />
          <rect x="55" y="44" width="13" height="10" rx="3" transform="rotate(6 61 49)" fill="#f28a5b" />
          <rect x="58.5" y="46.5" width="6" height="1.8" rx="0.9" transform="rotate(6 61 49)" fill="#fbb797" />
          <path d="M72 46 Q80 42 82 52 Q76 56 71 52 Z" fill="#8cc76f" />
          <path d="M74 47.5 Q79.5 45 80.8 51 Q76.5 53.5 73.5 51 Z" fill="#b9e197" />
          <g fill="#6b6257">
            <ellipse cx="50" cy="45" rx="1.6" ry="1" transform="rotate(20 50 45)" />
            <ellipse cx="68" cy="42" rx="1.6" ry="1" transform="rotate(-15 68 42)" />
            <ellipse cx="60" cy="39" rx="1.6" ry="1" transform="rotate(40 60 39)" />
          </g>
        </>
      )}
      {v === 1 && (
        <>
          <path d="M40 52 Q46 42 58 45 Q70 40 78 48 Q84 50 84 56 L36 56 Q36 53 40 52 Z" fill="#e0912f" />
          <ellipse cx="52" cy="50" rx="5" ry="3" fill="#c9761f" />
          <ellipse cx="68" cy="49" rx="4.5" ry="2.8" fill="#c9761f" />
          <g fill="#4fae5c">
            <ellipse cx="58" cy="42" rx="2.4" ry="1.4" transform="rotate(24 58 42)" />
            <ellipse cx="66" cy="44" rx="2.4" ry="1.4" transform="rotate(-18 66 44)" />
          </g>
        </>
      )}
      {v === 2 && (
        <>
          <path d="M38 50 Q44 42 52 46 Q50 54 42 54 Z" fill="#8cc76f" />
          <path d="M40 50.5 Q45 45 50 47.5 Q48 52 43 52 Z" fill="#b9e197" />
          <g fill="#e8c26a">
            <circle cx="60" cy="46" r="3" />
            <circle cx="66" cy="49" r="3" />
            <circle cx="62" cy="52" r="3" />
          </g>
          <circle cx="76" cy="49" r="5.5" fill="#e6503f" />
          <circle cx="74.5" cy="47.5" r="1.7" fill="#f28a76" />
          <g fill="#6b6257">
            <ellipse cx="50" cy="42" rx="1.6" ry="1" transform="rotate(20 50 42)" />
            <ellipse cx="70" cy="42" rx="1.6" ry="1" transform="rotate(-15 70 42)" />
          </g>
        </>
      )}
      <path d="M26 58 Q26 88 48 94 L46 102 Q46 104 49 104 L71 104 Q74 104 74 102 L72 94 Q94 88 94 58 Z" fill={`url(#${id}-bowl)`} />
      <path d="M26 58 L94 58" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
      <path d="M34 72 Q60 80 86 72" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
      <path d="M33 64 Q36 78 44 85" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

/* Tiki mug: carved terracotta face, umbrella + pineapple leaves. */
function Tiki({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-mug`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c97b4a" />
          <stop offset="1" stopColor="#96502c" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="107" rx="27" ry="5.5" fill="#000" opacity="0.08" />
      {/* pineapple leaves */}
      <g fill="#4fae5c">
        <path d="M52 26 Q48 12 56 6 Q58 16 56 26 Z" />
        <path d="M60 26 Q60 10 70 6 Q68 18 63 27 Z" />
      </g>
      {/* cocktail umbrella (scalloped canopy) */}
      <g transform="translate(86 12) rotate(-18)">
        <line x1="0" y1="2" x2="-6" y2="26" stroke="#e6c98f" strokeWidth="3" strokeLinecap="round" />
        <path d="M-17 5 A17 17 0 0 1 17 5 Q13 9 8.5 5.5 Q4 10 0 6 Q-4 10 -8.5 5.5 Q-13 9 -17 5 Z" fill="#ef6f6f" />
        <path d="M-11 -8 Q0 -14 11 -8" fill="none" stroke="#e35b5b" strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* mug body */}
      <path d="M40 28 L44 100 Q44 104 49 104 L71 104 Q76 104 76 100 L80 28 Z" fill={`url(#${id}-mug)`} />
      {/* carved grooves */}
      <path d="M42 40 L78 40 M43 88 L77 88" stroke="#7c3f22" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      {/* face: eyes + zigzag mouth */}
      <path d="M50 52 L58 58 L50 60 Z M70 52 L62 58 L70 60 Z" fill="#7c3f22" />
      <path d="M48 72 L54 66 L60 72 L66 66 L72 72" fill="none" stroke="#7c3f22" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {/* rim + shine */}
      <path d="M40 28 L80 28" stroke="#e8a877" strokeWidth="4" strokeLinecap="round" />
      <path d="M46 36 L49 96" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
    </svg>
  );
}

/* Martini — v0 olive pick, v1 lemon twist. */
function Martini({ id, v = 0, ...svg }: SvgProps) {
  const liq = [
    ['#eef4d2', '#cfe09a'],
    ['#fdf3c8', '#f2dd8a'],
  ][v] ?? ['#eef4d2', '#cfe09a'];
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-liq`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={liq[0]} />
          <stop offset="1" stopColor={liq[1]} />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="107" rx="26" ry="5" fill="#000" opacity="0.08" />
      <path d="M24 30 L96 30 L63 64 L57 64 Z" fill="#fff" opacity="0.5" />
      <path d="M32 37 L88 37 L62 60 L58 60 Z" fill={`url(#${id}-liq)`} />
      <rect x="57" y="64" width="6" height="32" rx="3" fill="#fff" opacity="0.6" />
      <path d="M40 102 Q40 96 60 96 Q80 96 80 102 Q80 105 76 105 L44 105 Q40 105 40 102 Z" fill="#fff" opacity="0.6" />
      <path d="M24 30 L96 30" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <path d="M34 40 L52 56" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.5" />
      {v === 0 && (
        <>
          <line x1="46" y1="16" x2="66" y2="44" stroke="#e6c98f" strokeWidth="3" strokeLinecap="round" />
          <circle cx="58" cy="33" r="6.5" fill="#8ba832" />
          <circle cx="60.5" cy="33" r="2.4" fill="#d6604a" />
        </>
      )}
      {v === 1 && (
        <path
          d="M76 20 Q86 22 85 32 Q84 40 74 40 Q68 40 68 34"
          fill="none"
          stroke="#f6d044"
          strokeWidth="6"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/* Wine — v0 spritz (orange, ice, slice), v1 red wine (round bowl, plain). */
function Wine({ id, v = 0, ...svg }: SvgProps) {
  const liq = [
    ['#ffb35c', '#f07a2e'],
    ['#a2333f', '#6a1f2c'],
  ][v] ?? ['#ffb35c', '#f07a2e'];
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-liq`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={liq[0]} />
          <stop offset="1" stopColor={liq[1]} />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="107" rx="26" ry="5" fill="#000" opacity="0.08" />
      <path d="M32 24 L88 24 Q90 58 60 62 Q30 58 32 24 Z" fill="#fff" opacity="0.5" />
      {v === 0 ? (
        <path d="M34.5 34 L85.5 34 Q85 55 60 58.5 Q35 55 34.5 34 Z" fill={`url(#${id}-liq)`} />
      ) : (
        <path d="M33.6 42 L86.4 42 Q84 56 60 58.5 Q36 56 33.6 42 Z" fill={`url(#${id}-liq)`} />
      )}
      {v === 0 && <rect x="48" y="38" width="14" height="14" rx="4" transform="rotate(-10 55 45)" fill="#fff" opacity="0.45" />}
      <rect x="57" y="62" width="6" height="32" rx="3" fill="#fff" opacity="0.6" />
      <path d="M40 100 Q40 94 60 94 Q80 94 80 100 Q80 103 76 103 L44 103 Q40 103 40 100 Z" fill="#fff" opacity="0.6" />
      <path d="M32 24 L88 24" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <path d="M37 32 Q39 48 50 56" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.5" />
      {v === 0 && (
        <g transform="translate(86 24)">
          <path d="M-11 0 A11 11 0 0 1 11 0 Z" fill="#f59a3d" />
          <path d="M-8.5 -0.5 A8.5 8.5 0 0 1 8.5 -0.5 Z" fill="#ffd9a1" />
          <g stroke="#f5a955" strokeWidth="1.6">
            <line x1="0" y1="-1" x2="0" y2="-8" />
            <line x1="-5" y1="-1" x2="-7" y2="-6" />
            <line x1="5" y1="-1" x2="7" y2="-6" />
          </g>
        </g>
      )}
      {v === 1 && <ellipse cx="52" cy="44" rx="9" ry="2" fill="#d97a86" opacity="0.7" />}
    </svg>
  );
}

/* Champagne flute: pale gold, rising bubbles. */
function Flute({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-liq`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe9a6" />
          <stop offset="1" stopColor="#edc35a" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="107" rx="22" ry="5" fill="#000" opacity="0.08" />
      {/* bowl */}
      <path d="M48 18 L72 18 Q73 56 62 62 L58 62 Q47 56 48 18 Z" fill="#fff" opacity="0.5" />
      {/* liquid */}
      <path d="M50.2 26 L69.8 26 Q70 53 61 59 L59 59 Q50 53 50.2 26 Z" fill={`url(#${id}-liq)`} />
      {/* bubbles */}
      <g fill="#fff" opacity="0.75">
        <circle cx="56" cy="50" r="1.6" />
        <circle cx="62" cy="42" r="1.9" />
        <circle cx="58" cy="33" r="1.5" />
        <circle cx="64" cy="28" r="1.3" />
      </g>
      {/* stem + foot */}
      <rect x="57" y="62" width="6" height="34" rx="3" fill="#fff" opacity="0.6" />
      <path d="M42 102 Q42 96 60 96 Q78 96 78 102 Q78 105 74 105 L46 105 Q42 105 42 102 Z" fill="#fff" opacity="0.6" />
      {/* rim + shine */}
      <path d="M48 18 L72 18" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <path d="M52 26 Q52 48 57 56" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/* Copper mule mug: handle, mint sprig, lime wedge. */
function Mule({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-cup`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e09a58" />
          <stop offset="1" stopColor="#b06a2f" />
        </linearGradient>
      </defs>
      <ellipse cx="58" cy="105" rx="28" ry="5.5" fill="#000" opacity="0.08" />
      {/* mint sprig */}
      <g fill="#4fae5c">
        <path d="M52 24 Q46 14 52 6 Q58 12 56 24 Z" />
        <path d="M60 24 Q62 12 72 10 Q70 20 62 26 Z" />
        <path d="M46 26 Q38 22 36 14 Q46 14 50 24 Z" />
      </g>
      {/* handle */}
      <path d="M84 44 Q100 46 98 62 Q96 76 82 76" fill="none" stroke="#b06a2f" strokeWidth="7" strokeLinecap="round" />
      {/* mug body (barrel) */}
      <path d="M34 32 Q32 68 38 96 Q39 102 46 102 L70 102 Q77 102 78 96 Q84 68 82 32 Z" fill={`url(#${id}-cup)`} />
      {/* hammered highlight band + shine */}
      <path d="M37 44 Q58 50 79 44" fill="none" stroke="#f2c088" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
      <path d="M42 40 Q42 72 46 92" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.35" />
      {/* rim */}
      <path d="M34 32 L82 32" stroke="#f2c088" strokeWidth="4" strokeLinecap="round" />
      {/* lime wedge on rim */}
      <g transform="translate(78 30) rotate(24)">
        <path d="M-10 0 A10 10 0 0 1 10 0 Z" fill="#7ed26a" />
        <path d="M-7.5 -0.5 A7.5 7.5 0 0 1 7.5 -0.5 Z" fill="#c9ef9a" />
      </g>
    </svg>
  );
}

/* Soup — v0 tomato (cream swirl), v1 herb-green (croutons). */
function Suppe({ id, v = 0, ...svg }: SvgProps) {
  const surface = ['#e5673f', '#8fae4f'][v] ?? '#e5673f';
  const surfaceHi = ['#f2895f', '#b3cb76'][v] ?? '#f2895f';
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-bowl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e9e2d8" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="104" rx="40" ry="6" fill="#000" opacity="0.08" />
      <g fill="none" stroke="#c9c2b8" strokeWidth="3.5" strokeLinecap="round" opacity="0.7">
        <path d="M48 22 Q44 30 48 36" />
        <path d="M62 16 Q58 26 62 34" />
        <path d="M74 24 Q70 31 74 37" />
      </g>
      <line x1="88" y1="34" x2="98" y2="18" stroke="#b9b0a4" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="86" cy="38" rx="7" ry="9" transform="rotate(30 86 38)" fill="#cfc6ba" />
      <ellipse cx="60" cy="92" rx="44" ry="12" fill="#f2ede5" />
      <path d="M24 52 Q24 84 60 84 Q96 84 96 52 Z" fill={`url(#${id}-bowl)`} />
      <ellipse cx="60" cy="53" rx="33" ry="6" fill={surface} />
      <ellipse cx="52" cy="52" rx="10" ry="2.2" fill={surfaceHi} />
      {v === 0 && (
        <path d="M56 55 Q62 58 70 55" fill="none" stroke="#fdf6ec" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      )}
      {v === 1 && (
        <g fill="#e8c795">
          <rect x="54" y="51" width="6" height="5" rx="1.5" transform="rotate(-10 57 53)" />
          <rect x="66" y="52.5" width="5.5" height="4.5" rx="1.5" transform="rotate(14 69 55)" />
        </g>
      )}
      <g fill={v === 0 ? '#4fae5c' : '#3d8c49'}>
        <ellipse cx="66" cy="51" rx="2" ry="1.2" transform="rotate(20 66 51)" />
        <ellipse cx="48" cy="54.5" rx="2" ry="1.2" transform="rotate(-15 48 54.5)" />
      </g>
      <path d="M31 60 Q34 74 46 80" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

/* Pan — v0 veggie stir-fry, v1 two fried eggs. */
function Pfanne({ id, v = 0, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-pan`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a5550" />
          <stop offset="1" stopColor="#3b3733" />
        </linearGradient>
      </defs>
      <ellipse cx="54" cy="100" rx="38" ry="6" fill="#000" opacity="0.08" />
      <g fill="none" stroke="#c9c2b8" strokeWidth="3.5" strokeLinecap="round" opacity="0.7">
        <path d="M42 30 Q38 38 42 46" />
        <path d="M58 24 Q54 34 58 44" />
      </g>
      <path d="M88 68 L112 58" stroke="#3b3733" strokeWidth="9" strokeLinecap="round" />
      <path d="M92 66.5 L108 60" stroke="#6b6257" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 62 Q16 90 54 90 Q92 90 92 62 Z" fill={`url(#${id}-pan)`} />
      <ellipse cx="54" cy="62" rx="36" ry="8" fill={v === 0 ? '#8a5a35' : '#f2e3c0'} />
      {v === 0 && (
        <>
          <path d="M30 60 Q36 54 42 60 Q36 64 30 60 Z" fill="#e6503f" />
          <path d="M56 56 Q63 51 69 57 Q62 62 56 56 Z" fill="#f2b136" />
          <circle cx="48" cy="63" r="4.5" fill="#7fb95a" />
          <circle cx="46.5" cy="61.5" r="1.8" fill="#a8d584" />
          <circle cx="74" cy="62" r="4" fill="#7fb95a" />
          <rect x="60" y="61" width="9" height="4" rx="2" fill="#f6dd8d" />
        </>
      )}
      {v === 1 && (
        <>
          <path d="M28 61 Q30 54 40 54 Q52 53 52 60 Q53 67 42 67 Q30 68 28 61 Z" fill="#fdfaf3" />
          <circle cx="40" cy="60" r="5.5" fill="#f2b136" />
          <circle cx="38" cy="58.5" r="1.8" fill="#f8d27a" />
          <path d="M58 60 Q59 53 70 53 Q81 53 82 59 Q83 66 71 66 Q59 66 58 60 Z" fill="#fdfaf3" />
          <circle cx="70" cy="59" r="5.5" fill="#f2b136" />
          <circle cx="68" cy="57.5" r="1.8" fill="#f8d27a" />
          <g fill="#5b5148">
            <circle cx="50" cy="63" r="1" />
            <circle cx="63" cy="56" r="1" />
          </g>
        </>
      )}
      <path d="M16 62 L92 62" stroke="#6b6257" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 70 Q30 82 42 86" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.2" />
    </svg>
  );
}

/* Pizza — v0 salami + basil, v1 verdure (mushrooms + olives + peppers). */
function Pizza({ id, v = 0, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <defs>
        <radialGradient id={`${id}-chz`} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#f9dd7b" />
          <stop offset="1" stopColor="#f0c455" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="104" rx="42" ry="6" fill="#000" opacity="0.08" />
      <g transform="translate(58 64)">
        <path d="M12.5 -40.8 A42.5 42.5 0 1 0 27 -31.5 Z" fill="#e2a854" />
        <path d="M10.6 -34.6 A36 36 0 1 0 22.9 -26.7 Z" fill={`url(#${id}-chz)`} />
        {v === 0 && (
          <>
            <circle cx="-14" cy="-14" r="7" fill="#d9534a" />
            <circle cx="-16" cy="-16" r="2.2" fill="#e8837c" />
            <circle cx="10" cy="14" r="7" fill="#d9534a" />
            <circle cx="8" cy="12" r="2.2" fill="#e8837c" />
            <circle cx="-18" cy="14" r="6" fill="#d9534a" />
            <circle cx="14" cy="-12" r="6" fill="#d9534a" />
            <path d="M-4 -4 Q2 -10 8 -5 Q3 1 -4 -4 Z" fill="#4fae5c" />
            <path d="M-8 22 Q-2 16 4 21 Q-1 27 -8 22 Z" fill="#4fae5c" />
          </>
        )}
        {v === 1 && (
          <>
            <g fill="#e8d7c0">
              <path d="M-16 -12 Q-16 -19 -10 -19 Q-4 -19 -4 -12 Q-4 -9 -10 -9 Q-16 -9 -16 -12 Z" />
              <path d="M8 8 Q8 1 14 1 Q20 1 20 8 Q20 11 14 11 Q8 11 8 8 Z" />
            </g>
            <g fill="#c9b394">
              <rect x="-12" y="-10" width="4" height="6" rx="1.5" />
              <rect x="12" y="10" width="4" height="6" rx="1.5" />
            </g>
            <g fill="#4a453f">
              <circle cx="14" cy="-14" r="3.4" />
              <circle cx="-18" cy="10" r="3.4" />
              <circle cx="-2" cy="20" r="3.2" />
            </g>
            <g fill="none" stroke="#7fb95a" strokeWidth="3.4" strokeLinecap="round">
              <path d="M-6 -2 A6 6 0 0 1 4 -6" />
              <path d="M-14 20 A6 6 0 0 1 -5 15" />
            </g>
          </>
        )}
      </g>
      <g transform="translate(97 20) rotate(38)">
        <path d="M0 36 L-12 4 A31 31 0 0 1 12 4 Z" fill="#e2a854" />
        <path d="M-1 29 L-9 7 A25 25 0 0 1 9 7 L1 29 Z" fill="#f0c455" />
        {v === 0 ? (
          <>
            <circle cx="0" cy="13" r="4.5" fill="#d9534a" />
            <circle cx="-1.5" cy="11.5" r="1.5" fill="#e8837c" />
          </>
        ) : (
          <circle cx="0" cy="13" r="3.4" fill="#4a453f" />
        )}
      </g>
    </svg>
  );
}

/* Salad — v0 garden greens (sage bowl), v1 feta & radish (cream bowl). */
function Salat({ id, v = 0, ...svg }: SvgProps) {
  const bowlCol = [
    ['#a8bf9c', '#7f9c73'],
    ['#e8b568', '#c9924a'],
  ][v] ?? ['#a8bf9c', '#7f9c73'];
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-bowl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bowlCol[0]} />
          <stop offset="1" stopColor={bowlCol[1]} />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="104" rx="36" ry="6" fill="#000" opacity="0.08" />
      <g fill="#7fb95a">
        <path d="M32 56 Q28 40 40 34 Q46 44 40 56 Z" />
        <path d="M78 56 Q84 38 74 30 Q66 40 70 55 Z" />
        <path d="M52 52 Q50 34 62 28 Q68 40 60 52 Z" />
      </g>
      <g fill="#a8d584">
        <path d="M44 54 Q40 42 48 36 Q54 44 50 54 Z" />
        <path d="M64 52 Q66 40 76 40 Q76 50 68 55 Z" />
      </g>
      {v === 0 && (
        <>
          <circle cx="42" cy="56" r="6" fill="#e6503f" />
          <circle cx="40" cy="54" r="1.8" fill="#f28a76" />
          <g transform="translate(66 57)">
            <circle r="6.5" fill="#bfe098" />
            <circle r="4.5" fill="#e4f4cd" />
          </g>
        </>
      )}
      {v === 1 && (
        <>
          <g fill="#fdfaf3">
            <rect x="38" y="50" width="9" height="8" rx="2" transform="rotate(-10 42 54)" />
            <rect x="62" y="52" width="8" height="7" rx="2" transform="rotate(12 66 55)" />
          </g>
          <g transform="translate(50 57)">
            <circle r="5.5" fill="#e88ba1" />
            <circle r="3.6" fill="#fdf0f3" />
          </g>
          <g transform="translate(74 54)">
            <circle r="4.5" fill="#e88ba1" />
            <circle r="2.9" fill="#fdf0f3" />
          </g>
        </>
      )}
      <path d="M24 58 Q24 92 60 92 Q96 92 96 58 Z" fill={`url(#${id}-bowl)`} />
      <path d="M24 58 L96 58" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <path d="M31 66 Q35 80 48 86" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

/* Burger: stacked layers with sesame bun. */
function Burger({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-bun`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0b96a" />
          <stop offset="1" stopColor="#dd9c4a" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="105" rx="36" ry="6" fill="#000" opacity="0.08" />
      {/* top bun */}
      <path d="M26 56 Q26 26 60 26 Q94 26 94 56 Z" fill={`url(#${id}-bun)`} />
      <g fill="#fdf3df">
        <ellipse cx="46" cy="38" rx="2.6" ry="1.7" transform="rotate(-14 46 38)" />
        <ellipse cx="62" cy="33" rx="2.6" ry="1.7" transform="rotate(10 62 33)" />
        <ellipse cx="76" cy="41" rx="2.6" ry="1.7" transform="rotate(18 76 41)" />
        <ellipse cx="58" cy="46" rx="2.6" ry="1.7" transform="rotate(-8 58 46)" />
      </g>
      {/* lettuce ruffle */}
      <path d="M24 58 Q30 52 36 58 Q42 52 48 58 Q54 52 60 58 Q66 52 72 58 Q78 52 84 58 Q90 52 96 58 L94 64 L26 64 Z" fill="#7fb95a" />
      {/* cheese */}
      <path d="M28 64 L92 64 L86 72 L74 64.5 L60 73 L46 64.5 L34 72 Z" fill="#f2b136" />
      {/* patty */}
      <rect x="27" y="68" width="66" height="13" rx="6.5" fill="#8a5230" />
      {/* tomato */}
      <rect x="31" y="81" width="58" height="6" rx="3" fill="#e6503f" />
      {/* bottom bun */}
      <path d="M28 87 L92 87 Q94 87 94 90 Q94 100 84 100 L36 100 Q26 100 26 90 Q26 87 28 87 Z" fill="#dd9c4a" />
      {/* bun shine */}
      <path d="M36 34 Q44 28 54 28" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

/* Fish — v0 fillet + lemon + dill, v1 whole grilled fish. */
function Fisch({ id, v = 0, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-plate`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ece7e0" />
        </linearGradient>
        <linearGradient id={`${id}-fil`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f79a6b" />
          <stop offset="1" stopColor="#e97b48" />
        </linearGradient>
        <linearGradient id={`${id}-whole`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9fb6c9" />
          <stop offset="1" stopColor="#6d8aa3" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="102" rx="40" ry="6" fill="#000" opacity="0.08" />
      <ellipse cx="60" cy="78" rx="46" ry="21" fill={`url(#${id}-plate)`} />
      <ellipse cx="60" cy="76" rx="36" ry="15.5" fill="#f7f3ec" />
      {v === 0 && (
        <>
          <path d="M32 74 Q34 60 52 58 Q78 55 86 66 Q90 72 84 78 Q68 86 44 82 Q33 80 32 74 Z" fill={`url(#${id}-fil)`} />
          <g fill="none" stroke="#fbd0b4" strokeWidth="3" strokeLinecap="round" opacity="0.9">
            <path d="M46 62 Q44 70 48 78" />
            <path d="M60 60 Q58 69 62 79" />
            <path d="M74 61 Q72 68 76 75" />
          </g>
          <g transform="translate(84 82)">
            <path d="M-10 0 A10 10 0 0 1 10 0 Z" fill="#f6d044" />
            <path d="M-7.5 -0.5 A7.5 7.5 0 0 1 7.5 -0.5 Z" fill="#fdf0b1" />
          </g>
          <g fill="none" stroke="#4fae5c" strokeWidth="2.5" strokeLinecap="round">
            <path d="M40 56 Q38 50 42 46 M40 56 Q44 52 44 48 M40 56 Q36 53 35 49" />
          </g>
        </>
      )}
      {v === 1 && (
        <>
          <path d="M28 72 Q40 58 62 60 Q78 61 84 70 Q78 79 62 80 Q40 82 28 72 Z" fill={`url(#${id}-whole)`} />
          <path d="M84 70 L96 62 Q94 70 96 78 Z" fill="#6d8aa3" />
          <path d="M50 60.5 Q46 66 50 72 Q47 76 44 79" fill="none" stroke="#54728c" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
          <g stroke="#54728c" strokeWidth="3" strokeLinecap="round" opacity="0.75">
            <line x1="58" y1="62" x2="56" y2="78" />
            <line x1="68" y1="62" x2="66" y2="78" />
          </g>
          <circle cx="38" cy="68" r="2" fill="#2f3f4d" />
          <g transform="translate(80 84)">
            <circle r="7.5" fill="#f6d044" />
            <circle r="5.6" fill="#fdf0b1" />
            <g stroke="#f2da7a" strokeWidth="1.4">
              <line x1="0" y1="-4.5" x2="0" y2="4.5" />
              <line x1="-4.5" y1="0" x2="4.5" y2="0" />
            </g>
          </g>
          <g fill="none" stroke="#4fae5c" strokeWidth="2.5" strokeLinecap="round">
            <path d="M36 84 Q34 80 37 77" />
          </g>
        </>
      )}
    </svg>
  );
}

/* Meat — v0 seared steak on a board, v1 schnitzel + lemon on a plate. */
function Steak({ id, v = 0, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-meat`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8532f" />
          <stop offset="1" stopColor="#7e3a20" />
        </linearGradient>
        <linearGradient id={`${id}-bread`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eab765" />
          <stop offset="1" stopColor="#d1943e" />
        </linearGradient>
        <linearGradient id={`${id}-plate`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ece7e0" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="102" rx="42" ry="6" fill="#000" opacity="0.08" />
      {v === 0 && (
        <>
          <ellipse cx="60" cy="78" rx="46" ry="20" fill="#a9713a" />
          <ellipse cx="60" cy="76.5" rx="41" ry="16.5" fill="#c08a4b" />
          <path d="M26 74 Q60 80 94 74" fill="none" stroke="#a9713a" strokeWidth="1.6" opacity="0.7" />
          <path d="M27 68 Q26 56 42 53 Q62 49 80 54 Q94 58 92 68 Q90 78 72 81 Q46 84 32 77 Q27 74 27 68 Z" fill={`url(#${id}-meat)`} />
          <path d="M32 60 Q42 53 62 51 Q76 50 85 56" fill="none" stroke="#f2d3ad" strokeWidth="4.5" strokeLinecap="round" />
          <g stroke="#511f0e" strokeWidth="4" strokeLinecap="round" opacity="0.9">
            <line x1="42" y1="57" x2="36" y2="75" />
            <line x1="58" y1="55" x2="52" y2="79" />
            <line x1="74" y1="56" x2="68" y2="78" />
            <line x1="86" y1="61" x2="82" y2="74" />
          </g>
          <g transform="translate(96 60) rotate(-30)">
            <line x1="0" y1="0" x2="0" y2="24" stroke="#3d8c49" strokeWidth="3" strokeLinecap="round" />
            <g stroke="#4fae5c" strokeWidth="2.5" strokeLinecap="round">
              <line x1="0" y1="5" x2="-6" y2="1" /><line x1="0" y1="5" x2="6" y2="1" />
              <line x1="0" y1="12" x2="-6" y2="8" /><line x1="0" y1="12" x2="6" y2="8" />
              <line x1="0" y1="19" x2="-6" y2="15" /><line x1="0" y1="19" x2="6" y2="15" />
            </g>
          </g>
        </>
      )}
      {v === 1 && (
        <>
          <ellipse cx="60" cy="78" rx="46" ry="21" fill={`url(#${id}-plate)`} />
          <ellipse cx="60" cy="76" rx="36" ry="15.5" fill="#f7f3ec" />
          <path d="M30 72 Q30 58 46 56 Q66 52 80 60 Q88 65 84 73 Q78 82 58 82 Q36 82 30 72 Z" fill={`url(#${id}-bread)`} />
          <g fill="#c98a33" opacity="0.85">
            <circle cx="44" cy="64" r="1.6" />
            <circle cx="56" cy="60" r="1.6" />
            <circle cx="68" cy="64" r="1.6" />
            <circle cx="50" cy="72" r="1.6" />
            <circle cx="64" cy="74" r="1.6" />
            <circle cx="74" cy="69" r="1.6" />
          </g>
          <path d="M36 64 Q46 57 62 56" fill="none" stroke="#f5d489" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />
          <g transform="translate(84 82)">
            <path d="M-10 0 A10 10 0 0 1 10 0 Z" fill="#f6d044" />
            <path d="M-7.5 -0.5 A7.5 7.5 0 0 1 7.5 -0.5 Z" fill="#fdf0b1" />
          </g>
          <g fill="#4fae5c">
            <ellipse cx="38" cy="84" rx="4" ry="2.4" transform="rotate(-16 38 84)" />
          </g>
        </>
      )}
    </svg>
  );
}

/* Dessert — v0 pink layer cake + cherry, v1 chocolate cake + strawberry. */
function Dessert({ id, v = 0, ...svg }: SvgProps) {
  const frost = [
    ['#ffb3c1', '#f27f9b'],
    ['#8a5a3c', '#5b3521'],
  ][v] ?? ['#ffb3c1', '#f27f9b'];
  const sponge = ['#f5d9a8', '#6e4526'][v] ?? '#f5d9a8';
  const layer = ['#fdf3df', '#8a5a3c'][v] ?? '#fdf3df';
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-frost`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={frost[0]} />
          <stop offset="1" stopColor={frost[1]} />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="104" rx="34" ry="5.5" fill="#000" opacity="0.08" />
      <ellipse cx="60" cy="94" rx="40" ry="9" fill="#f2ede5" />
      <path d="M36 92 L36 54 Q60 40 84 54 L84 92 Z" fill={sponge} />
      <rect x="36" y="66" width="48" height="7" fill={layer} />
      <rect x="36" y="79" width="48" height="7" fill={layer} />
      <path d="M34 56 Q60 41 86 56 L86 60 Q80 66 76 59 Q70 68 64 60 Q58 69 51 61 Q45 67 40 60 Q37 62 34 60 Z" fill={`url(#${id}-frost)`} />
      {v === 0 && (
        <>
          <circle cx="60" cy="42" r="6" fill="#d6334f" />
          <circle cx="57.8" cy="39.8" r="2" fill="#ef7a8d" />
          <path d="M60 36 Q62 30 68 28" fill="none" stroke="#3d8c49" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}
      {v === 1 && (
        <g transform="translate(60 40)">
          <path d="M-6.5 -2 Q0 -8 6.5 -2 Q6 8 0 10 Q-6 8 -6.5 -2 Z" fill="#e6503f" />
          <g fill="#f8d7a8">
            <circle cx="-2.5" cy="1" r="0.9" />
            <circle cx="2.5" cy="0" r="0.9" />
            <circle cx="0" cy="5" r="0.9" />
          </g>
          <path d="M-4 -4 Q0 -8 4 -4 L0 -2 Z" fill="#4fae5c" />
        </g>
      )}
      <path d="M40 62 L40 88" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity={v === 0 ? 0.45 : 0.25} />
    </svg>
  );
}

/* Two tacos with lettuce, tomato + cheese, lime wedge. */
function Taco({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-shell`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4cd76" />
          <stop offset="1" stopColor="#e3ab4e" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="102" rx="40" ry="6" fill="#000" opacity="0.08" />
      {/* back taco */}
      <g transform="translate(76 60) rotate(8)">
        <path d="M-26 26 A26 26 0 0 1 26 26 Z" fill="#d99b43" />
        <path d="M-22 24 Q-16 12 -6 16 Q-2 8 6 14 Q14 8 20 18 L22 24 Z" fill="#7fb95a" />
      </g>
      {/* front taco */}
      <g transform="translate(46 64) rotate(-6)">
        <path d="M-28 28 A28 28 0 0 1 28 28 Z" fill={`url(#${id}-shell)`} />
        {/* filling above the shell edge */}
        <path d="M-24 26 Q-18 12 -8 17 Q-4 8 4 14 Q12 7 18 16 Q22 20 24 26 Z" fill="#7fb95a" />
        <circle cx="-10" cy="20" r="3.4" fill="#e6503f" />
        <circle cx="6" cy="17" r="3.4" fill="#e6503f" />
        <path d="M-4 22 L2 26 M10 20 L15 25" stroke="#f2b136" strokeWidth="2.5" strokeLinecap="round" />
        {/* shell shine */}
        <path d="M-20 27 A22 22 0 0 1 -6 8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
      </g>
      {/* lime wedge */}
      <g transform="translate(98 88) rotate(12)">
        <path d="M-9 0 A9 9 0 0 1 9 0 Z" fill="#7ed26a" />
        <path d="M-6.5 -0.5 A6.5 6.5 0 0 1 6.5 -0.5 Z" fill="#c9ef9a" />
      </g>
    </svg>
  );
}

/* Casserole dish: terracotta oval, golden gratin top, steam. */
function Auflauf({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-dish`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d97a5a" />
          <stop offset="1" stopColor="#b25a3e" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="102" rx="42" ry="6" fill="#000" opacity="0.08" />
      {/* steam */}
      <g fill="none" stroke="#c9c2b8" strokeWidth="3.5" strokeLinecap="round" opacity="0.7">
        <path d="M48 26 Q44 34 48 42" />
        <path d="M66 20 Q62 30 66 40" />
      </g>
      {/* handles */}
      <ellipse cx="19" cy="66" rx="7" ry="5" fill="#b25a3e" />
      <ellipse cx="101" cy="66" rx="7" ry="5" fill="#b25a3e" />
      {/* dish body */}
      <path d="M20 58 Q20 92 60 92 Q100 92 100 58 Z" fill={`url(#${id}-dish)`} />
      {/* gratin top */}
      <ellipse cx="60" cy="58" rx="38" ry="8" fill="#f0c05a" />
      {/* toasted patches */}
      <ellipse cx="46" cy="57" rx="7" ry="3" fill="#d99b3a" />
      <ellipse cx="70" cy="59" rx="8" ry="3.2" fill="#d99b3a" />
      <ellipse cx="58" cy="55" rx="4" ry="2" fill="#c08430" />
      {/* cheese bubbles */}
      <circle cx="36" cy="59" r="1.8" fill="#f7d98c" />
      <circle cx="82" cy="56" r="1.8" fill="#f7d98c" />
      {/* dish shine */}
      <path d="M27 66 Q31 80 44 86" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

/* Pancake stack: syrup drip, butter, berries. */
function Pancakes({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-syr`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d98e3f" />
          <stop offset="1" stopColor="#bd7226" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="103" rx="38" ry="6" fill="#000" opacity="0.08" />
      {/* plate */}
      <ellipse cx="60" cy="94" rx="42" ry="9" fill="#f2ede5" />
      {/* pancakes: three stacked */}
      <g>
        <path d="M26 84 Q26 78 32 77 L88 77 Q94 78 94 84 Q94 90 88 91 L32 91 Q26 90 26 84 Z" fill="#e0a45c" />
        <path d="M28 72 Q28 66 34 65 L86 65 Q92 66 92 72 Q92 78 86 79 L34 79 Q28 78 28 72 Z" fill="#e8b568" />
        <path d="M30 60 Q30 54 36 53 L84 53 Q90 54 90 60 Q90 66 84 67 L36 67 Q30 66 30 60 Z" fill="#efc077" />
      </g>
      {/* syrup over the top edge */}
      <path d="M31 56 Q60 46 89 56 L89 60 Q84 67 79 59 Q74 68 68 60 Q62 70 55 61 Q49 68 43 60 Q38 65 34 59 Q32 60 31 59 Z" fill={`url(#${id}-syr)`} />
      {/* butter */}
      <rect x="53" y="45" width="14" height="9" rx="2.5" fill="#f6dd8d" />
      <rect x="53" y="45" width="14" height="3.5" rx="1.75" fill="#fbeeb9" />
      {/* berries */}
      <circle cx="40" cy="49" r="4" fill="#d6334f" />
      <circle cx="38.6" cy="47.6" r="1.4" fill="#ef7a8d" />
      <circle cx="80" cy="48" r="3.6" fill="#5c5d9e" />
      <circle cx="78.8" cy="46.8" r="1.2" fill="#8f90c9" />
    </svg>
  );
}

/* Sandwich: two triangle halves, visible filling at the cut. */
function Sandwich({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <defs>
        <linearGradient id={`${id}-crust`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eab86e" />
          <stop offset="1" stopColor="#d69a4c" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="103" rx="40" ry="6" fill="#000" opacity="0.08" />
      {/* back half: standing triangle, thick crust */}
      <g transform="translate(76 34)">
        <path d="M-3 0 Q0 -4 3 0 L28 56 Q30 62 24 62 L-24 62 Q-30 62 -28 56 Z" fill={`url(#${id}-crust)`} />
        <path d="M0 14 L17 55 L-17 55 Z" fill="#fdf3df" />
        <path d="M-14 55 L14 55 L11 49 L-11 49 Z" fill="#7fb95a" />
      </g>
      {/* front half: lying flat, layered side view */}
      <g transform="translate(44 70) rotate(-3)">
        <rect x="-28" y="0" width="56" height="8" rx="4" fill={`url(#${id}-crust)`} />
        <path d="M-26 8 Q-30 12 -24 13 L24 13 Q30 12 26 8 Z" fill="#7fb95a" />
        <rect x="-25" y="13" width="50" height="5" rx="2.5" fill="#f2b136" />
        <rect x="-26" y="18" width="52" height="5" rx="2.5" fill="#e6503f" />
        <rect x="-28" y="23" width="56" height="8" rx="4" fill="#d69a4c" />
        {/* crust shine */}
        <path d="M-22 3.5 L18 3.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      </g>
    </svg>
  );
}
