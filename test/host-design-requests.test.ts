import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { requestsDir } from "../src/core/design-requests";
import { type Project, projectAt } from "../src/core/store";

// A minimal editor: documents, tabs and the events DesignRequests listens to.
type Listener<T> = (event: T) => void;
interface FakeUri {
  scheme: string;
  fsPath: string;
  toString(): string;
}
interface FakeDocument {
  uri: FakeUri;
  text: string;
  isDirty: boolean;
  isClosed: boolean;
  saves: number;
  getText(): string;
  save(): Promise<boolean>;
}
const fileUri = (fsPath: string): FakeUri => ({ scheme: "file", fsPath, toString: () => `file://${fsPath}` });
const listeners = {
  active: [] as Listener<unknown>[],
  change: [] as Listener<{ document: FakeDocument; contentChanges: unknown[] }>[],
  tabs: [] as Listener<{ closed: unknown[] }>[],
  deleted: [] as Listener<FakeUri>[],
};
const subscribe = <T>(list: Listener<T>[]) => (fn: Listener<T>) => {
  list.push(fn);
  return { dispose: () => void list.splice(list.indexOf(fn), 1) };
};
const documents: FakeDocument[] = [];
const shown: Array<{ path: string; preview: boolean | undefined }> = [];
const contexts: Array<[string, unknown]> = [];
const warnings: string[] = [];
let active: FakeDocument | undefined;

function openDocument(fsPath: string): FakeDocument {
  const existing = documents.find((d) => d.uri.fsPath === fsPath);
  if (existing) {
    existing.isClosed = false;
    return existing;
  }
  const document: FakeDocument = {
    uri: fileUri(fsPath),
    text: existsSync(fsPath) ? readFileSync(fsPath, "utf8") : "",
    isDirty: false,
    isClosed: false,
    saves: 0,
    getText() {
      return this.text;
    },
    async save() {
      this.saves++;
      writeFileSync(this.uri.fsPath, this.text);
      this.isDirty = false;
      return true;
    },
  };
  documents.push(document);
  return document;
}

/** The developer types into `document`: it becomes dirty and the editor reports the change. */
function type(document: FakeDocument, text: string) {
  document.text += text;
  document.isDirty = true;
  for (const fn of listeners.change) fn({ document, contentChanges: [{ text }] });
}

/** The developer focuses `document`, or no editor at all. */
function focus(document: FakeDocument | undefined) {
  active = document;
  for (const fn of listeners.active) fn(document);
}

class TabInputText {
  constructor(readonly uri: FakeUri) {}
}
interface FakeTab {
  input: TabInputText;
  readonly isDirty: boolean;
}
const tabs: FakeTab[] = [];
const closed: FakeTab[] = [];
/** The tabs go, by Trama or by the developer, and the editor reports it. */
function closeTabs(toClose: FakeTab[]) {
  for (const tab of toClose) {
    closed.push(tab);
    tabs.splice(tabs.indexOf(tab), 1);
  }
  // A document without tabs is closed, its unsaved changes dropped as if the developer refused to save them.
  for (const document of documents) {
    if (!tabs.some((tab) => tab.input.uri.fsPath === document.uri.fsPath) && toClose.some((tab) => tab.input.uri.fsPath === document.uri.fsPath)) {
      document.isClosed = true;
      document.isDirty = false;
    }
  }
  for (const fn of listeners.tabs) fn({ closed: toClose });
}
const tabOf = (document: FakeDocument): FakeTab => ({
  input: new TabInputText(document.uri),
  get isDirty() {
    return document.isDirty;
  },
});

mock.module("vscode", () => ({
  window: {
    onDidChangeActiveTextEditor: subscribe(listeners.active),
    get activeTextEditor() {
      return active ? { document: active } : undefined;
    },
    showTextDocument: async (uri: FakeUri, options: { preview?: boolean }) => {
      shown.push({ path: uri.fsPath, preview: options.preview });
      const document = openDocument(uri.fsPath);
      tabs.push(tabOf(document));
      focus(document);
    },
    showWarningMessage: (message: string) => void warnings.push(message),
    tabGroups: {
      get all() {
        return [{ tabs }];
      },
      close: async (toClose: FakeTab[]) => {
        closeTabs(toClose);
        return true;
      },
      onDidChangeTabs: subscribe(listeners.tabs),
    },
  },
  workspace: {
    onDidChangeTextDocument: subscribe(listeners.change),
    get textDocuments() {
      return documents;
    },
    createFileSystemWatcher: () => ({ onDidCreate() {}, onDidChange() {}, onDidDelete: subscribe(listeners.deleted), dispose() {} }),
    getConfiguration: () => ({ get: (_key: string, fallback: unknown) => fallback }),
  },
  Uri: { file: fileUri },
  TabInputText,
  commands: { executeCommand: async (id: string, ...args: unknown[]) => void (id === "setContext" && contexts.push([args[0] as string, args[1]])) },
  env: { appName: "Visual Studio Code" },
}));

const { DesignRequests, SAVE_DELAY_MS, SENT_KEY } = await import("../extension/src/host/design-requests");
type Launch = Awaited<ReturnType<typeof import("../extension/src/host/agent").launchAgent>>;

/** The extension's workspace state. */
class FakeMemento {
  readonly values = new Map<string, unknown>();
  get<T>(key: string, fallback: T): T {
    return (this.values.get(key) as T | undefined) ?? fallback;
  }
  async update(key: string, value: unknown) {
    this.values.set(key, value);
  }
}

/** Every instruction sent, with the title announced; `outcome` is how the next ones leave. */
const launches: Array<{ root: string; instruction: string; title: string | undefined }> = [];
let outcome: Launch = "terminal";
const launch = async (root: string, instruction: string, title?: string): Promise<Launch> => {
  launches.push({ root, instruction, title });
  return outcome;
};

let dir: string;
let p: Project;
let state: FakeMemento;
let requests: InstanceType<typeof DesignRequests>;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-host-requests-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
  state = new FakeMemento();
  requests = new DesignRequests(state as never, () => p, launch);
});
afterAll(() => {
  requests.dispose();
  rmSync(dir, { recursive: true, force: true });
});
afterEach(() => {
  rmSync(requestsDir(p), { recursive: true, force: true });
  documents.length = 0;
  tabs.length = 0;
  closed.length = 0;
  shown.length = 0;
  warnings.length = 0;
  launches.length = 0;
  state.values.clear();
  outcome = "terminal";
  focus(undefined);
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const lastContext = () => contexts.filter(([key]) => key === "trama.designRequest").at(-1)?.[1];
const idOf = (document: FakeDocument) => basename(document.uri.fsPath, ".md");

/** Design… followed by the developer typing `text`. */
async function writeRequest(text: string): Promise<FakeDocument> {
  await requests.write();
  const document = active as FakeDocument;
  type(document, text);
  return document;
}

describe("Design… creates the request file", () => {
  test("writes an empty file named after the date and time and opens it in a tab that is not a preview", async () => {
    await requests.write();
    const files = readdirSync(requestsDir(p)).filter((f) => f !== ".gitignore");
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.md$/);
    const file = join(requestsDir(p), files[0] as string);
    expect(readFileSync(file, "utf8")).toBe("");
    expect(shown).toEqual([{ path: file, preview: false }]);
    expect(lastContext()).toBe(true);
  });
});

describe("Trama saves a request by itself", () => {
  test("saves once, about 300 ms after the last change, exactly as written", async () => {
    await requests.write();
    const document = active as FakeDocument;
    type(document, "# Returns\n");
    await sleep(SAVE_DELAY_MS / 2);
    type(document, "  trailing spaces  \n");
    await sleep(SAVE_DELAY_MS / 2);
    expect(document.saves).toBe(0);
    await sleep(SAVE_DELAY_MS);
    expect(document.saves).toBe(1);
    expect(readFileSync(document.uri.fsPath, "utf8")).toBe("# Returns\n  trailing spaces  \n");
  });

  test("a request left on disk and reopened behaves like one Design… opened", async () => {
    await requests.write();
    const file = (active as FakeDocument).uri.fsPath;
    documents.length = 0;
    focus(undefined);
    expect(lastContext()).toBe(false);
    const reopened = openDocument(file);
    focus(reopened);
    expect(lastContext()).toBe(true);
    type(reopened, "more");
    await sleep(SAVE_DELAY_MS + 100);
    expect(reopened.saves).toBe(1);
  });

  test("leaves every other document alone", async () => {
    const other = openDocument(join(dir, "notes.md"));
    focus(other);
    expect(lastContext()).toBe(false);
    type(other, "text");
    await sleep(SAVE_DELAY_MS + 100);
    expect(other.saves).toBe(0);
  });
});

describe("Send to agent", () => {
  test("shows only on requests never sent", async () => {
    const document = await writeRequest("# Returns\n");
    expect(lastContext()).toBe(true);
    await requests.send();
    const reopened = openDocument(document.uri.fsPath);
    focus(reopened);
    expect(lastContext()).toBe(false);
  });

  test("an empty text sends nothing, warns and keeps the tab", async () => {
    const document = await writeRequest("  \n\t\n");
    await requests.send();
    expect(warnings).toEqual(["Trama: write the design request before sending it."]);
    expect(launches).toHaveLength(0);
    expect(closed).toHaveLength(0);
    expect(state.get<string[]>(SENT_KEY, [])).toEqual([]);
    expect(lastContext()).toBe(true);
    expect(existsSync(document.uri.fsPath)).toBe(true);
  });

  test("saves, sends the instruction naming the file with the request's title, marks it sent and closes its tab", async () => {
    const document = await writeRequest("```\n# Not a title\n```\n# Returns after shipping\nCustomers may send an order back.\n");
    await requests.send(document.uri as never);
    const id = idOf(document);
    expect(readFileSync(document.uri.fsPath, "utf8")).toBe(document.text);
    expect(launches).toEqual([
      {
        root: dir,
        instruction: `Use the trama-design skill on the design request in \`.trama/requests/${id}.md\`. Bind the first Proposal you open to it with \`--request ${id}\`.`,
        title: "Returns after shipping",
      },
    ]);
    expect(state.get<string[]>(SENT_KEY, [])).toEqual([id]);
    expect(closed.map((tab) => tab.input.uri.fsPath)).toEqual([document.uri.fsPath]);
    expect(warnings).toHaveLength(0);
  });

  test("an instruction that does not leave marks nothing and keeps the tab", async () => {
    for (const result of [undefined, "not-sent"] as const) {
      outcome = result;
      await writeRequest("# Returns\n");
      await requests.send();
      expect(state.get<string[]>(SENT_KEY, [])).toEqual([]);
      expect(closed).toHaveLength(0);
      expect(lastContext()).toBe(true);
    }
    expect(launches).toHaveLength(2);
  });

  test("the chat's fallbacks count as sent", async () => {
    for (const result of ["sent", "confirm", "clipboard"] as const) {
      outcome = result;
      const document = await writeRequest("# Returns\n");
      await requests.send();
      expect(state.get<string[]>(SENT_KEY, [])).toContain(idOf(document));
    }
  });

  test("a request is sent at most once", async () => {
    const document = await writeRequest("# Returns\n");
    await requests.send();
    const reopened = openDocument(document.uri.fsPath);
    tabs.push(tabOf(reopened));
    focus(reopened);
    type(reopened, "more\n");
    await requests.send();
    expect(launches).toHaveLength(1);
  });

  test("pressing it twice while the first instruction is still leaving sends once", async () => {
    await writeRequest("# Returns\n");
    const first = requests.send();
    const second = requests.send();
    await Promise.all([first, second]);
    expect(launches).toHaveLength(1);
  });
});

describe("the list of sent requests", () => {
  test("survives a restart and forgets the requests whose file is gone", async () => {
    const kept = await writeRequest("# Kept\n");
    await requests.send();
    const gone = await writeRequest("# Gone\n");
    await requests.send();
    rmSync(gone.uri.fsPath);
    const restarted = new DesignRequests(state as never, () => p, launch);
    restarted.dispose();
    expect(state.get<string[]>(SENT_KEY, [])).toEqual([idOf(kept)]);
    focus(openDocument(kept.uri.fsPath));
    const again = new DesignRequests(state as never, () => p, launch);
    again.dispose();
    expect(lastContext()).toBe(false);
  });
});

describe("closing the tab of a request", () => {
  const tabsShowing = (document: FakeDocument) => tabs.filter((tab) => tab.input.uri.fsPath === document.uri.fsPath);
  const settle = () => sleep(10);

  test("sends a request never sent with the text on disk, and marks it sent", async () => {
    const document = await writeRequest("# On disk\n");
    await document.save();
    document.text += "unsaved, then refused\n";
    closeTabs(tabsShowing(document));
    await settle();
    expect(launches).toHaveLength(1);
    expect(launches[0]?.title).toBe("On disk");
    expect(launches[0]?.instruction).toContain(`.trama/requests/${idOf(document)}.md`);
    expect(state.get<string[]>(SENT_KEY, [])).toEqual([idOf(document)]);
    expect(existsSync(document.uri.fsPath)).toBe(true);
  });

  test("counts only when no other tab shows the same file", async () => {
    const document = await writeRequest("# Two tabs\n");
    await document.save();
    tabs.push(tabOf(document));
    closeTabs([tabsShowing(document)[0] as FakeTab]);
    await settle();
    expect(launches).toHaveLength(0);
    closeTabs(tabsShowing(document));
    await settle();
    expect(launches).toHaveLength(1);
  });

  test("an instruction that does not leave keeps the request on disk, unsent", async () => {
    outcome = undefined;
    const document = await writeRequest("# Cancelled\n");
    await document.save();
    closeTabs(tabsShowing(document));
    await settle();
    expect(launches).toHaveLength(1);
    expect(state.get<string[]>(SENT_KEY, [])).toEqual([]);
    expect(existsSync(document.uri.fsPath)).toBe(true);
  });

  test("an empty text on disk deletes the file without a word and sends nothing", async () => {
    const document = await writeRequest("typed but never saved");
    closeTabs(tabsShowing(document));
    await settle();
    expect(existsSync(document.uri.fsPath)).toBe(false);
    expect(launches).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  test("a request already sent is neither sent nor deleted, even when empty", async () => {
    const document = await writeRequest("# Sent\n");
    await requests.send();
    expect(launches).toHaveLength(1);
    const reopened = openDocument(document.uri.fsPath);
    reopened.text = "";
    await reopened.save();
    tabs.push(tabOf(reopened));
    closeTabs(tabsShowing(reopened));
    await settle();
    expect(launches).toHaveLength(1);
    expect(existsSync(document.uri.fsPath)).toBe(true);
  });

  test("Send to agent closes the tab without sending a second time", async () => {
    await writeRequest("# Once\n");
    await requests.send();
    await settle();
    expect(closed).toHaveLength(1);
    expect(launches).toHaveLength(1);
  });

  test("a file deleted from outside sends nothing, and its tab closes only without unsaved changes", async () => {
    const clean = await writeRequest("# Clean\n");
    await clean.save();
    const dirty = await writeRequest("# Dirty\n");
    for (const document of [clean, dirty]) {
      rmSync(document.uri.fsPath);
      for (const fn of listeners.deleted) fn(document.uri);
    }
    await settle();
    expect(tabsShowing(clean)).toHaveLength(0);
    expect(tabsShowing(dirty)).toHaveLength(1);
    expect(launches).toHaveLength(0);
    await sleep(SAVE_DELAY_MS + 100);
    expect(dirty.saves).toBe(0);
    expect(existsSync(dirty.uri.fsPath)).toBe(false);
  });
});
