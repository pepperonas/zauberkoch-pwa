/** Shopping list: check with elastic animation, drag reorder, export/share. */

import { AnimatePresence, motion, useReducedMotion, Reorder } from 'motion/react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, IconButton } from '../components/ui';
import { t } from '../i18n';
import { api } from '../lib/api';
import type { ShoppingItem } from '../lib/types';
import { spring, springBouncy } from '../motion/springs';
import { useShoppingUndo } from '../state/useShoppingUndo';

function itemLabel(item: ShoppingItem): string {
  const menge = item.menge != null ? `${new Intl.NumberFormat('de-DE').format(item.menge)} ${item.einheit}`.trim() : '';
  return menge ? `${menge} ${item.name}` : item.name;
}

export function ShoppingPage() {
  const reduced = useReducedMotion();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [order, setOrder] = useState<ShoppingItem[]>([]);

  const list = useQuery({ queryKey: ['shopping'], queryFn: () => api.shopping() });

  useEffect(() => {
    if (list.data) setOrder(list.data.items);
  }, [list.data]);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['shopping'] });

  const { withUndo } = useShoppingUndo();

  const check = useMutation({
    mutationFn: ({ id, checked }: { id: number; checked: boolean }) => api.shoppingCheck(id, checked),
    onSuccess: invalidate,
  });
  const add = useMutation({ mutationFn: (name: string) => api.shoppingAdd(name), onSuccess: invalidate });
  const reorder = useMutation({ mutationFn: (ids: number[]) => api.shoppingReorder(ids) });

  const deleteItem = (item: ShoppingItem) => void withUndo(t('shopping.itemDeleted'), () => api.shoppingDelete(item.id));
  const clearChecked = () => void withUndo(t('shopping.checkedCleared'), () => api.shoppingClearChecked());
  const clearAll = () => void withUndo(t('shopping.listCleared'), () => api.shoppingClearAll());

  const submit = () => {
    const name = input.trim();
    if (name) add.mutate(name);
    setInput('');
  };

  const onReorderEnd = () => reorder.mutate(order.map((i) => i.id));

  const exportList = async () => {
    const text = `${t('shopping.exportTitle')}:\n${order.filter((i) => !i.checked).map((i) => `- ${itemLabel(i)}`).join('\n')}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: t('shopping.exportTitle'), text });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  const anyChecked = order.some((i) => i.checked);

  return (
    <div>
      <h1 className="page__title">{t('shopping.title')}</h1>
      <div className="stack">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={t('shopping.addPlaceholder')}
          aria-label={t('shopping.addPlaceholder')}
        />

        {list.isLoading ? (
          <p className="muted">{t('common.loading')}</p>
        ) : order.length === 0 ? (
          <p className="muted">{t('shopping.empty')}</p>
        ) : (
          <Reorder.Group axis="y" values={order} onReorder={setOrder} as="div" style={{ listStyle: 'none' }}>
            <AnimatePresence>
              {order.map((item) => (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  as="div"
                  onDragEnd={onReorderEnd}
                  transition={spring}
                  exit={reduced ? undefined : { opacity: 0, x: -40 }}
                  whileDrag={{ scale: 1.03, boxShadow: 'var(--elev-2)' }}
                  style={{ borderRadius: 'var(--shape-md)', background: 'var(--c-surface)' }}
                >
                  <div className={`zutat ${item.checked ? 'zutat--checked' : ''}`}>
                    <motion.button
                      className="zutat__check"
                      aria-pressed={item.checked}
                      aria-label={itemLabel(item)}
                      onClick={() => check.mutate({ id: item.id, checked: !item.checked })}
                      whileTap={reduced ? undefined : { scale: 0.8 }}
                      transition={springBouncy}
                      style={item.checked ? { background: 'var(--c-primary)', borderColor: 'var(--c-primary)' } : undefined}
                    >
                      {item.checked && (
                        <motion.svg width="16" height="16" viewBox="0 0 16 16">
                          <motion.path
                            d="M3 8.5 L6.5 12 L13 4.5"
                            stroke="var(--c-on-primary)"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            fill="none"
                            initial={reduced ? undefined : { pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.28, ease: 'easeOut' }}
                          />
                        </motion.svg>
                      )}
                    </motion.button>
                    <span className="zutat__label">
                      {item.menge != null && (
                        <span className="zutat__menge">
                          {new Intl.NumberFormat('de-DE').format(item.menge)} {item.einheit}
                        </span>
                      )}
                      {item.name}
                      {item.checked && !reduced && (
                        <motion.span
                          className="zutat__strike"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={spring}
                        />
                      )}
                    </span>
                    <IconButton label={t('common.delete')} onClick={() => deleteItem(item)}>
                      ✕
                    </IconButton>
                    <span className="muted" aria-hidden style={{ cursor: 'grab' }}>⋮⋮</span>
                  </div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}

        {order.length > 0 && (
          <div className="actions" style={{ marginTop: 0 }}>
            <Button variant="outlined" onClick={() => void exportList()}>📤 {t('shopping.export')}</Button>
            {anyChecked && (
              <Button variant="tonal" onClick={clearChecked}>
                🧹 {t('shopping.clearChecked')}
              </Button>
            )}
            <Button variant="danger" onClick={clearAll}>
              🗑 {t('shopping.clearAll')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
