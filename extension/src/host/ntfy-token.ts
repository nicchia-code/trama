import type * as vscode from "vscode";

// No runtime import of the editor: the notifier and the Settings tab read the token through here and run outside the editor in tests. The token never leaves this module but
// for `ntfyToken`, which only the request that sends a notification calls; it is in no setting, file, message to the webview, log or command line.

/** The key of the editor's secret storage that holds the access token of the ntfy server: one per user, shared by every window and project. */
export const NTFY_TOKEN_SECRET = "trama.ntfyToken";

let storage: vscode.SecretStorage | undefined;
/** The token as last read by this window, kept in memory only; undefined when none is saved or it could not be read. */
let token: string | undefined;
/** How many saves or removals of this window are under way: the change events they cause are not another window's. */
let writing = 0;
/** Tells the developer a problem of the secret storage: the editor's error message. */
let report: (message: string) => void = () => {};
const listeners = new Set<() => void>();

const reason = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** The token a stored value gives: the text without spaces around it; none when it is absent or blank. */
const tokenOf = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
};

/** The saved token, for the one request that sends a notification with it; undefined when none is saved. */
export const ntfyToken = (): string | undefined => token;

/** Whether a token is saved: the only thing the panel is told about it. */
export const ntfyTokenSaved = (): boolean => token !== undefined;

/** Reads the stored token; undefined when the read failed (the failure has been reported). */
async function readStored(secrets: vscode.SecretStorage): Promise<{ value: string | undefined } | undefined> {
  try {
    return { value: tokenOf(await secrets.get(NTFY_TOKEN_SECRET)) };
  } catch (error) {
    report(`Trama: could not read the ntfy access token: ${reason(error)}.`);
    return undefined;
  }
}

/**
 * Starts following the token in `secrets`: reads it now (a failed read is reported to `tell`, once per read, and leaves notifications going without a token) and again at every
 * change of that secret that this window did not make. Dispose to stop. The token is kept in memory only.
 */
export async function startNtfyToken(secrets: vscode.SecretStorage, tell: (message: string) => void): Promise<vscode.Disposable> {
  storage = secrets;
  report = tell;
  token = undefined;
  writing = 0;
  const subscription = secrets.onDidChange((event) => {
    if (event.key !== NTFY_TOKEN_SECRET || writing > 0) return;
    void (async () => {
      const read = await readStored(secrets);
      // A change the window itself made has already set the token in memory: only another window's changes the value.
      if (read === undefined || storage !== secrets || read.value === token) return;
      token = read.value;
      for (const listener of [...listeners]) listener();
    })();
  });
  const first = await readStored(secrets);
  if (storage === secrets && first !== undefined) token = first.value;
  return {
    dispose: () => {
      subscription.dispose();
      if (storage !== secrets) return;
      storage = undefined;
      token = undefined;
    },
  };
}

/** Calls `listener` when another window of the editor saved, changed or removed the token and this window has read the new state (`editor.NTFY_TOKEN_CHANGED`). */
export function onNtfyTokenChanged(listener: () => void): vscode.Disposable {
  listeners.add(listener);
  return { dispose: () => void listeners.delete(listener) };
}

/** Saves `value` (already trimmed, not blank) in place of the token there was; false, after telling the developer, when the secret storage fails: nothing changes then. */
export async function saveNtfyToken(value: string): Promise<boolean> {
  if (storage === undefined) return false;
  writing++;
  try {
    await storage.store(NTFY_TOKEN_SECRET, value);
    token = value;
    return true;
  } catch (error) {
    report(`Trama: could not save the ntfy access token: ${reason(error)}.`);
    return false;
  } finally {
    writing--;
  }
}

/** Removes the saved token; false, after telling the developer, when the secret storage fails: nothing changes then. */
export async function removeNtfyToken(): Promise<boolean> {
  if (storage === undefined) return false;
  writing++;
  try {
    await storage.delete(NTFY_TOKEN_SECRET);
    token = undefined;
    return true;
  } catch (error) {
    report(`Trama: could not remove the ntfy access token: ${reason(error)}.`);
    return false;
  } finally {
    writing--;
  }
}
