/**
 * Per-key async serial queue: ensures operations targeting the same key
 * (e.g. the same players.json file) never run interleaved, preventing
 * read-modify-write lost updates on concurrent access.
 *
 * IMPORTANT: `task` must be synchronous, or resolve without awaiting
 * further unrelated I/O (Discord calls, other file locks, etc.). Only the
 * read -> mutate -> write of the locked resource should happen inside it.
 * Awaiting something that re-acquires the same key inside `task` will
 * deadlock; awaiting unrelated I/O inside `task` holds the lock longer
 * than necessary and defeats the purpose of a narrow critical section.
 */
const chains = new Map<string, Promise<unknown>>();

export function withFileLock<T>(key: string, task: () => T | Promise<T>): Promise<T> {
  const previous = chains.get(key) ?? Promise.resolve();
  const run = previous.catch(() => {}).then(task);
  chains.set(key, run.catch(() => {}));
  return run;
}
