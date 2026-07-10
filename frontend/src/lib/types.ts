/** API types — mirror backend/app/schemas/recipe.py */

export type Modus = 'kochen' | 'cocktail';
export type Schwierigkeit = 'einfach' | 'mittel' | 'anspruchsvoll';

export interface Zutat {
  menge: number | string | null;
  einheit: string;
  name: string;
  gruppe: string;
}

export interface Schritt {
  nr: number;
  titel: string;
  text: string;
  dauer_sek: number | null;
}

export interface Naehrwerte {
  kalorien_kcal: number | null;
  eiweiss_g: number | null;
  fett_g: number | null;
  kohlenhydrate_g: number | null;
}

export interface Recipe {
  titel: string;
  teaser: string;
  kueche: string;
  tags: string[];
  portionen: number;
  zeit_aktiv: number;
  zeit_gesamt: number;
  schwierigkeit: Schwierigkeit;
  zutaten: Zutat[];
  schritte: Schritt[];
  tipps: string[];
  naehrwerte: Naehrwerte | null;
  glas: string | null;
  garnitur: string | null;
}

export interface RecipeMeta {
  titel: string;
  teaser: string;
  kueche: string;
  tags: string[];
  portionen: number;
  zeit_aktiv: number;
  zeit_gesamt: number;
  schwierigkeit: Schwierigkeit;
}

export interface GenerateParams {
  modus: Modus;
  kueche?: string;
  kueche_freitext?: string;
  geschmack?: string[];
  vegetarisch?: boolean;
  vegan?: boolean;
  glutenfrei?: boolean;
  laktosefrei?: boolean;
  max_zeit_min?: number | null;
  schwierigkeit?: Schwierigkeit | null;
  personen?: number;
  vorhandene_zutaten?: string[];
  basis_spirituose?: string;
  alkoholfrei?: boolean;
  glas_vorgabe?: string;
  ueberrasch_mich?: boolean;
  regenerate?: boolean;
}

export interface Me {
  id: number;
  email: string;
  name: string;
  picture_url: string;
  adult_confirmed: boolean;
  csrf_token: string;
}

export interface RecipeListItem {
  id: number;
  mode: Modus;
  titel: string;
  teaser: string;
  kueche: string;
  tags: string[];
  zeit_gesamt: number | null;
  schwierigkeit: Schwierigkeit | null;
  is_favorite: boolean;
  created_at: string;
}

export interface RecipeDetail {
  id: number;
  mode: Modus;
  recipe: Recipe;
  is_favorite: boolean;
  created_at: string;
}

export interface ShoppingItem {
  id: number;
  name: string;
  menge: number | null;
  einheit: string;
  checked: boolean;
  position: number;
}

export interface ApiError {
  code: string;
  message: string;
  retry_after?: number;
}
