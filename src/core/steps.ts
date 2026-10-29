/**
 * Long work written once as a generator that yields between its steps, and run two ways: to its end without stopping (the command line, a short process), or with
 * the thread given back to the event loop between the steps (the editor host, which must never stay held).
 */
export type Steps<T> = Generator<void, T, void>;

/** Runs `steps` to its end in one go. */
export function drain<T>(steps: Steps<T>): T {
  for (;;) {
    const next = steps.next();
    if (next.done) return next.value;
  }
}

/** Runs `steps` to its end, giving the thread back to the event loop after every step. */
export async function drainAsync<T>(steps: Steps<T>): Promise<T> {
  for (;;) {
    const next = steps.next();
    if (next.done) return next.value;
    const { promise, resolve } = Promise.withResolvers<void>();
    setImmediate(resolve);
    await promise;
  }
}
