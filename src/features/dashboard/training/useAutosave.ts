import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveState = 'saving' | 'saved' | 'error';

/**
 * Per-item autosave: an item saves DELAY ms after its last change, or right
 * away on flush (field blur). Pending saves also run when the page is hidden
 * or the component unmounts, so switching section or app loses nothing.
 */
export function useAutosave<T>(save: (id: number, value: T) => Promise<unknown>, delay = 1200) {
  const [status, setStatus] = useState<Record<number, SaveState>>({});
  const pending = useRef(new Map<number, T>());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  });

  const run = useCallback(async (id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    if (!pending.current.has(id)) return;
    const value = pending.current.get(id) as T;
    pending.current.delete(id);

    setStatus((s) => ({ ...s, [id]: 'saving' }));
    try {
      await saveRef.current(id, value);
      // Typed again while saving: that newer value has its own save coming
      if (!pending.current.has(id)) setStatus((s) => ({ ...s, [id]: 'saved' }));
    } catch {
      if (!pending.current.has(id)) pending.current.set(id, value);
      setStatus((s) => ({ ...s, [id]: 'error' }));
    }
  }, []);

  /** Records a change and (re)starts the item's timer. */
  const change = useCallback(
    (id: number, value: T) => {
      pending.current.set(id, value);
      setStatus((s) => {
        if (!(id in s)) return s;
        const next = { ...s };
        delete next[id];
        return next;
      });
      clearTimeout(timers.current.get(id));
      timers.current.set(id, setTimeout(() => run(id), delay));
    },
    [delay, run],
  );

  /** Saves an item now if it has unsaved changes. */
  const flush = useCallback((id: number) => (pending.current.has(id) ? run(id) : undefined), [run]);

  useEffect(() => {
    const flushAll = () => [...pending.current.keys()].forEach((id) => run(id));
    const onVisibility = () => document.visibilityState === 'hidden' && flushAll();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushAll);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushAll);
      flushAll();
    };
  }, [run]);

  return { status, change, flush, retry: run };
}
