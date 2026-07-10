/** Generic undo for destructive shopping-list operations:
 * snapshot the list, run the op, offer restore via /shopping/replace.
 */

import { useQueryClient } from '@tanstack/react-query';

import { useSnackbar } from '../components/ui/Snackbar';
import { t } from '../i18n';
import { api } from '../lib/api';
import type { ShoppingItem } from '../lib/types';

export function useShoppingUndo() {
  const queryClient = useQueryClient();
  const { show } = useSnackbar();

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['shopping'] });

  /** Run a destructive list operation with an undo snackbar. */
  const withUndo = async (message: string, op: () => Promise<unknown>) => {
    const cached = queryClient.getQueryData<{ items: ShoppingItem[] }>(['shopping']);
    const snapshot = cached?.items ?? (await api.shopping()).items;
    await op();
    invalidate();
    show(message, {
      actionLabel: t('undo'),
      onAction: async () => {
        await api.shoppingReplace(
          snapshot.map(({ name, menge, einheit, checked }) => ({ name, menge, einheit, checked })),
        );
        invalidate();
      },
    });
  };

  return { withUndo };
}
