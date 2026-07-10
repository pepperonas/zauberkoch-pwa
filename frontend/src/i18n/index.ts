/** Tiny i18n layer — German only for launch, structure is i18n-ready. */
import { de, type Dict } from './de';

const dict: Dict = de;

/** t('recipe.ingredients') — dot-path lookup, typed loosely for leaf access. */
export function t(path: string): string {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, dict);
  if (typeof value === 'string') return value;
  if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${path}`);
  return path;
}

/** Direct dictionary access for arrays and function-valued entries. */
export const strings = dict;
