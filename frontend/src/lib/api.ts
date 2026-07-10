/** Typed API client. Session lives in an httpOnly cookie; CSRF via header. */

import type { ApiError, Me, Modus, Recipe, RecipeDetail, RecipeListItem, ShoppingItem } from './types';

let csrfToken = '';

export function setCsrfToken(token: string): void {
  csrfToken = token;
}

export function getCsrfToken(): string {
  return csrfToken;
}

export class ApiRequestError extends Error {
  status: number;
  error: ApiError;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.status = status;
    this.error = error;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method ?? 'GET';
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (method !== 'GET') headers['X-CSRF-Token'] = csrfToken;
  if (init.body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api/v1${path}`, { ...init, headers, credentials: 'same-origin' });
  if (!res.ok) {
    let error: ApiError = { code: 'unknown', message: 'Unbekannter Fehler' };
    try {
      error = (await res.json()).error ?? error;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiRequestError(res.status, error);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  me: () => request<Me>('/me'),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  confirmAdult: () => request<{ adult_confirmed: boolean }>('/me/confirm-adult', { method: 'POST' }),

  recipes: (params: { q?: string; mode?: string; favorites_only?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.mode) qs.set('mode', params.mode);
    if (params.favorites_only) qs.set('favorites_only', 'true');
    const suffix = qs.size ? `?${qs}` : '';
    return request<{ items: RecipeListItem[] }>(`/recipes${suffix}`);
  },
  recipe: (id: number) => request<RecipeDetail>(`/recipes/${id}`),
  favorite: (id: number, on: boolean) =>
    request<{ is_favorite: boolean }>(`/recipes/${id}/favorite`, { method: on ? 'PUT' : 'DELETE' }),

  shareCreate: (id: number) =>
    request<{ share_token: string; share_url: string }>(`/recipes/${id}/share`, { method: 'POST' }),
  shareRevoke: (id: number) =>
    request<{ share_token: null }>(`/recipes/${id}/share`, { method: 'DELETE' }),
  sharedGet: (token: string) =>
    request<{ mode: Modus; recipe: Recipe; share_token: string }>(`/share/${token}`),
  shareAdopt: (token: string) =>
    request<{ recipe_id: number }>(`/share/${token}/adopt`, { method: 'POST' }),

  shopping: () => request<{ items: ShoppingItem[] }>('/shopping'),
  shoppingFromRecipe: (recipe_id: number, portionen?: number) =>
    request<{ items: ShoppingItem[] }>('/shopping/from-recipe', {
      method: 'POST',
      body: JSON.stringify({ recipe_id, portionen }),
    }),
  shoppingAdd: (name: string) =>
    request<ShoppingItem>('/shopping/items', { method: 'POST', body: JSON.stringify({ name }) }),
  shoppingCheck: (id: number, checked: boolean) =>
    request<ShoppingItem>(`/shopping/items/${id}`, { method: 'PATCH', body: JSON.stringify({ checked }) }),
  shoppingDelete: (id: number) => request<{ deleted: boolean }>(`/shopping/items/${id}`, { method: 'DELETE' }),
  shoppingReorder: (ids: number[]) =>
    request<{ items: ShoppingItem[] }>('/shopping/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
  shoppingClearChecked: () =>
    request<{ items: ShoppingItem[] }>('/shopping/checked', { method: 'DELETE' }),
  shoppingClearAll: () => request<{ items: ShoppingItem[] }>('/shopping', { method: 'DELETE' }),
  shoppingReplace: (items: Pick<ShoppingItem, 'name' | 'menge' | 'einheit' | 'checked'>[]) =>
    request<{ items: ShoppingItem[] }>('/shopping/replace', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
};
