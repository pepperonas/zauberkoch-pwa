/** Curated flat-vector card motifs for dishes & drinks (no AI images).
 * Style: Google Material flat illustration (~2016) — pure geometric fills,
 * NO outlines/strokes-as-contours, NO gloss/highlights, subtle linear
 * gradients inside color fields, semi-transparent overlays for glass/ice/
 * steam, whole object rotated 6-8°, 4-6 muted-saturated colors, flat
 * (blur-free) ground shadow. Spec + generator prompt:
 * .claude/skills/recipe-motifs/ */

import { useId } from 'react';

import type { Modus } from '../../lib/types';

export type Motif =
  | 'highball' | 'tumbler' | 'coupe' | 'tiki' | 'martini' | 'wine' | 'flute' | 'mule'
  | 'shot' | 'mug' | 'beer' | 'margarita' | 'punch'
  | 'pasta' | 'bowl' | 'suppe' | 'pfanne' | 'pizza' | 'salat' | 'burger' | 'fisch'
  | 'steak' | 'dessert' | 'taco' | 'auflauf' | 'pancakes' | 'sandwich'
  | 'sushi' | 'kuchen' | 'eis' | 'spiess' | 'dumpling' | 'wrap' | 'brot';

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
      if (/margarita/.test(s)) return 'margarita';
      if (/bowle|punsch|\bpunch\b|feuerzangen/.test(s)) return 'punch';
      if (/\bshot\b|shooter|kurzer|pinnchen|stamperl|b-?52|kamikaze/.test(s)) return 'shot';
      if (/heiß|hot toddy|\btoddy\b|grog|irish coffee|kakao|heiße schoko/.test(s)) return 'mug';
      if (/bier|beer|radler|michelada|weizen|weißbier|\bpils\b|helles|lager|\bale\b|\bipa\b|humpen|\bpint\b/.test(s)) return 'beer';
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
  if (/sushi|nigiri|maki|sashimi|temaki|california roll|inside.?out/.test(hay)) return 'sushi';
  if (/burger/.test(hay)) return 'burger';
  if (/pizza|flammkuchen|galette/.test(hay)) return 'pizza';
  if (/wrap|burrito|dürüm|durum|döner|shawarma|gyros/.test(hay)) return 'wrap';
  if (/taco|quesadilla|fajita|enchilada|nachos/.test(hay)) return 'taco';
  if (/gyoza|dumpling|dim ?sum|wonton|teigtasche|maultasche|pierogi|jiaozi|momo|potsticker/.test(hay)) return 'dumpling';
  if (/sandwich|toast|stulle|bagel|panini|croque/.test(hay)) return 'sandwich';
  if (/ramen|udon|soba|pho|suppe|eintopf|chowder|brühe|minestrone|gulasch/.test(hay)) return 'suppe';
  if (/lasagne|auflauf|gratin|moussaka|casserole|überbacken|parmigiana/.test(hay)) return 'auflauf';
  if (/pasta|spaghetti|tagliatelle|linguine|penne|nudel|gnocchi|carbonara|orecchiette/.test(hay)) return 'pasta';
  if (/bowl|poke|buddha|curry|risotto|porridge|dal/.test(hay)) return 'bowl';
  if (/kuchen|torte|tarte|cheesecake|cupcake|muffin|gugelhupf|streusel|gâteau|gateau/.test(hay)) return 'kuchen';
  if (/eisbecher|eiscreme|eiscrème|softeis|gelato|sorbet|sundae|parfait|\beis\b/.test(hay)) return 'eis';
  if (/dessert|nachtisch|tiramisu|mousse|pudding|brownie|crumble|panna cotta|crème|flan/.test(hay)) return 'dessert';
  if (/salat|caesar|caprese|tabouleh|slaw/.test(hay)) return 'salat';
  if (/spieß|spiess|skewer|kebab|kebap|satay|saté|yakitori|brochette|souvlaki|schaschlik/.test(hay)) return 'spiess';
  if (/fisch|lachs|forelle|dorade|thunfisch|garnele|gamba|shrimp|scampi|muschel|kabeljau|zander|pulpo|oktopus|tintenfisch/.test(hay)) return 'fisch';
  if (/steak|braten|filet|kotelett|schnitzel|rind|lamm|entrecôte|ribs|grill|bbq|hähnchen|fleisch|frikadelle|köfte/.test(hay)) return 'steak';
  if (/pfanne|wok|stir|geschnetzelt|shakshuka|rührei/.test(hay)) return 'pfanne';
  if (/brot|baguette|focaccia|ciabatta|sauerteig|laib|brötchen|semmel|brioche/.test(hay)) return 'brot';
  return 'bowl'; // bowls, curry, reis, risotto + default
}

/** Variant counts per motif — deterministic per-recipe variety so two pasta
 * dishes don't share one plate. MUST stay in sync with backend
 * og_image.MOTIF_VARIANTS (the OG renderer picks the same art). */
export const MOTIF_VARIANTS: Record<Motif, number> = {
  highball: 3, tumbler: 3, coupe: 3, tiki: 1, martini: 2, wine: 2, flute: 1, mule: 1,
  shot: 2, mug: 2, beer: 1, margarita: 1, punch: 1,
  pasta: 3, bowl: 3, suppe: 2, pfanne: 2, pizza: 2, salat: 2, burger: 1, fisch: 2,
  steak: 2, dessert: 2, taco: 1, auflauf: 1, pancakes: 1, sandwich: 1,
  sushi: 2, kuchen: 2, eis: 1, spiess: 2, dumpling: 1, wrap: 1, brot: 1,
};

/** Per-motif fill normalization (opt-in via `fit`). Each motif's art fills the
 * shared 120×120 viewBox very unevenly — a flat `spiess` skewer covers ~21
 * units, `fisch`/`tiki` overflow past 114 — so at a small fixed size the icons
 * read as wildly different sizes. These factors (scale about the box centre)
 * bring every motif's largest dimension to roughly the same fraction of the
 * frame. Derived from `npm run measure:motifs` (subject bbox, ground excluded)
 * as clamp(96 / max(w,h), 0.8, 1.38). Only used for compact leading tiles
 * (planner picker, plan-day rows); the big card/hero motifs render unscaled. */
export const MOTIF_FIT: Record<Motif, number> = {
  highball: 0.89, tumbler: 0.96, coupe: 1.01, tiki: 0.83, martini: 1.1, wine: 1.01,
  flute: 1.1, mule: 0.86, shot: 0.96, mug: 0.96, beer: 1.25, margarita: 0.86, punch: 1.32,
  pasta: 1.07, bowl: 1.07, suppe: 1.12, pfanne: 0.98, pizza: 1.17, salat: 0.96,
  burger: 1.35, fisch: 0.84, steak: 0.84, dessert: 1.07, taco: 1.38, auflauf: 1.03,
  pancakes: 1.2, sandwich: 1.38, sushi: 0.87, kuchen: 1.38, eis: 1.17, spiess: 1.12,
  dumpling: 0.85, wrap: 0.87, brot: 1.2,
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
  pasta: [[/pesto/, 1], [/carbonara|rahm|sahne|käse|vongole|aglio/, 2], [/pomodoro|tomate|arrabbiata|bolognese|napoli/, 0]],
  bowl: [[/curry|dal|masala|tikka/, 1], [/poke|lachs|thunfisch/, 0], [/buddha|falafel|kichererbse|veggie|gemüse/, 2]],
  tumbler: [[/negroni|americano|sour/, 2], [/cola|cuba libre|libre/, 1], [/whisk|old fashioned/, 0]],
  coupe: [[/espresso|kaffee/, 1], [/gimlet|basil|grün|matcha|sour|fizz/, 2], [/daiquiri|clover|cosmo/, 0]],
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
  shot: [[/b-?52|layer|schicht|rainbow|regenbogen/, 1]],
  mug: [[/irish|coffee|kaffee|latte|cappuc|kakao|schoko/, 1]],
  sushi: [[/maki|roll|california|inside/, 1], [/nigiri|sashimi/, 0]],
  kuchen: [[/torte|tarte|gâteau|gateau|tartelette/, 1]],
  spiess: [[/garnele|shrimp|scampi|gamba|lachs|fisch|meeres/, 1]],
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
  /** Normalize the art to a uniform fill (see MOTIF_FIT). For compact leading
   * tiles where inconsistent per-motif fill would read as "different sizes". */
  fit?: boolean;
  /** Passthrough — e.g. `viewTransitionName` for shared-element morphs. */
  style?: React.CSSProperties;
}

export function RecipeMotif({ motif, seed = '', size = 84, className = '', fit = false, style }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const v = variantForMotif(motif, seed);
  const scale = fit ? MOTIF_FIT[motif] ?? 1 : 1;
  const fitStyle: React.CSSProperties | undefined =
    scale !== 1
      ? { ...style, transform: `${style?.transform ? `${style.transform} ` : ''}scale(${scale})` }
      : style;
  const common = { width: size, height: size, viewBox: '0 0 120 120', className, style: fitStyle, 'aria-hidden': true as const };
  const MAP: Record<Motif, (p: SvgProps) => React.JSX.Element> = {
    highball: Highball, tumbler: Tumbler, coupe: Coupe, tiki: Tiki, martini: Martini,
    wine: Wine, flute: Flute, mule: Mule, shot: Shot, mug: Mug, beer: Beer,
    margarita: Margarita, punch: Punch, pasta: Pasta, bowl: Bowl, suppe: Suppe,
    pfanne: Pfanne, pizza: Pizza, salat: Salat, burger: Burger, fisch: Fisch,
    steak: Steak, dessert: Dessert, taco: Taco, auflauf: Auflauf, pancakes: Pancakes,
    sandwich: Sandwich, sushi: Sushi, kuchen: Kuchen, eis: Eis, spiess: Spiess,
    dumpling: Dumpling, wrap: Wrap, brot: Brot,
  };
  const Cmp = MAP[motif] ?? Tumbler;
  return <Cmp id={id} v={v} {...common} />;
}

type SvgProps = React.SVGProps<SVGSVGElement> & { id: string; v?: number };

/* Flat ground shadow — blur-free ellipse, stays horizontal (outside the tilt). */
function Ground({ rx = 30 }: { rx?: number }) {
  return <ellipse cx="60" cy="106" rx={rx} ry="4.5" fill="#263238" opacity="0.08" />;
}

/* Longdrink — v0 sunny, v1 sunrise, v2 mojito. */
function Highball({ id, v = 0, ...svg }: SvgProps) {
  const liq = [
    ['#f9a825', '#fdd835'],
    ['#e53935', '#fb8c00'],
    ['#8bc34a', '#dcedc8'],
  ][v] ?? ['#f9a825', '#fdd835'];
  const straw = ['#43a047', '#e53935', '#eceff1'][v] ?? '#43a047';
  return (
    <svg {...svg}>
      <Ground rx={26} />
      <g transform="rotate(7 60 62)">
        <defs>
          <linearGradient id={`${id}-l`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={liq[0]} />
            <stop offset="1" stopColor={liq[1]} />
          </linearGradient>
        </defs>
        <rect x="63" y="8" width="6" height="46" rx="1" transform="rotate(12 66 31)" fill={straw} />
        <rect x="63" y="8" width="6" height="13" rx="1" transform="rotate(12 66 31)" fill="#263238" opacity="0.15" />
        <path d="M42 24 L46 100 Q46 103 50 103 L70 103 Q74 103 74 100 L78 24 Z" fill="#90a4ae" opacity="0.35" />
        <path d="M44.5 38 L48 98 Q48.2 100.5 51 100.5 L69 100.5 Q71.8 100.5 72 98 L75.5 38 Z" fill={`url(#${id}-l)`} opacity="0.9" />
        <rect x="50" y="46" width="14" height="14" rx="2" transform="rotate(-10 57 53)" fill="#ffffff" opacity="0.4" />
        <rect x="55" y="70" width="13" height="13" rx="2" transform="rotate(8 61 76)" fill="#ffffff" opacity="0.35" />
        {v === 0 && (
          <g transform="translate(79 27)">
            <circle r="11" fill="#7cb342" />
            <circle r="8.2" fill="#dcedc8" />
            <rect x="-1" y="-8" width="2" height="16" fill="#7cb342" opacity="0.55" />
            <rect x="-8" y="-1" width="16" height="2" fill="#7cb342" opacity="0.55" />
          </g>
        )}
        {v === 1 && (
          <g transform="translate(79 26)">
            <path d="M-11 0 A11 11 0 0 1 11 0 Z" fill="#fb8c00" />
            <path d="M-8 0 A8 8 0 0 1 8 0 Z" fill="#ffe0b2" />
          </g>
        )}
        {v === 2 && (
          <g fill="#66bb6a">
            <path d="M52 22 Q47 12 53 5 Q58 12 55 22 Z" />
            <path d="M59 23 Q61 12 69 9 Q67 19 61 24 Z" />
          </g>
        )}
      </g>
    </svg>
  );
}

/* Tumbler — v0 whiskey, v1 cola, v2 negroni. */
function Tumbler({ id, v = 0, ...svg }: SvgProps) {
  const liq = [
    ['#c77c1a', '#e8a33d'],
    ['#3e2723', '#6d4c41'],
    ['#d84315', '#f4511e'],
  ][v] ?? ['#c77c1a', '#e8a33d'];
  return (
    <svg {...svg}>
      <Ground rx={28} />
      <g transform="rotate(-6 60 70)">
        <defs>
          <linearGradient id={`${id}-l`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={liq[0]} />
            <stop offset="1" stopColor={liq[1]} />
          </linearGradient>
        </defs>
        {v === 1 && <rect x="62" y="16" width="6" height="40" rx="1" transform="rotate(10 65 36)" fill="#e53935" />}
        <path d="M34 44 L38 99 Q38.3 102 42 102 L78 102 Q81.7 102 82 99 L86 44 Z" fill="#90a4ae" opacity="0.35" />
        <path d="M36.6 58 L40 97 Q40.2 99.5 43 99.5 L77 99.5 Q79.8 99.5 80 97 L83.4 58 Z" fill={`url(#${id}-l)`} opacity="0.92" />
        {v === 2 && (
          <g transform="translate(68 76) rotate(-12)" opacity="0.85">
            <path d="M-10 0 A10 10 0 0 1 10 0 Z" fill="#fb8c00" />
            <path d="M-7 0 A7 7 0 0 1 7 0 Z" fill="#ffe0b2" />
          </g>
        )}
        <rect x="48" y="60" width="20" height="20" rx="3" transform="rotate(-8 58 70)" fill="#ffffff" opacity="0.4" />
        {v === 0 && <path d="M80 40 Q90 34 88 24 Q82 22 78 28 Q76 35 80 40 Z" fill="#fb8c00" />}
        {v === 1 && (
          <g transform="translate(37 42) rotate(-20)">
            <path d="M-9 0 A9 9 0 0 1 9 0 Z" fill="#7cb342" />
            <path d="M-6.4 0 A6.4 6.4 0 0 1 6.4 0 Z" fill="#dcedc8" />
          </g>
        )}
        {v === 2 && (
          <g transform="translate(82 39) rotate(22)">
            <path d="M-10 0 A10 10 0 0 1 10 0 Z" fill="#fb8c00" />
            <path d="M-7 0 A7 7 0 0 1 7 0 Z" fill="#ffe0b2" />
          </g>
        )}
      </g>
    </svg>
  );
}

/* Coupe — v0 rosé, v1 espresso, v2 gimlet. */
function Coupe({ id, v = 0, ...svg }: SvgProps) {
  const liq = [
    ['#c2185b', '#ec407a'],
    ['#3e2723', '#6d4c41'],
    ['#9ccc65', '#dcedc8'],
  ][v] ?? ['#c2185b', '#ec407a'];
  return (
    <svg {...svg}>
      <Ground rx={24} />
      <g transform="rotate(6 60 62)">
        <defs>
          <linearGradient id={`${id}-l`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={liq[0]} />
            <stop offset="1" stopColor={liq[1]} />
          </linearGradient>
        </defs>
        <path d="M26 32 Q28 60 60 60 Q92 60 94 32 Z" fill="#90a4ae" opacity="0.35" />
        <path d="M30 37 Q33 56 60 56 Q87 56 90 37 Z" fill={`url(#${id}-l)`} opacity="0.9" />
        {v === 1 && (
          <g fill="#261612">
            <ellipse cx="53" cy="39" rx="3.4" ry="2.3" transform="rotate(-16 53 39)" />
            <ellipse cx="61" cy="40.5" rx="3.4" ry="2.3" transform="rotate(12 61 40.5)" />
            <ellipse cx="69" cy="38.5" rx="3.4" ry="2.3" transform="rotate(-6 69 38.5)" />
          </g>
        )}
        <rect x="57.5" y="60" width="5" height="34" fill="#90a4ae" opacity="0.45" />
        <path d="M42 100 Q42 95 60 95 Q78 95 78 100 L78 103 L42 103 Z" fill="#90a4ae" opacity="0.45" />
        {v === 0 && (
          <>
            <rect x="64" y="14" width="2.5" height="24" transform="rotate(20 65 26)" fill="#bcaaa4" />
            <circle cx="61" cy="30" r="6.5" fill="#c62828" />
          </>
        )}
        {v === 2 && (
          <g transform="translate(88 33) rotate(18)">
            <circle r="9.5" fill="#7cb342" />
            <circle r="7" fill="#dcedc8" />
            <rect x="-0.9" y="-6.8" width="1.8" height="13.6" fill="#7cb342" opacity="0.55" />
          </g>
        )}
      </g>
    </svg>
  );
}

/* Tiki mug. */
function Tiki({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={24} />
      <g transform="rotate(-7 60 66)">
        <defs>
          <linearGradient id={`${id}-m`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#8d4e2f" />
            <stop offset="1" stopColor="#bf6b3f" />
          </linearGradient>
        </defs>
        <g fill="#558b2f">
          <path d="M52 25 Q47 14 53 6 Q59 13 56 25 Z" />
          <path d="M60 26 Q62 13 71 10 Q69 21 62 27 Z" />
        </g>
        <g transform="translate(84 14) rotate(-16)">
          <rect x="-1.2" y="2" width="2.4" height="24" fill="#d7ccc8" />
          <path d="M-16 4 A16 16 0 0 1 16 4 Q12 8 8 4.5 Q4 8.5 0 5 Q-4 8.5 -8 4.5 Q-12 8 -16 4 Z" fill="#ef5350" />
        </g>
        <path d="M41 28 L45 100 Q45 103 49 103 L71 103 Q75 103 75 100 L79 28 Z" fill={`url(#${id}-m)`} />
        <rect x="42.5" y="38" width="35" height="4" fill="#6d3a20" />
        <path d="M50 52 L58 58 L50 60 Z M70 52 L62 58 L70 60 Z" fill="#6d3a20" />
        <path d="M49 72 L55 66 L61 72 L67 66 L72 71 L72 76 L49 76 Z" fill="#6d3a20" />
        <rect x="44" y="88" width="32" height="4" fill="#6d3a20" />
      </g>
    </svg>
  );
}

/* Martini — v0 olive, v1 twist. */
function Martini({ id, v = 0, ...svg }: SvgProps) {
  const liq = [
    ['#c0ca33', '#f0f4c3'],
    ['#fbc02d', '#fff59d'],
  ][v] ?? ['#c0ca33', '#f0f4c3'];
  return (
    <svg {...svg}>
      <Ground rx={24} />
      <g transform="rotate(6 60 62)">
        <defs>
          <linearGradient id={`${id}-l`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={liq[0]} />
            <stop offset="1" stopColor={liq[1]} />
          </linearGradient>
        </defs>
        <path d="M24 28 L96 28 L62 62 L58 62 Z" fill="#90a4ae" opacity="0.35" />
        <path d="M32 34 L88 34 L61 58 L59 58 Z" fill={`url(#${id}-l)`} opacity="0.85" />
        <rect x="57.5" y="62" width="5" height="32" fill="#90a4ae" opacity="0.45" />
        <path d="M42 99 Q42 94 60 94 Q78 94 78 99 L78 102 L42 102 Z" fill="#90a4ae" opacity="0.45" />
        {v === 0 && (
          <>
            <rect x="50" y="14" width="2.5" height="30" transform="rotate(-28 51 29)" fill="#bcaaa4" />
            <circle cx="58" cy="32" r="6" fill="#827717" />
            <circle cx="60" cy="32" r="2.2" fill="#d84315" />
          </>
        )}
        {v === 1 && (
          <path d="M74 16 Q84 18 84 28 Q84 37 74 37 Q68 37 68 31 L73 31 Q73 33 76 32.5 Q79 31 79 27 Q79 22 73 21 Z" fill="#fbc02d" />
        )}
      </g>
    </svg>
  );
}

/* Wine — v0 spritz, v1 red. */
function Wine({ id, v = 0, ...svg }: SvgProps) {
  const liq = [
    ['#ef6c00', '#ffb74d'],
    ['#6a1b2c', '#a03344'],
  ][v] ?? ['#ef6c00', '#ffb74d'];
  return (
    <svg {...svg}>
      <Ground rx={24} />
      <g transform="rotate(-6 60 62)">
        <defs>
          <linearGradient id={`${id}-l`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={liq[0]} />
            <stop offset="1" stopColor={liq[1]} />
          </linearGradient>
        </defs>
        <path d="M33 22 L87 22 Q89 56 60 60 Q31 56 33 22 Z" fill="#90a4ae" opacity="0.35" />
        <path d={v === 0 ? 'M35.4 32 L84.6 32 Q84 53 60 56.5 Q36 53 35.4 32 Z' : 'M34.5 40 L85.5 40 Q83 54 60 56.5 Q37 54 34.5 40 Z'} fill={`url(#${id}-l)`} opacity="0.92" />
        {v === 0 && <rect x="49" y="34" width="13" height="13" rx="2" transform="rotate(-9 55 40)" fill="#ffffff" opacity="0.4" />}
        <rect x="57.5" y="60" width="5" height="32" fill="#90a4ae" opacity="0.45" />
        <path d="M42 97 Q42 92 60 92 Q78 92 78 97 L78 100 L42 100 Z" fill="#90a4ae" opacity="0.45" />
        {v === 0 && (
          <g transform="translate(85 22)">
            <path d="M-10 0 A10 10 0 0 1 10 0 Z" fill="#fb8c00" />
            <path d="M-7 0 A7 7 0 0 1 7 0 Z" fill="#ffe0b2" />
          </g>
        )}
      </g>
    </svg>
  );
}

/* Flute. */
function Flute({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={20} />
      <g transform="rotate(6 60 62)">
        <defs>
          <linearGradient id={`${id}-l`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#f9a825" />
            <stop offset="1" stopColor="#fff59d" />
          </linearGradient>
        </defs>
        <path d="M48 16 L72 16 Q73 54 62 60 L58 60 Q47 54 48 16 Z" fill="#90a4ae" opacity="0.35" />
        <path d="M50 24 L70 24 Q70.5 51 61 57 L59 57 Q49.5 51 50 24 Z" fill={`url(#${id}-l)`} opacity="0.9" />
        <g fill="#ffffff" opacity="0.55">
          <circle cx="56" cy="48" r="1.6" />
          <circle cx="62" cy="40" r="1.9" />
          <circle cx="58" cy="31" r="1.5" />
          <circle cx="64" cy="27" r="1.3" />
        </g>
        <rect x="57.5" y="60" width="5" height="34" fill="#90a4ae" opacity="0.45" />
        <path d="M44 100 Q44 95 60 95 Q76 95 76 100 L76 103 L44 103 Z" fill="#90a4ae" opacity="0.45" />
      </g>
    </svg>
  );
}

/* Copper mule mug. */
function Mule({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={26} />
      <g transform="rotate(-6 60 66)">
        <defs>
          <linearGradient id={`${id}-c`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#a05a2c" />
            <stop offset="1" stopColor="#cd8f52" />
          </linearGradient>
        </defs>
        <g fill="#558b2f">
          <path d="M52 24 Q46 14 52 6 Q58 12 56 24 Z" />
          <path d="M60 24 Q62 12 72 10 Q70 20 62 26 Z" />
          <path d="M46 26 Q38 22 36 14 Q46 14 50 24 Z" />
        </g>
        <path d="M82 44 a17 17 0 0 1 0 34 l0 -7 a10 10 0 0 0 0 -20 Z" fill="#a05a2c" />
        <path d="M34 30 Q32 66 38 96 Q39 102 46 102 L70 102 Q77 102 78 96 Q84 66 82 30 Z" fill={`url(#${id}-c)`} />
        <rect x="33.5" y="30" width="49" height="5" fill="#8a4a22" />
        <g transform="translate(76 29) rotate(22)">
          <path d="M-9 0 A9 9 0 0 1 9 0 Z" fill="#7cb342" />
          <path d="M-6.4 0 A6.4 6.4 0 0 1 6.4 0 Z" fill="#dcedc8" />
        </g>
      </g>
    </svg>
  );
}

/* Pasta plate — v0 pomodoro, v1 pesto, v2 carbonara. */
function Pasta({ id, v = 0, ...svg }: SvgProps) {
  const strand = ['#fbc02d', '#9ccc65', '#f0e0b2'][v] ?? '#fbc02d';
  const strandDark = ['#f9a825', '#7cb342', '#dbc48e'][v] ?? '#f9a825';
  return (
    <svg {...svg}>
      <Ground rx={36} />
      <g transform="rotate(-5 60 78)">
        <defs>
          <linearGradient id={`${id}-p`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eceff1" />
            <stop offset="1" stopColor="#cfd8dc" />
          </linearGradient>
        </defs>
        <ellipse cx="60" cy="78" rx="45" ry="20" fill={`url(#${id}-p)`} />
        <ellipse cx="60" cy="76" rx="35" ry="14.5" fill="#fafafa" />
        <g fill="none" stroke={strand} strokeWidth="5" strokeLinecap="round">
          <path d="M35 74 Q46 57 62 63 Q79 68 83 76" />
          <path d="M39 80 Q52 63 69 67 Q81 70 84 79" />
          <path d="M43 84 Q51 72 63 71 Q76 70 79 83" />
        </g>
        <g fill="none" stroke={strandDark} strokeWidth="3" strokeLinecap="round">
          <path d="M45 76 Q56 64 70 68" />
          <path d="M50 82 Q60 72 73 74" />
        </g>
        {v === 0 && (
          <>
            <circle cx="47" cy="66" r="6" fill="#e53935" />
            <circle cx="75" cy="79" r="5" fill="#e53935" />
            <path d="M60 53 Q66 47 72 52 Q67 58 60 56 Z" fill="#66bb6a" />
            <path d="M58 53 Q52 46 45 51 Q50 58 58 56 Z" fill="#66bb6a" />
          </>
        )}
        {v === 1 && (
          <>
            <g fill="#f0e6c8">
              <ellipse cx="50" cy="66" rx="2.8" ry="1.9" transform="rotate(20 50 66)" />
              <ellipse cx="66" cy="74" rx="2.8" ry="1.9" transform="rotate(-14 66 74)" />
              <ellipse cx="73" cy="64" rx="2.8" ry="1.9" transform="rotate(28 73 64)" />
            </g>
            <path d="M56 53 Q62 47 68 52 Q63 58 56 56 Z" fill="#558b2f" />
          </>
        )}
        {v === 2 && (
          <>
            <g fill="#a1553a">
              <rect x="47" y="63" width="9" height="5" rx="1" transform="rotate(-12 51 65)" />
              <rect x="66" y="70" width="9" height="5" rx="1" transform="rotate(14 70 72)" />
              <rect x="56" y="77" width="8" height="4.5" rx="1" transform="rotate(-6 60 79)" />
            </g>
            <g fill="#455a64">
              <circle cx="53" cy="72" r="1.2" />
              <circle cx="64" cy="63" r="1.2" />
              <circle cx="72" cy="79" r="1.2" />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}

/* Bowl — v0 poke, v1 curry, v2 buddha. */
function Bowl({ id, v = 0, ...svg }: SvgProps) {
  const bowlCol = [
    ['#00697c', '#00838f'],
    ['#a04e31', '#bf6b3f'],
    ['#37474f', '#546e7a'],
  ][v] ?? ['#00697c', '#00838f'];
  return (
    <svg {...svg}>
      <Ground rx={30} />
      <g transform="rotate(5 60 72)">
        <defs>
          <linearGradient id={`${id}-b`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={bowlCol[0]} />
            <stop offset="1" stopColor={bowlCol[1]} />
          </linearGradient>
        </defs>
        {v !== 1 && (
          <g fill="#a1743b">
            <rect x="67" y="16" width="4.5" height="50" rx="1" transform="rotate(30 69 41)" />
            <rect x="77" y="12" width="4.5" height="50" rx="1" transform="rotate(36 79 37)" />
          </g>
        )}
        {v === 1 && (
          <g transform="rotate(28 88 26)">
            <rect x="86" y="12" width="4.5" height="22" rx="1" fill="#90a4ae" />
            <ellipse cx="88" cy="38" rx="6" ry="8" fill="#b0bec5" />
          </g>
        )}
        <path d="M33 57 Q39 45 50 48 Q54 39 64 43 Q74 38 79 47 Q88 47 87 57 Z" fill="#fafafa" />
        {v === 0 && (
          <>
            <rect x="39" y="48" width="12" height="9" rx="1.5" transform="rotate(-8 45 52)" fill="#ef6c00" />
            <rect x="56" y="44" width="12" height="9" rx="1.5" transform="rotate(6 62 48)" fill="#ef6c00" />
            <path d="M72 46 Q80 42 82 51 Q76 55 71 51 Z" fill="#7cb342" />
            <g fill="#455a64">
              <ellipse cx="51" cy="45" rx="1.5" ry="0.9" />
              <ellipse cx="68" cy="42" rx="1.5" ry="0.9" />
            </g>
          </>
        )}
        {v === 1 && (
          <>
            <path d="M40 52 Q46 42 58 45 Q70 40 78 48 Q84 50 84 56 L36 56 Q36 53 40 52 Z" fill="#e09028" />
            <ellipse cx="53" cy="50" rx="5" ry="2.6" fill="#c47616" />
            <ellipse cx="68" cy="49" rx="4.5" ry="2.4" fill="#c47616" />
            <ellipse cx="60" cy="43" rx="2.4" ry="1.3" fill="#558b2f" />
          </>
        )}
        {v === 2 && (
          <>
            <path d="M39 50 Q45 42 53 46 Q51 54 43 54 Z" fill="#7cb342" />
            <g fill="#e0b84f">
              <circle cx="61" cy="46" r="2.8" />
              <circle cx="67" cy="49" r="2.8" />
              <circle cx="63" cy="52" r="2.8" />
            </g>
            <circle cx="76" cy="49" r="5" fill="#e53935" />
          </>
        )}
        <path d="M27 57 Q27 87 48 93 L47 102 L73 102 L72 93 Q93 87 93 57 Z" fill={`url(#${id}-b)`} />
        <rect x="27" y="57" width="66" height="4" fill="#ffffff" opacity="0.18" />
      </g>
    </svg>
  );
}

/* Soup — v0 tomato, v1 herb-green. */
function Suppe({ id, v = 0, ...svg }: SvgProps) {
  const surface = ['#e53935', '#7cb342'][v] ?? '#e53935';
  return (
    <svg {...svg}>
      <Ground rx={36} />
      <g transform="rotate(-5 60 70)">
        <defs>
          <linearGradient id={`${id}-w`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#cfd8dc" />
            <stop offset="1" stopColor="#f5f5f5" />
          </linearGradient>
        </defs>
        <g fill="#b0bec5" opacity="0.45">
          <path d="M48 20 Q44 28 48 35 L52 35 Q48 28 52 20 Z" />
          <path d="M62 15 Q58 24 62 33 L66 33 Q62 24 66 15 Z" />
          <path d="M74 22 Q70 29 74 36 L78 36 Q74 29 78 22 Z" />
        </g>
        <g transform="rotate(30 90 28)">
          <rect x="88" y="14" width="4.5" height="20" rx="1" fill="#90a4ae" />
          <ellipse cx="90" cy="38" rx="6" ry="8" fill="#b0bec5" />
        </g>
        <ellipse cx="60" cy="90" rx="42" ry="10" fill="#eceff1" />
        <path d="M25 51 Q25 82 60 82 Q95 82 95 51 Z" fill={`url(#${id}-w)`} />
        <ellipse cx="60" cy="52" rx="32" ry="5.5" fill={surface} />
        {v === 0 && <path d="M52 52 Q58 55 66 52 Q60 50 52 52 Z" fill="#fafafa" opacity="0.7" />}
        {v === 1 && (
          <g fill="#e0c893">
            <rect x="53" y="49.5" width="6" height="4.5" rx="1" transform="rotate(-8 56 52)" />
            <rect x="65" y="50.5" width="5.5" height="4" rx="1" transform="rotate(12 68 52.5)" />
          </g>
        )}
        <g fill={v === 0 ? '#66bb6a' : '#33691e'}>
          <ellipse cx="66" cy="50" rx="1.9" ry="1.1" />
          <ellipse cx="48" cy="53" rx="1.9" ry="1.1" />
        </g>
      </g>
    </svg>
  );
}

/* Pan — v0 stir-fry, v1 fried eggs. */
function Pfanne({ id, v = 0, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={34} />
      <g transform="rotate(-5 56 70)">
        <defs>
          <linearGradient id={`${id}-pan`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#37474f" />
            <stop offset="1" stopColor="#546e7a" />
          </linearGradient>
        </defs>
        <g fill="#b0bec5" opacity="0.45">
          <path d="M42 26 Q38 34 42 42 L46 42 Q42 34 46 26 Z" />
          <path d="M58 20 Q54 30 58 40 L62 40 Q58 30 62 20 Z" />
        </g>
        <rect x="86" y="60" width="28" height="8" rx="4" transform="rotate(-14 100 64)" fill="#37474f" />
        <path d="M16 60 Q16 88 54 88 Q92 88 92 60 Z" fill={`url(#${id}-pan)`} />
        <ellipse cx="54" cy="60" rx="35" ry="7.5" fill={v === 0 ? '#8a5a35' : '#f0e6c8'} />
        {v === 0 && (
          <>
            <path d="M31 59 Q37 53 43 59 Q37 62 31 59 Z" fill="#e53935" />
            <path d="M56 55 Q63 50 69 56 Q62 60 56 55 Z" fill="#fbc02d" />
            <circle cx="48" cy="61" r="4" fill="#7cb342" />
            <circle cx="73" cy="60" r="3.6" fill="#7cb342" />
          </>
        )}
        {v === 1 && (
          <>
            <path d="M29 59 Q31 53 40 53 Q51 52 51 58 Q52 64 42 64 Q31 65 29 59 Z" fill="#fafafa" />
            <circle cx="40" cy="58" r="5" fill="#fbc02d" />
            <path d="M58 58 Q59 52 69 52 Q79 52 80 57 Q81 63 70 63 Q59 63 58 58 Z" fill="#fafafa" />
            <circle cx="69" cy="57" r="5" fill="#fbc02d" />
          </>
        )}
      </g>
    </svg>
  );
}

/* Pizza — v0 salami, v1 verdure. */
function Pizza({ id, v = 0, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={38} />
      <g transform="rotate(6 60 62)">
        <defs>
          <linearGradient id={`${id}-c`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#e8b64c" />
            <stop offset="1" stopColor="#f4cf6d" />
          </linearGradient>
        </defs>
        <g transform="translate(57 64)">
          <path d="M12 -39 A41 41 0 1 0 26 -30 Z" fill="#c98d3f" />
          <path d="M10 -33 A34.5 34.5 0 1 0 22 -25.5 Z" fill={`url(#${id}-c)`} />
          {v === 0 && (
            <g fill="#c62828">
              <circle cx="-13" cy="-13" r="6.5" />
              <circle cx="9" cy="13" r="6.5" />
              <circle cx="-17" cy="13" r="5.5" />
              <circle cx="13" cy="-11" r="5.5" />
            </g>
          )}
          {v === 0 && (
            <g fill="#558b2f">
              <path d="M-4 -3 Q2 -9 8 -4 Q3 2 -4 -3 Z" />
              <path d="M-8 21 Q-2 15 4 20 Q-1 26 -8 21 Z" />
            </g>
          )}
          {v === 1 && (
            <>
              <g fill="#e0d3ba">
                <path d="M-16 -11 Q-16 -18 -10 -18 Q-4 -18 -4 -11 Q-4 -8 -10 -8 Q-16 -8 -16 -11 Z" />
                <path d="M8 9 Q8 2 14 2 Q20 2 20 9 Q20 12 14 12 Q8 12 8 9 Z" />
              </g>
              <g fill="#37474f">
                <circle cx="13" cy="-13" r="3.2" />
                <circle cx="-17" cy="11" r="3.2" />
                <circle cx="-2" cy="20" r="3" />
              </g>
              <g fill="#7cb342">
                <path d="M-6 -2 A6 6 0 0 1 3 -6 L1 -2 Z" />
                <path d="M-14 19 A6 6 0 0 1 -6 14 L-8 18 Z" />
              </g>
            </>
          )}
        </g>
        <g transform="translate(95 18) rotate(40)">
          <path d="M0 34 L-11 4 A29 29 0 0 1 11 4 Z" fill="#c98d3f" />
          <path d="M-1 27 L-8.5 7 A23 23 0 0 1 8.5 7 L1 27 Z" fill="#f4cf6d" />
          {v === 0 ? <circle cx="0" cy="12" r="4" fill="#c62828" /> : <circle cx="0" cy="12" r="3" fill="#37474f" />}
        </g>
      </g>
    </svg>
  );
}

/* Salad — v0 garden, v1 feta & radish. */
function Salat({ id, v = 0, ...svg }: SvgProps) {
  const bowlCol = [
    ['#7f9c73', '#a8bf9c'],
    ['#c9924a', '#e0b060'],
  ][v] ?? ['#7f9c73', '#a8bf9c'];
  return (
    <svg {...svg}>
      <Ground rx={32} />
      <g transform="rotate(5 60 70)">
        <defs>
          <linearGradient id={`${id}-b`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={bowlCol[0]} />
            <stop offset="1" stopColor={bowlCol[1]} />
          </linearGradient>
        </defs>
        <g fill="#7cb342">
          <path d="M33 56 Q29 40 41 34 Q47 44 41 56 Z" />
          <path d="M77 56 Q83 38 73 30 Q65 40 69 55 Z" />
          <path d="M53 52 Q51 34 63 28 Q69 40 61 52 Z" />
        </g>
        <g fill="#aed581">
          <path d="M45 54 Q41 42 49 36 Q55 44 51 54 Z" />
          <path d="M63 52 Q65 40 75 40 Q75 50 67 55 Z" />
        </g>
        {v === 0 && (
          <>
            <circle cx="43" cy="55" r="5.5" fill="#e53935" />
            <g transform="translate(66 56)">
              <circle r="6" fill="#9ccc65" />
              <circle r="4" fill="#e8f5d0" />
            </g>
          </>
        )}
        {v === 1 && (
          <>
            <g fill="#fafafa">
              <rect x="39" y="49" width="8.5" height="7.5" rx="1" transform="rotate(-10 43 53)" />
              <rect x="62" y="51" width="7.5" height="6.5" rx="1" transform="rotate(12 66 54)" />
            </g>
            <g transform="translate(51 56)">
              <circle r="5" fill="#d81b60" />
              <circle r="3.2" fill="#fce4ec" />
            </g>
          </>
        )}
        <path d="M25 57 Q25 90 60 90 Q95 90 95 57 Z" fill={`url(#${id}-b)`} />
        <rect x="25" y="57" width="70" height="3.5" fill="#ffffff" opacity="0.2" />
      </g>
    </svg>
  );
}

/* Burger. */
function Burger({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={32} />
      <g transform="rotate(-5 60 66)">
        <defs>
          <linearGradient id={`${id}-bun`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#c8863d" />
            <stop offset="1" stopColor="#e8a952" />
          </linearGradient>
        </defs>
        <path d="M27 56 Q27 27 60 27 Q93 27 93 56 Z" fill={`url(#${id}-bun)`} />
        <g fill="#f5e0bd">
          <ellipse cx="47" cy="38" rx="2.4" ry="1.5" transform="rotate(-14 47 38)" />
          <ellipse cx="62" cy="33" rx="2.4" ry="1.5" transform="rotate(10 62 33)" />
          <ellipse cx="75" cy="41" rx="2.4" ry="1.5" transform="rotate(18 75 41)" />
          <ellipse cx="58" cy="45" rx="2.4" ry="1.5" transform="rotate(-8 58 45)" />
        </g>
        <path d="M25 58 Q31 52 37 58 Q43 52 49 58 Q55 52 61 58 Q67 52 73 58 Q79 52 85 58 Q91 52 95 58 L94 63 L26 63 Z" fill="#7cb342" />
        <path d="M29 63 L91 63 L85 71 L74 63.5 L60 72 L46 63.5 L35 71 Z" fill="#fbc02d" />
        <rect x="28" y="67" width="64" height="12" rx="6" fill="#6d4c41" />
        <rect x="32" y="79" width="56" height="5.5" rx="2.75" fill="#e53935" />
        <path d="M29 86 L91 86 Q93 86 93 89 Q93 98 83 98 L37 98 Q27 98 27 89 Q27 86 29 86 Z" fill="#c8863d" />
      </g>
    </svg>
  );
}

/* Fish — v0 fillet, v1 whole grilled. */
function Fisch({ id, v = 0, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={36} />
      <g transform="rotate(5 60 76)">
        <defs>
          <linearGradient id={`${id}-p`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eceff1" />
            <stop offset="1" stopColor="#cfd8dc" />
          </linearGradient>
          <linearGradient id={`${id}-f`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#d96236" />
            <stop offset="1" stopColor="#ef8354" />
          </linearGradient>
          <linearGradient id={`${id}-w`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#607d8b" />
            <stop offset="1" stopColor="#90a4ae" />
          </linearGradient>
        </defs>
        <ellipse cx="60" cy="78" rx="45" ry="20" fill={`url(#${id}-p)`} />
        <ellipse cx="60" cy="76" rx="35" ry="14.5" fill="#fafafa" />
        {v === 0 && (
          <>
            <path d="M33 73 Q35 60 52 58 Q77 55 85 65 Q88 71 83 77 Q68 84 45 81 Q34 79 33 73 Z" fill={`url(#${id}-f)`} />
            <g fill="#f5c0a4">
              <path d="M46 61 Q44 69 47 77 L51 77 Q48 69 50 61 Z" />
              <path d="M60 59 Q58 68 61 78 L65 78 Q62 68 64 59 Z" />
              <path d="M73 60 Q71 67 74 74 L78 74 Q75 67 77 60 Z" />
            </g>
            <g transform="translate(83 82)">
              <path d="M-9 0 A9 9 0 0 1 9 0 Z" fill="#fbc02d" />
              <path d="M-6.3 0 A6.3 6.3 0 0 1 6.3 0 Z" fill="#fff9c4" />
            </g>
          </>
        )}
        {v === 1 && (
          <>
            <path d="M29 71 Q41 58 62 60 Q77 61 83 69 Q77 78 62 79 Q41 81 29 71 Z" fill={`url(#${id}-w)`} />
            <path d="M83 69 L95 61 Q93 69 95 77 Z" fill="#607d8b" />
            <g fill="#455a64">
              <rect x="55" y="62" width="3" height="15" rx="1.5" transform="rotate(4 56 69)" />
              <rect x="66" y="62" width="3" height="14" rx="1.5" transform="rotate(4 67 69)" />
            </g>
            <circle cx="38" cy="67" r="1.9" fill="#263238" />
            <g transform="translate(79 84)">
              <circle r="7" fill="#fbc02d" />
              <circle r="4.9" fill="#fff9c4" />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}

/* Meat — v0 steak on board, v1 schnitzel. */
function Steak({ id, v = 0, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={38} />
      <g transform="rotate(-5 60 76)">
        <defs>
          <linearGradient id={`${id}-m`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#7e3a20" />
            <stop offset="1" stopColor="#a8532c" />
          </linearGradient>
          <linearGradient id={`${id}-s`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#d1943e" />
            <stop offset="1" stopColor="#eab765" />
          </linearGradient>
          <linearGradient id={`${id}-p`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eceff1" />
            <stop offset="1" stopColor="#cfd8dc" />
          </linearGradient>
        </defs>
        {v === 0 && (
          <>
            <ellipse cx="60" cy="78" rx="45" ry="19" fill="#a1743b" />
            <ellipse cx="60" cy="76.5" rx="40" ry="15.5" fill="#b8894a" />
            <path d="M28 68 Q27 57 43 54 Q62 50 79 55 Q92 59 90 68 Q88 77 71 80 Q47 83 33 76 Q28 73 28 68 Z" fill={`url(#${id}-m)`} />
            <g fill="#4a1c0c">
              <rect x="39" y="57" width="4" height="19" rx="2" transform="rotate(16 41 66)" />
              <rect x="55" y="55" width="4" height="23" rx="2" transform="rotate(16 57 66)" />
              <rect x="71" y="56" width="4" height="21" rx="2" transform="rotate(16 73 66)" />
            </g>
            <g transform="translate(93 60) rotate(-28)" fill="#558b2f">
              <rect x="-1.2" y="0" width="2.4" height="22" rx="1.2" />
              <path d="M0 4 L-6 1 L0 7 Z M0 4 L6 1 L0 7 Z M0 12 L-6 9 L0 15 Z M0 12 L6 9 L0 15 Z" />
            </g>
          </>
        )}
        {v === 1 && (
          <>
            <ellipse cx="60" cy="78" rx="45" ry="20" fill={`url(#${id}-p)`} />
            <ellipse cx="60" cy="76" rx="35" ry="14.5" fill="#fafafa" />
            <path d="M31 71 Q31 58 46 56 Q65 52 78 59 Q86 64 82 72 Q76 81 57 81 Q37 81 31 71 Z" fill={`url(#${id}-s)`} />
            <g fill="#b87a2a">
              <circle cx="45" cy="64" r="1.5" />
              <circle cx="56" cy="60" r="1.5" />
              <circle cx="68" cy="64" r="1.5" />
              <circle cx="50" cy="72" r="1.5" />
              <circle cx="64" cy="74" r="1.5" />
              <circle cx="73" cy="69" r="1.5" />
            </g>
            <g transform="translate(83 82)">
              <path d="M-9 0 A9 9 0 0 1 9 0 Z" fill="#fbc02d" />
              <path d="M-6.3 0 A6.3 6.3 0 0 1 6.3 0 Z" fill="#fff9c4" />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}

/* Dessert — v0 berry cake, v1 chocolate cake. */
function Dessert({ id, v = 0, ...svg }: SvgProps) {
  const frost = [
    ['#d81b60', '#f06292'],
    ['#4e342e', '#795548'],
  ][v] ?? ['#d81b60', '#f06292'];
  const sponge = ['#f0d9a8', '#5d4037'][v] ?? '#f0d9a8';
  const layer = ['#fafafa', '#8d6e63'][v] ?? '#fafafa';
  return (
    <svg {...svg}>
      <Ground rx={30} />
      <g transform="rotate(5 60 70)">
        <defs>
          <linearGradient id={`${id}-f`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={frost[0]} />
            <stop offset="1" stopColor={frost[1]} />
          </linearGradient>
        </defs>
        <ellipse cx="60" cy="94" rx="38" ry="8" fill="#eceff1" />
        <path d="M37 91 L37 54 Q60 42 83 54 L83 91 Z" fill={sponge} />
        <rect x="37" y="66" width="46" height="6.5" fill={layer} />
        <rect x="37" y="78" width="46" height="6.5" fill={layer} />
        <path d="M35 56 Q60 43 85 56 L85 60 L78 60 L78 65 L70 65 L70 60 L61 60 L61 66 L52 66 L52 60 L43 60 L43 64 L35 64 Z" fill={`url(#${id}-f)`} />
        {v === 0 && <circle cx="60" cy="42" r="5.5" fill="#c62828" />}
        {v === 1 && (
          <g transform="translate(60 41)">
            <path d="M-6 -2 Q0 -8 6 -2 Q5 7 0 9 Q-5 7 -6 -2 Z" fill="#e53935" />
            <path d="M-4 -4 Q0 -7 4 -4 L0 -2 Z" fill="#558b2f" />
          </g>
        )}
      </g>
    </svg>
  );
}

/* Tacos. */
function Taco({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={36} />
      <g transform="rotate(-5 60 70)">
        <defs>
          <linearGradient id={`${id}-s`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#dda13f" />
            <stop offset="1" stopColor="#f2c266" />
          </linearGradient>
        </defs>
        <g transform="translate(76 62) rotate(8)">
          <path d="M-26 26 A26 26 0 0 1 26 26 Z" fill="#c98d3f" />
          <path d="M-22 24 Q-16 12 -6 16 Q-2 8 6 14 Q14 8 20 18 L22 24 Z" fill="#7cb342" />
        </g>
        <g transform="translate(46 66) rotate(-6)">
          <path d="M-28 28 A28 28 0 0 1 28 28 Z" fill={`url(#${id}-s)`} />
          <path d="M-24 26 Q-18 12 -8 17 Q-4 8 4 14 Q12 7 18 16 Q22 20 24 26 Z" fill="#7cb342" />
          <circle cx="-10" cy="20" r="3.2" fill="#e53935" />
          <circle cx="6" cy="17" r="3.2" fill="#e53935" />
          <rect x="-2" y="21" width="7" height="2.5" rx="1.25" transform="rotate(24 1 22)" fill="#fbc02d" />
        </g>
        <g transform="translate(97 88) rotate(12)">
          <path d="M-8 0 A8 8 0 0 1 8 0 Z" fill="#7cb342" />
          <path d="M-5.6 0 A5.6 5.6 0 0 1 5.6 0 Z" fill="#dcedc8" />
        </g>
      </g>
    </svg>
  );
}

/* Casserole. */
function Auflauf({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={38} />
      <g transform="rotate(5 60 70)">
        <defs>
          <linearGradient id={`${id}-d`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#a04e31" />
            <stop offset="1" stopColor="#c96a44" />
          </linearGradient>
        </defs>
        <g fill="#b0bec5" opacity="0.45">
          <path d="M48 24 Q44 32 48 40 L52 40 Q48 32 52 24 Z" />
          <path d="M66 18 Q62 28 66 38 L70 38 Q66 28 70 18 Z" />
        </g>
        <ellipse cx="20" cy="65" rx="6.5" ry="4.5" fill="#8a4226" />
        <ellipse cx="100" cy="65" rx="6.5" ry="4.5" fill="#8a4226" />
        <path d="M21 57 Q21 91 60 91 Q99 91 99 57 Z" fill={`url(#${id}-d)`} />
        <ellipse cx="60" cy="57" rx="37" ry="7.5" fill="#e8b64c" />
        <g fill="#c98d3f">
          <ellipse cx="46" cy="56" rx="7" ry="3" />
          <ellipse cx="70" cy="58" rx="8" ry="3.2" />
          <ellipse cx="58" cy="54.5" rx="4" ry="2" />
        </g>
      </g>
    </svg>
  );
}

/* Pancake stack. */
function Pancakes({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={34} />
      <g transform="rotate(-5 60 74)">
        <defs>
          <linearGradient id={`${id}-syr`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#a8652a" />
            <stop offset="1" stopColor="#c98d3f" />
          </linearGradient>
        </defs>
        <ellipse cx="60" cy="94" rx="40" ry="8" fill="#eceff1" />
        <path d="M27 82 Q27 76 33 76 L87 76 Q93 76 93 82 Q93 89 87 89 L33 89 Q27 89 27 82 Z" fill="#d1943e" />
        <path d="M29 70 Q29 64 35 64 L85 64 Q91 64 91 70 Q91 77 85 77 L35 77 Q29 77 29 70 Z" fill="#e0a952" />
        <path d="M31 58 Q31 52 37 52 L83 52 Q89 52 89 58 Q89 65 83 65 L37 65 Q31 65 31 58 Z" fill="#eab765" />
        <path d="M32 54 Q60 45 88 54 L88 58 L80 58 L80 64 L71 64 L71 58 L61 58 L61 65 L52 65 L52 58 L42 58 L42 62 L32 62 Z" fill={`url(#${id}-syr)`} />
        <rect x="53" y="43" width="14" height="9" rx="1.5" fill="#fdd835" />
        <circle cx="42" cy="48" r="3.8" fill="#c62828" />
        <circle cx="79" cy="47" r="3.4" fill="#5c6bc0" />
      </g>
    </svg>
  );
}

/* Sandwich. */
function Sandwich({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={36} />
      <g transform="rotate(-6 60 70)">
        <defs>
          <linearGradient id={`${id}-c`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#c98d3f" />
            <stop offset="1" stopColor="#e0a952" />
          </linearGradient>
        </defs>
        <g transform="translate(74 32)">
          <path d="M-3 0 Q0 -4 3 0 L28 54 Q30 60 24 60 L-24 60 Q-30 60 -28 54 Z" fill={`url(#${id}-c)`} />
          <path d="M0 13 L17 53 L-17 53 Z" fill="#f5e6c8" />
          <path d="M-14 53 L14 53 L11 47 L-11 47 Z" fill="#7cb342" />
        </g>
        <g transform="translate(42 68)">
          <rect x="-28" y="0" width="56" height="8" rx="3" fill={`url(#${id}-c)`} />
          <path d="M-26 8 Q-30 12 -24 13 L24 13 Q30 12 26 8 Z" fill="#7cb342" />
          <rect x="-25" y="13" width="50" height="5" rx="2" fill="#fbc02d" />
          <rect x="-26" y="18" width="52" height="5" rx="2" fill="#e53935" />
          <rect x="-28" y="23" width="56" height="8" rx="3" fill="#c98d3f" />
        </g>
      </g>
    </svg>
  );
}

/* Shot — v0 single spirit, v1 layered (B-52). */
function Shot({ id, v = 0, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={30} />
      <g transform="rotate(-5 60 74) translate(60 103) scale(1.22) translate(-60 -103)">
        <defs>
          <linearGradient id={`${id}-l`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#c77c1a" />
            <stop offset="1" stopColor="#e8a33d" />
          </linearGradient>
        </defs>
        {/* Tapered shot glass — filled bigger so it reads at card size. */}
        <path d="M38 45 L44 99 Q44.4 103 49 103 L71 103 Q75.6 103 76 99 L82 45 Z" fill="#90a4ae" opacity="0.32" />
        {v === 0 ? (
          <>
            <path d="M41.5 59 L45.6 96.5 Q45.9 100 49 100 L71 100 Q74.1 100 74.4 96.5 L78.5 59 Z" fill={`url(#${id}-l)`} opacity="0.92" />
            <g transform="translate(80 46) rotate(20)">
              <circle r="12" fill="#7cb342" />
              <circle r="8.6" fill="#dcedc8" />
              <rect x="-1" y="-8.6" width="2" height="17.2" fill="#7cb342" opacity="0.5" />
              <rect x="-8.6" y="-1" width="17.2" height="2" fill="#7cb342" opacity="0.5" />
            </g>
          </>
        ) : (
          <>
            {/* Layered coquito — dark base, cream, foam — with cinnamon stick + nutmeg dusting. */}
            <path d="M44 82 L46 96.5 Q46.3 100 49.5 100 L70.5 100 Q73.7 100 74 96.5 L76 82 Z" fill="#3e2723" />
            <rect x="44" y="69" width="32" height="13" fill="#a1723b" />
            <path d="M42 58 L78 58 L76.5 69 L43.5 69 Z" fill="#f5e6c8" />
            <g transform="rotate(18 69 44)">
              <rect x="65.5" y="23" width="7" height="42" rx="3.5" fill="#8a4b22" />
              <rect x="65.5" y="23" width="7" height="42" rx="3.5" fill="#5c3115" opacity="0.32" />
            </g>
            <g fill="#6d4522" opacity="0.7">
              <circle cx="52" cy="61" r="1.4" />
              <circle cx="60" cy="63" r="1.4" />
              <circle cx="68" cy="61" r="1.4" />
            </g>
          </>
        )}
        <rect x="39" y="44" width="43" height="4" rx="2" fill="#cfd8dc" opacity="0.55" />
      </g>
    </svg>
  );
}

/* Mug — v0 mulled wine, v1 coffee with cream. Steam stays upright. */
function Mug({ id, v = 0, ...svg }: SvgProps) {
  const body = v === 1 ? ['#c9ced2', '#eceff1'] : ['#a8443a', '#c95a4c'];
  const liq = v === 1 ? '#3b2417' : '#7b1e1e';
  return (
    <svg {...svg}>
      <Ground rx={26} />
      <g fill="none" stroke="#b0bec5" strokeWidth="3" strokeLinecap="round" opacity="0.45">
        <path d="M52 40 Q47 33 52 26 Q57 19 52 12" />
        <path d="M67 42 Q62 35 67 28 Q72 21 67 15" />
      </g>
      <g transform="rotate(-5 60 78)">
        <defs>
          <linearGradient id={`${id}-m`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={body[0]} />
            <stop offset="1" stopColor={body[1]} />
          </linearGradient>
        </defs>
        <path d="M78 64 Q92 64 92 77 Q92 90 78 90 L78 84 Q85 84 85 77 Q85 70 78 70 Z" fill={`url(#${id}-m)`} />
        <path d="M40 58 H80 V95 Q80 102 73 102 H47 Q40 102 40 95 Z" fill={`url(#${id}-m)`} />
        <ellipse cx="60" cy="59" rx="20" ry="5" fill={liq} />
        {v === 1 && <ellipse cx="60" cy="58.5" rx="15" ry="3.4" fill="#e6d3b8" />}
        {v === 0 && (
          <>
            <rect x="53" y="45" width="3" height="17" rx="1.5" transform="rotate(20 54.5 53)" fill="#7a4a24" />
            <g transform="translate(67 59)">
              <circle r="4.6" fill="#ef9a3d" />
              <circle r="3" fill="#ffd39b" />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}

/* Beer — golden pour, white foam head, rising bubbles. */
function Beer({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={24} />
      <g transform="rotate(6 60 66)">
        <defs>
          <linearGradient id={`${id}-b`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#f9a825" />
            <stop offset="1" stopColor="#ffca28" />
          </linearGradient>
        </defs>
        <path d="M42 34 L45 100 Q45 103 49 103 L71 103 Q75 103 75 100 L78 34 Z" fill="#90a4ae" opacity="0.35" />
        <path d="M44.4 44 L47 98 Q47.2 100.5 50 100.5 L70 100.5 Q72.8 100.5 73 98 L75.6 44 Z" fill={`url(#${id}-b)`} opacity="0.92" />
        <g fill="#ffffff" opacity="0.55">
          <circle cx="54" cy="60" r="2.4" />
          <circle cx="64" cy="72" r="2" />
          <circle cx="58" cy="84" r="1.7" />
          <circle cx="67" cy="55" r="1.6" />
        </g>
        <path d="M42 40 Q42 28 52 30 Q56 22 63 30 Q73 26 76 38 Q60 46 42 40 Z" fill="#fff8e1" />
        <circle cx="52" cy="31" r="4.5" fill="#ffffff" />
        <circle cx="66" cy="31" r="4" fill="#ffffff" />
      </g>
    </svg>
  );
}

/* Margarita — wide bowl, salt rim, pale agave-green, lime wedge. */
function Margarita({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={26} />
      <g transform="rotate(6 60 60)">
        <defs>
          <linearGradient id={`${id}-l`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#aed581" />
            <stop offset="1" stopColor="#dcedc8" />
          </linearGradient>
        </defs>
        <path d="M28 34 Q40 60 60 60 Q80 60 92 34 Q60 42 28 34 Z" fill="#90a4ae" opacity="0.35" />
        <path d="M33 37 Q43 55 60 55 Q77 55 87 37 Q60 44 33 37 Z" fill={`url(#${id}-l)`} opacity="0.9" />
        <rect x="57.5" y="60" width="5" height="34" fill="#90a4ae" opacity="0.45" />
        <path d="M42 100 Q42 95 60 95 Q78 95 78 100 L78 103 L42 103 Z" fill="#90a4ae" opacity="0.45" />
        <g fill="#eceff1">
          <circle cx="30" cy="34" r="1.6" />
          <circle cx="38" cy="37" r="1.6" />
          <circle cx="48" cy="39" r="1.6" />
          <circle cx="60" cy="40" r="1.6" />
          <circle cx="72" cy="39" r="1.6" />
          <circle cx="82" cy="37" r="1.6" />
          <circle cx="90" cy="34" r="1.6" />
        </g>
        <g transform="translate(84 33) rotate(24)">
          <path d="M-9 0 A9 9 0 0 1 9 0 Z" fill="#7cb342" />
          <path d="M-6.4 0 A6.4 6.4 0 0 1 6.4 0 Z" fill="#dcedc8" />
        </g>
      </g>
    </svg>
  );
}

/* Punch bowl — fruity surface, floating citrus, ladle. */
function Punch({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={38} />
      <g transform="rotate(4 60 74)">
        <defs>
          <linearGradient id={`${id}-b`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#5d4037" />
            <stop offset="1" stopColor="#8d6e63" />
          </linearGradient>
          <linearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e53935" />
            <stop offset="1" stopColor="#fb8c00" />
          </linearGradient>
        </defs>
        <path d="M78 40 L92 30" stroke="#b0bec5" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <ellipse cx="93" cy="28" rx="6" ry="4" fill="#cfd8dc" />
        <path d="M26 62 Q26 92 60 96 Q94 92 94 62 Z" fill={`url(#${id}-b)`} />
        <ellipse cx="60" cy="62" rx="34" ry="8" fill={`url(#${id}-l)`} />
        <g>
          <circle cx="48" cy="61" r="4.5" fill="#ffb300" />
          <circle cx="48" cy="61" r="2.6" fill="#ffe082" />
          <circle cx="70" cy="63" r="4" fill="#ef5350" />
          <circle cx="70" cy="63" r="2.3" fill="#ffcdd2" />
          <path d="M58 58 Q62 55 64 59 Q60 62 58 58 Z" fill="#66bb6a" />
        </g>
      </g>
    </svg>
  );
}

/* Sushi — v0 nigiri pair, v1 maki rolls, on a slate board. */
function Sushi({ id, v = 0, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={34} />
      <g transform="rotate(-4 60 72)">
        <defs>
          <linearGradient id={`${id}-r`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#e0a952" />
            <stop offset="1" stopColor="#f2c266" />
          </linearGradient>
        </defs>
        <path d="M26 80 Q26 74 32 74 L88 74 Q94 74 94 80 L94 86 Q94 92 88 92 L32 92 Q26 92 26 86 Z" fill="#37474f" />
        {v === 0 ? (
          <>
            <g transform="translate(46 68) rotate(-4)">
              <rect x="-16" y="-1" width="32" height="16" rx="8" fill="#fafafa" />
              <path d="M-16 -4 Q0 -12 16 -4 Q16 2 -16 2 Z" fill="#fb8c00" />
              <path d="M-16 -3 Q0 -10 16 -3" fill="none" stroke="#ffcc80" strokeWidth="1.4" opacity="0.7" />
            </g>
            <g transform="translate(76 70) rotate(5)">
              <rect x="-15" y="-1" width="30" height="15" rx="7.5" fill="#fafafa" />
              <path d="M-15 -3 Q0 -11 15 -3 Q15 2 -15 2 Z" fill="#e53935" />
              <rect x="-6" y="-2.5" width="12" height="4" rx="2" fill="#455a64" />
            </g>
          </>
        ) : (
          <g transform="translate(0 -2)">
            {[42, 60, 78].map((cx, i) => (
              <g key={cx} transform={`translate(${cx} 70)`}>
                <circle r="11" fill="#37474f" />
                <circle r="9" fill="#fafafa" />
                <circle r="4.2" fill={['#7cb342', '#fb8c00', '#e57373'][i]} />
              </g>
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}

/* Kuchen — v0 layered slice, v1 round tart (top view). */
function Kuchen({ id, v = 0, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={30} />
      <g transform="rotate(-5 60 66)">
        <defs>
          <linearGradient id={`${id}-s`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#b9762f" />
            <stop offset="1" stopColor="#d99a4e" />
          </linearGradient>
        </defs>
        {v === 0 ? (
          <g transform="translate(60 60)">
            <path d="M-30 34 L26 34 L14 -20 L-30 -6 Z" fill={`url(#${id}-s)`} />
            <path d="M-30 6 L18 -6 L14 -20 L-30 -6 Z" fill="#f8bbd0" />
            <rect x="-30" y="10" width="52" height="8" transform="skewX(-12)" fill="#fff3e0" />
            <path d="M-30 -6 L14 -20 Q18 -26 22 -20 L-30 -18 Z" fill="#f48fb1" />
            <circle cx="2" cy="-24" r="5" fill="#e53935" />
            <rect x="1" y="-33" width="2" height="6" fill="#7cb342" />
          </g>
        ) : (
          <g transform="translate(60 66)">
            <ellipse cx="0" cy="4" rx="34" ry="20" fill="#b9762f" />
            <ellipse cx="0" cy="1" rx="30" ry="17" fill="#fff3e0" />
            <ellipse cx="0" cy="1" rx="22" ry="12.5" fill="#f8bbd0" />
            <g fill="#c2185b">
              <circle cx="0" cy="-8" r="3.4" />
              <circle cx="12" cy="-2" r="3.4" />
              <circle cx="8" cy="8" r="3.4" />
              <circle cx="-8" cy="8" r="3.4" />
              <circle cx="-12" cy="-2" r="3.4" />
              <circle cx="0" cy="2" r="3.4" />
            </g>
          </g>
        )}
      </g>
    </svg>
  );
}

/* Eis — sundae with three scoops, wafer, cherry. */
function Eis({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={22} />
      <g transform="rotate(-5 60 64)">
        <defs>
          <linearGradient id={`${id}-c`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#90a4ae" />
            <stop offset="1" stopColor="#cfd8dc" />
          </linearGradient>
        </defs>
        <path d="M42 62 Q42 84 60 88 Q78 84 78 62 Z" fill={`url(#${id}-c)`} opacity="0.55" />
        <rect x="57" y="88" width="6" height="10" fill="#90a4ae" opacity="0.5" />
        <path d="M48 100 Q48 96 60 96 Q72 96 72 100 Z" fill="#90a4ae" opacity="0.5" />
        <circle cx="49" cy="58" r="11" fill="#f8bbd0" />
        <circle cx="71" cy="58" r="11" fill="#a1723b" />
        <circle cx="60" cy="48" r="12" fill="#fff8e1" />
        <path d="M68 44 L82 18 L88 22 L74 50 Z" fill="#e0a952" />
        <circle cx="60" cy="34" r="5.5" fill="#e53935" />
        <path d="M60 29 Q64 22 70 22" fill="none" stroke="#7cb342" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* Spiess — v0 meat & pepper skewer, v1 seafood skewer. */
function Spiess({ id, v = 0, ...svg }: SvgProps) {
  const pieces =
    v === 0
      ? ['#8d4a2f', '#e53935', '#f0e6d2', '#7cb342', '#8d4a2f']
      : ['#ef9a9a', '#7cb342', '#ef9a9a', '#fbc02d', '#ef9a9a'];
  return (
    <svg {...svg}>
      <Ground rx={30} />
      <g transform="rotate(-33 60 60)">
        <rect x="18" y="57.5" width="86" height="4" rx="2" fill="#a1743b" />
        {pieces.map((c, i) => (
          <rect
            key={i}
            x={26 + i * 15}
            y={i % 2 === 0 ? 49 : 50}
            width="14"
            height={i % 2 === 0 ? 21 : 19}
            rx="4"
            fill={c}
          />
        ))}
      </g>
    </svg>
  );
}

/* Dumpling — three gyoza on a plate with a dip bowl. */
function Dumpling({ id, ...svg }: SvgProps) {
  void id;
  return (
    <svg {...svg}>
      <Ground rx={32} />
      <g transform="rotate(-4 60 74)">
        <ellipse cx="56" cy="82" rx="42" ry="12" fill="#eceff1" />
        {[38, 56, 74].map((cx, i) => (
          <g key={cx} transform={`translate(${cx} ${74 + (i % 2) * 3})`}>
            <path d="M-15 5 Q0 -12 15 5 Q0 11 -15 5 Z" fill="#f0e6c8" />
            <path d="M-15 5 Q0 9 15 5 Q0 13 -15 5 Z" fill="#c9a24a" />
            <g fill="#e0d0a8">
              <path d="M-11 1 l3 -5 l3 5 Z" />
              <path d="M-4 -1 l3 -5 l3 5 Z" />
              <path d="M3 -1 l3 -5 l3 5 Z" />
              <path d="M9 1 l2.5 -4 l2.5 4 Z" />
            </g>
          </g>
        ))}
        <g transform="translate(90 66)">
          <ellipse cx="0" cy="2" rx="11" ry="6" fill="#455a64" />
          <ellipse cx="0" cy="1" rx="8" ry="4" fill="#3e2723" />
        </g>
      </g>
    </svg>
  );
}

/* Wrap — rolled burrito, diagonally cut, filling showing. */
function Wrap({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={22} />
      <g transform="rotate(-7 60 74)">
        <defs>
          <linearGradient id={`${id}-t`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d9b877" />
            <stop offset="1" stopColor="#ecd39a" />
          </linearGradient>
        </defs>
        <path d="M46 52 L44 100 Q44 103 48 103 L72 103 Q76 103 76 100 L74 52 Z" fill={`url(#${id}-t)`} />
        <path d="M44 100 Q44 103 48 103 L72 103 Q76 103 76 100 L75 92 L45 92 Z" fill="#cfd8dc" />
        <path d="M45 92 L75 92 L74.6 96 L45.4 96 Z" fill="#b0bec5" />
        <g transform="translate(60 52) rotate(-18)">
          <ellipse cx="0" cy="0" rx="17" ry="7" fill="#e8c98a" />
          <ellipse cx="0" cy="-0.5" rx="13" ry="5" fill="#fff8e1" />
          <ellipse cx="-5" cy="-1" rx="4" ry="2.4" fill="#6d4c41" />
          <ellipse cx="5" cy="0" rx="3.5" ry="2.2" fill="#e53935" />
          <ellipse cx="1" cy="-2" rx="3" ry="1.8" fill="#7cb342" />
        </g>
      </g>
    </svg>
  );
}

/* Brot — rustic scored loaf on a board. */
function Brot({ id, ...svg }: SvgProps) {
  return (
    <svg {...svg}>
      <Ground rx={34} />
      <g transform="rotate(-5 60 70)">
        <defs>
          <linearGradient id={`${id}-c`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#a5682c" />
            <stop offset="1" stopColor="#d99a4e" />
          </linearGradient>
        </defs>
        <ellipse cx="60" cy="92" rx="40" ry="7" fill="#8d6e63" opacity="0.6" />
        <path d="M24 74 Q24 52 60 52 Q96 52 96 74 Q96 86 60 86 Q24 86 24 74 Z" fill={`url(#${id}-c)`} />
        <g stroke="#8a531f" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.75">
          <path d="M40 62 L48 74" />
          <path d="M54 60 L62 72" />
          <path d="M68 61 L76 73" />
        </g>
        <g fill="#f5deb3" opacity="0.5">
          <circle cx="46" cy="70" r="1.4" />
          <circle cx="60" cy="67" r="1.4" />
          <circle cx="72" cy="69" r="1.4" />
        </g>
      </g>
    </svg>
  );
}
