import { useCallback, useState } from 'react';

/** useState persisted to localStorage (init from storage, write-through). */
export function useLocalStorageState<T extends string>(
  key: string,
  initial: () => T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return (stored as T) ?? initial();
  });

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
        localStorage.setItem(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, set];
}
