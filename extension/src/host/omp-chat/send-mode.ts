import type { SendMode } from "../../omp-chat-protocol";

/** The key of the Steer|Queue choice in the window's global state: never in the repository, nor in the settings. */
export const SEND_MODE_KEY = "trama.ompChatSendMode";

/** Where the choice is kept: `ExtensionContext.globalState` in the extension, a plain map in the tests. */
export interface SendModeStore {
  get(key: string): unknown;
  update(key: string, value: unknown): PromiseLike<void>;
}

/** The saved choice: Queue only when Queue was saved; an absent or other value is Steer. */
export function readSendMode(saved: unknown): SendMode {
  return saved === "queue" ? "queue" : "steer";
}

/** A store kept in memory, for a view that has no global state (the tests). */
export function memorySendModeStore(): SendModeStore {
  const values = new Map<string, unknown>();
  return {
    get: (key) => values.get(key),
    update: (key, value) => {
      values.set(key, value);
      return Promise.resolve();
    },
  };
}
