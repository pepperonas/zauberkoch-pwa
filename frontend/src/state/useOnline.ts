/** Live network status via the browser's online/offline events.
 * useSyncExternalStore (consistent with the generation store) — no effect, no
 * re-render churn. SSR/first-paint getServerSnapshot is `true` (assume online).
 */
import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
