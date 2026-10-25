import type * as vscode from "vscode";

// No runtime import of the editor: omp's launchers (`model-lists`, `omp-update`, the ACP client) read the key through here and run outside the editor in tests.

/** The key of the editor's secret storage that holds the Cursor API key: one per user, shared by every window and project. */
export const CURSOR_API_KEY_SECRET = "trama.cursorApiKey";

/** The variable omp 18.12.6 reads to list the models of the `cursor` provider. Its name lives only here. */
const CURSOR_VARIABLE = "CURSOR_ACCESS_TOKEN";

let storage: vscode.SecretStorage | undefined;
/** The key as last read or saved by this window, kept in memory only; undefined when none is saved or it could not be read. */
let key: string | undefined;
/** How many saves or removals of this window are under way: the change events they cause are not another window's. */
let writing = 0;
/** Tells the developer a problem of the secret storage: the editor's error message. */
let report: (message: string) => void = () => {};
const listeners = new Set<() => void>();

const reason = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** The key a stored value gives: the text without spaces around it; none when it is absent or blank. */
const keyOf = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
};

/** The environment to add to every omp process Trama starts: `CURSOR_ACCESS_TOKEN` with the saved key, which wins over the one the editor inherited; nothing without a key. */
export const cursorKeyEnv = (): Record<string, string> => (key === undefined ? {} : { [CURSOR_VARIABLE]: key });

/** Whether a key is saved: the only thing the panel is told about it. */
export const cursorKeySaved = (): boolean => key !== undefined;

/** Reads the stored key; undefined when the read failed (the failure has been reported). */
async function readStored(secrets: vscode.SecretStorage): Promise<{ value: string | undefined } | undefined> {
  try {
    return { value: keyOf(await secrets.get(CURSOR_API_KEY_SECRET)) };
  } catch (error) {
    report(`Trama: could not read the Cursor API key: ${reason(error)}.`);
    return undefined;
  }
}

/**
 * Starts following the key in `secrets`: reads it now (a failed read is reported to `tell`, once per read, and leaves omp starting without the key) and again at every change of
 * that secret that this window did not make. Dispose to stop. The key is kept in memory only.
 */
export async function startCursorApiKey(secrets: vscode.SecretStorage, tell: (message: string) => void): Promise<vscode.Disposable> {
  storage = secrets;
  report = tell;
  key = undefined;
  writing = 0;
  const subscription = secrets.onDidChange((event) => {
    if (event.key !== CURSOR_API_KEY_SECRET || writing > 0) return;
    void (async () => {
      const read = await readStored(secrets);
      // A change the window itself made has already set the key in memory: only another window's changes the value.
      if (read === undefined || storage !== secrets || read.value === key) return;
      key = read.value;
      for (const listener of [...listeners]) listener();
    })();
  });
  const first = await readStored(secrets);
  if (storage === secrets && first !== undefined) key = first.value;
  return {
    dispose: () => {
      subscription.dispose();
      if (storage !== secrets) return;
      storage = undefined;
      key = undefined;
    },
  };
}

/** Calls `listener` when another window of the editor saved, changed or removed the key and this window has read the new state. */
export function onCursorApiKeyChanged(listener: () => void): vscode.Disposable {
  listeners.add(listener);
  return { dispose: () => void listeners.delete(listener) };
}

/** Saves `value` (already trimmed, not blank) in place of the key there was; false, after telling the developer, when the secret storage fails: nothing changes then. */
export async function saveCursorApiKey(value: string): Promise<boolean> {
  if (storage === undefined) return false;
  writing++;
  try {
    await storage.store(CURSOR_API_KEY_SECRET, value);
    key = value;
    return true;
  } catch (error) {
    report(`Trama: could not save the Cursor API key: ${reason(error)}.`);
    return false;
  } finally {
    writing--;
  }
}

/** Removes the saved key; false, after telling the developer, when the secret storage fails: nothing changes then. The editor's own `CURSOR_ACCESS_TOKEN` is not touched. */
export async function removeCursorApiKey(): Promise<boolean> {
  if (storage === undefined) return false;
  writing++;
  try {
    await storage.delete(CURSOR_API_KEY_SECRET);
    key = undefined;
    return true;
  } catch (error) {
    report(`Trama: could not remove the Cursor API key: ${reason(error)}.`);
    return false;
  } finally {
    writing--;
  }
}
