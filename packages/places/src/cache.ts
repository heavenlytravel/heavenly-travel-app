/**
 * A small in-memory memo with a time-to-live, for the per-query autocomplete
 * cache the plan asks for. One instance per server process; on serverless
 * that is per warm instance, which still absorbs most of the repeat traffic
 * from one person typing. Concurrent calls for the same key share one
 * promise, and a rejected promise is forgotten so the next call retries.
 */
/**
 * A plain store with a time-to-live and a size limit, for answers worked
 * out from several calls: the nearest zone of an address, kept a day. One
 * instance per server process, as `memoize`.
 */
export function ttlStore<T>({
  ttlMs,
  max,
  now = Date.now,
}: {
  ttlMs: number;
  max: number;
  now?: () => number;
}) {
  const entries = new Map<string, { expires: number; value: T }>();
  return {
    get(key: string): T | undefined {
      const hit = entries.get(key);
      if (!hit) return undefined;
      if (hit.expires > now()) return hit.value;
      entries.delete(key);
      return undefined;
    },
    set(key: string, value: T) {
      entries.delete(key);
      entries.set(key, { expires: now() + ttlMs, value });
      if (entries.size > max) {
        // Map iterates in insertion order, so the first key is the oldest.
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
    },
  };
}

export function memoize<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
  {
    key,
    ttlMs,
    max,
    now = Date.now,
  }: {
    /** Which of the arguments identify an answer. */
    key: (args: NoInfer<A>) => string;
    ttlMs: number;
    max: number;
    now?: () => number;
  },
) {
  const entries = new Map<string, { expires: number; value: Promise<T> }>();

  return (...args: A): Promise<T> => {
    const k = key(args);
    const hit = entries.get(k);
    if (hit && hit.expires > now()) return hit.value;
    entries.delete(k);

    const value = fn(...args).catch((error: unknown) => {
      entries.delete(k);
      throw error;
    });
    entries.set(k, { expires: now() + ttlMs, value });

    if (entries.size > max) {
      // Map iterates in insertion order, so the first key is the oldest.
      const oldest = entries.keys().next().value;
      if (oldest !== undefined) entries.delete(oldest);
    }
    return value;
  };
}
