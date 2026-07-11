/** Ingredient name -> emoji for the conjuring stage (keyword match, German). */

import type { Modus } from './types';

const MAP: [string, string][] = [
  ['tomate', '🍅'],
  ['zwiebel', '🧅'],
  ['knoblauch', '🧄'],
  ['zitrone', '🍋'],
  ['limette', '🍋'],
  ['orange', '🍊'],
  ['apfel', '🍎'],
  ['banane', '🍌'],
  ['ananas', '🍍'],
  ['kokos', '🥥'],
  ['erdbeer', '🍓'],
  ['himbeer', '🍓'],
  ['beere', '🫐'],
  ['kirsch', '🍒'],
  ['pfirsich', '🍑'],
  ['mango', '🥭'],
  ['avocado', '🥑'],
  ['gurke', '🥒'],
  ['spinat', '🥬'],
  ['salat', '🥬'],
  ['kohl', '🥬'],
  ['brokkoli', '🥦'],
  ['paprika', '🫑'],
  ['chili', '🌶️'],
  ['mais', '🌽'],
  ['karotte', '🥕'],
  ['möhre', '🥕'],
  ['kartoffel', '🥔'],
  ['aubergine', '🍆'],
  ['pilz', '🍄'],
  ['champignon', '🍄'],
  ['ingwer', '🫚'],
  ['erbse', '🫛'],
  ['bohne', '🫘'],
  ['oliven', '🫒'],
  ['öl', '🫒'],
  ['basilikum', '🌿'],
  ['petersilie', '🌿'],
  ['minze', '🌿'],
  ['kräuter', '🌿'],
  ['thymian', '🌿'],
  ['rosmarin', '🌿'],
  ['salbei', '🌿'],
  ['koriander', '🌿'],
  ['reis', '🍚'],
  ['nudel', '🍝'],
  ['pasta', '🍝'],
  ['spaghetti', '🍝'],
  ['brot', '🍞'],
  ['mehl', '🌾'],
  ['butter', '🧈'],
  ['milch', '🥛'],
  ['sahne', '🥛'],
  ['joghurt', '🥛'],
  ['käse', '🧀'],
  ['parmesan', '🧀'],
  ['huhn', '🍗'],
  ['hähnchen', '🍗'],
  ['hühner', '🍗'],
  ['rind', '🥩'],
  ['schwein', '🥩'],
  ['steak', '🥩'],
  ['hack', '🥩'],
  ['speck', '🥓'],
  ['schinken', '🥓'],
  ['fisch', '🐟'],
  ['lachs', '🐟'],
  ['thunfisch', '🐟'],
  ['garnele', '🦐'],
  ['shrimp', '🦐'],
  ['salz', '🧂'],
  ['pfeffer', '🧂'],
  ['zucker', '🍬'],
  ['honig', '🍯'],
  ['sirup', '🍯'],
  ['schoko', '🍫'],
  ['kakao', '🍫'],
  ['wein', '🍷'],
  ['sekt', '🍾'],
  ['prosecco', '🍾'],
  ['champagner', '🍾'],
  ['bier', '🍺'],
  ['gin', '🥃'],
  ['rum', '🥃'],
  ['whisk', '🥃'],
  ['wodka', '🥃'],
  ['vodka', '🥃'],
  ['tequila', '🥃'],
  ['likör', '🥃'],
  ['kaffee', '☕'],
  ['espresso', '☕'],
  ['tee', '🍵'],
  ['saft', '🧃'],
  ['eiswürfel', '🧊'],
  ['crushed ice', '🧊'],
  ['wasser', '💧'],
  ['soda', '🫧'],
  ['tonic', '🫧'],
];

/** Short/ambiguous keywords: word-prefix only ("Ei" yes, "Fleisch"/"Wein" no). */
const PREFIX_MAP: [string, string][] = [
  ['eis', '🧊'],
  ['ei', '🥚'],
];

const FALLBACK = ['✨', '🌟', '🫧'];

export function emojiForZutat(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, emoji] of MAP) {
    if (lower.includes(keyword)) return emoji;
  }
  const words = lower.split(/[^a-zäöüß]+/);
  for (const [keyword, emoji] of PREFIX_MAP) {
    if (words.some((w) => w.startsWith(keyword))) return emoji;
  }
  return FALLBACK[name.length % FALLBACK.length];
}

/** Idle emojis orbiting the vessel before real ingredients arrive. */
export const ORBIT_EMOJIS: Record<Modus, string[]> = {
  kochen: ['🥕', '🧄', '🍅', '🌿', '🧅', '🍋'],
  cocktail: ['🍋', '🌿', '🧊', '🍒', '🍊', '🍓'],
};
