import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import type { launchAgent } from "../extension/src/host/agent";
import { requestsDir } from "../src/core/design-requests";
import { setManagerMode } from "../src/core/manager-mode";
import { type Project, projectAt } from "../src/core/store";
import { listProposals, newProposal, save } from "../src/core/proposals";

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
  tabs: [] as Listener<{ opened: unknown[]; closed: unknown[] }>[],
  created: [] as Listener<FakeUri>[],
  deleted: [] as Listener<FakeUri>[],
  visible: [] as Listener<unknown>[],
};

class FakeThemeColor {
  constructor(readonly id: string) {}
}
class FakeRange {
  constructor(readonly startLine: number, readonly startCharacter: number, readonly endLine: number, readonly endCharacter: number) {}
}
interface FakeDecorationType {
  options: { after: { contentText: string; color: FakeThemeColor } };
  dispose(): void;
}
interface FakeEditor {
  document: FakeDocument;
  decorations: Map<FakeDecorationType, unknown[]>;
  setDecorations(type: FakeDecorationType, ranges: unknown[]): void;
}
const editors = new Map<string, FakeEditor>();
/** The editor showing the file at `fsPath`, made once and kept, so its decorations last as in a real editor. */
function editorOf(document: FakeDocument): FakeEditor {
  let editor = editors.get(document.uri.fsPath);
  if (!editor) {
    const decorations = new Map<FakeDecorationType, unknown[]>();
    editor = { document, decorations, setDecorations: (type, ranges) => void decorations.set(type, ranges) };
    editors.set(document.uri.fsPath, editor);
  }
  return editor;
}
/** One visible editor per file with a tab. */
function visibleEditors(): FakeEditor[] {
  const paths = [...new Set(tabs.map((tab) => tab.input.uri.fsPath))];
  return paths.map((path) => editorOf(documents.find((d) => d.uri.fsPath === path) as FakeDocument));
}
const subscribe = <T>(list: Listener<T>[]) => (fn: Listener<T>) => {
  list.push(fn);
  return { dispose: () => void list.splice(list.indexOf(fn), 1) };
};
const documents: FakeDocument[] = [];
const shown: Array<{ path: string; preview: boolean | undefined }> = [];
const contexts: Array<[string, unknown]> = [];
const warnings: string[] = [];
let active: FakeDocument | undefined;
let command: ((id: string) => Promise<void>) | undefined;
/** The extension's watcher of `.trama/`; the panel is closed, so it alone reports the creation and the deletion of files. */
const tramaFiles = { onDidCreate: subscribe(listeners.created), onDidDelete: subscribe(listeners.deleted) };
/** A request file another process wrote: the watcher reports it. */
function createFile(fsPath: string) {
  for (const fn of listeners.created) fn(fileUri(fsPath));
}
function deleteFile(document: FakeDocument) {
  rmSync(document.uri.fsPath);
  for (const fn of listeners.deleted) fn(document.uri);
}

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
  for (const fn of listeners.tabs) fn({ opened: [], closed: toClose });
}
const tabOf = (document: FakeDocument): FakeTab => ({
  input: new TabInputText(document.uri),
  get isDirty() {
    return document.isDirty;
  },
});

mock.module("vscode", () => ({
  Range: FakeRange,
  ThemeColor: FakeThemeColor,
  window: {
    onDidChangeActiveTextEditor: subscribe(listeners.active),
    onDidChangeVisibleTextEditors: subscribe(listeners.visible),
    get visibleTextEditors() {
      return visibleEditors();
    },
    createTextEditorDecorationType: (options: FakeDecorationType["options"]): FakeDecorationType => ({ options, dispose() {} }),
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
    getConfiguration: () => ({
      get: (_key: string, fallback: unknown) => fallback,
      inspect: () => undefined,
      update: async () => {},
    }),
  },
  Uri: { file: fileUri },
  TabInputText,
  ConfigurationTarget: { Global: 1 },
  commands: { executeCommand: async (id: string, ...args: unknown[]) => {
    if (id === "setContext") contexts.push([args[0] as string, args[1]]);
    else await command?.(id);
  } },
  env: { appName: "Cursor" },
  extensions: { getExtension: () => undefined },
}));

const { DesignRequests, HANDOFF_KEY, SAVE_DELAY_MS, SENT_KEY, SETUP_KEY } = await import("../extension/src/host/design-requests");
const { NO_PROJECT_WARNING } = await import("../extension/src/host/project");
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

/** Every instruction sent, with its terminal's name and the title announced; `outcome` is how the next ones leave. */
type Announcement = Parameters<typeof launchAgent>[3];
const launches: Array<{ root: string; instruction: string; name: string; title: Announcement }> = [];
let outcome: Launch = "terminal";
const launch = async (root: string, instruction: string, name: string, title?: Announcement, _canSend?: () => boolean): Promise<Launch> => {
  launches.push({ root, instruction, name, title });
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
  requests = new DesignRequests(state as never, tramaFiles as never, () => p, launch);
});
afterAll(() => {
  requests.dispose();
  rmSync(dir, { recursive: true, force: true });
});
afterEach(() => {
  rmSync(requestsDir(p), { recursive: true, force: true });
  documents.length = 0;
  tabs.length = 0;
  editors.clear();
  closed.length = 0;
  shown.length = 0;
  warnings.length = 0;
  launches.length = 0;
  state.values.clear();
  outcome = "terminal";
  command = undefined;
  focus(undefined);
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const lastContext = () => contexts.filter(([key]) => key === "trama.designRequest").at(-1)?.[1];
const idOf = (document: FakeDocument) => basename(document.uri.fsPath, ".md");

/** Add Work Item… followed by the developer typing `text`. */
async function writeRequest(text: string): Promise<FakeDocument> {
  await requests.write();
  const document = active as FakeDocument;
  type(document, text);
  return document;
}

describe("Add Work Item… creates the request file", () => {
  test("writes an empty file named after the date and time and opens it in a tab that is not a preview", async () => {
    await requests.write();
    const files = readdirSync(requestsDir(p)).filter((f) => f !== ".gitignore");
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.md$/);
    const file = join(requestsDir(p), files[0] as string);
    expect(readFileSync(file, "utf8")).toBe("");
    expect(shown).toEqual([{ path: file, preview: false }]);
    expect(contexts.filter(([key]) => key === "trama.designRequestResources").at(-1)?.[1]).toEqual({ [file]: true });
  });

  test("senza progetto Trama non crea nulla e rimanda all'inizializzazione", async () => {
    const without = new DesignRequests(state as never, tramaFiles as never, () => undefined, launch);
    await without.write();
    without.dispose();
    expect(existsSync(requestsDir(p))).toBe(false);
    expect(shown).toEqual([]);
    expect(warnings).toEqual([NO_PROJECT_WARNING]);
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

  test("a request left on disk and reopened behaves like one Add Work Item… opened", async () => {
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

describe("the editor's events do not read the disk", () => {
  const keyed = (key: string) => contexts.filter(([name]) => name === key);

  test("the context keys are sent only when their value changes", async () => {
    await requests.write();
    const request = active as FakeDocument;
    const other = openDocument(join(dir, "notes.md"));
    contexts.length = 0;
    // The same tab focused again, or a change of tab that leaves the value where it is, sends nothing.
    focus(request);
    focus(request);
    expect(contexts).toEqual([]);
    focus(other);
    expect(keyed("trama.designRequest")).toEqual([["trama.designRequest", false]]);
    expect(keyed("trama.designRequestResources")).toEqual([["trama.designRequestResources", {}]]);
    contexts.length = 0;
    focus(other);
    focus(undefined);
    expect(contexts).toEqual([]);
    focus(request);
    expect(keyed("trama.designRequest")).toEqual([["trama.designRequest", true]]);
    expect(keyed("trama.designRequestResources")).toEqual([["trama.designRequestResources", { [request.uri.fsPath]: true }]]);
  });

  test("a request file is known from the watcher of `.trama/`, not from the disk", async () => {
    await sleep(20); // The request files are listed once when the window starts; after that the watcher alone says which exist.
    await requests.write();
    const known = active as FakeDocument;
    focus(undefined);
    // A file written behind the editor's back and not reported by the watcher is not looked for on the disk when its tab is focused...
    const quiet = join(requestsDir(p), "2026-01-02T03-04-05.md");
    writeFileSync(quiet, "# Quiet\n");
    focus(openDocument(quiet));
    expect(lastContext()).toBe(false);
    // ...and it is a request to send as soon as the watcher reports it.
    createFile(quiet);
    focus(known);
    focus(openDocument(quiet));
    expect(lastContext()).toBe(true);
  });

  test("a document outside `.trama/requests/` is passed over before the project is asked for", () => {
    const asked: string[] = [];
    const watching = new DesignRequests(state as never, tramaFiles as never, () => (asked.push("project"), p), launch);
    asked.length = 0;
    const outside = openDocument(join(dir, "src", "notes.md"));
    focus(outside);
    type(outside, "typing");
    watching.dispose();
    expect(asked).toEqual([]);
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
    const document = await writeRequest("- ```md\n  # Not a title\n  ```\n# Returns after shipping\nCustomers may send an order back.\n");
    await requests.send(document.uri as never);
    const id = idOf(document);
    expect(readFileSync(document.uri.fsPath, "utf8")).toBe(document.text);
    expect(launches).toEqual([
      {
        root: dir,
        instruction: `Use the trama-design skill on the design request in \`.trama/requests/${id}.md\`. Bind the first Proposal you open to it with the \`request\` field.`,
        name: "Design",
        title: "Returns after shipping",
      },
    ]);
    expect(state.get<string[]>(SENT_KEY, [])).toEqual([id]);
    expect(closed.map((tab) => tab.input.uri.fsPath)).toEqual([document.uri.fsPath]);
    expect(warnings).toHaveLength(0);
  });

  test("an instruction that does not leave marks nothing and keeps the tab", async () => {
    outcome = undefined;
    await writeRequest("# Returns\n");
    await requests.send();
    expect(state.get<string[]>(SENT_KEY, [])).toEqual([]);
    expect(closed).toHaveLength(0);
    expect(lastContext()).toBe(true);
    expect(launches).toHaveLength(1);
  });

  for (const result of ["terminal", "conversation"] as const) {
    test(`un'istruzione che parte (${result}) segna la richiesta e chiude la scheda`, async () => {
      outcome = result;
      const document = await writeRequest("# Resi\n");
      await requests.send();
      expect(state.get<string[]>(SENT_KEY, [])).toEqual([idOf(document)]);
      expect(tabs).toEqual([]);
      expect(lastContext()).toBe(false);
    });
  }

  test("se l'istruzione non parte la scheda resta e si può riprovare anche dopo un riavvio", async () => {
    outcome = undefined;
    const document = await writeRequest("# Resi\n");
    await requests.send();
    expect(state.get<string[]>(SENT_KEY, [])).toEqual([]);
    expect(tabs.map((tab) => tab.input.uri.fsPath)).toEqual([document.uri.fsPath]);
    expect(lastContext()).toBe(true);
    expect(readFileSync(document.uri.fsPath, "utf8")).toBe(document.text);

    requests.dispose();
    requests = new DesignRequests(state as never, tramaFiles as never, () => p, launch);
    expect(lastContext()).toBe(true);
    outcome = "terminal";
    await requests.send();
    expect(launches).toHaveLength(2);
    expect(state.get<string[]>(SENT_KEY, [])).toEqual([idOf(document)]);
    expect(tabs).toEqual([]);
    expect(lastContext()).toBe(false);
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
    const restarted = new DesignRequests(state as never, tramaFiles as never, () => p, launch);
    // The files are listed once at the start, asynchronously: the lists of requests settle when the listing is back.
    await sleep(20);
    restarted.dispose();
    expect(state.get<string[]>(SENT_KEY, [])).toEqual([idOf(kept)]);
    focus(openDocument(kept.uri.fsPath));
    const again = new DesignRequests(state as never, tramaFiles as never, () => p, launch);
    await sleep(20);
    again.dispose();
    expect(lastContext()).toBe(false);
  });

  for (const sent of [true, false]) {
    test(`a request whose file is gone when the editor restores its tab after a restart keeps that tab open with its unsaved changes, never saved or sent (sent before: ${sent})`, async () => {
      const document = await writeRequest("# Restored\n");
      await document.save();
      if (sent) await requests.send();
      const saves = document.saves;
      deleteFile(document);
      requests.dispose();
      // The editor restores the tab with unsaved changes, before the new extension instance exists.
      tabs.push(tabOf(document));
      document.isDirty = true;
      document.text += " unsaved";
      requests = new DesignRequests(state as never, tramaFiles as never, () => p, launch);
      await sleep(10);
      expect(tabs.filter((tab) => tab.input.uri.fsPath === document.uri.fsPath)).toHaveLength(1);
      expect(existsSync(document.uri.fsPath)).toBe(false);
      await sleep(SAVE_DELAY_MS + 100);
      expect(document.saves).toBe(saves);
      focus(document);
      expect(lastContext()).toBe(false);
      await requests.send();
      expect(launches).toHaveLength(sent ? 1 : 0);
    });
  }

  test("a request whose file is gone when the editor restores its clean tab after a restart closes that tab at once", async () => {
    const document = await writeRequest("# Restored clean\n");
    await document.save();
    deleteFile(document);
    requests.dispose();
    tabs.push(tabOf(document));
    requests = new DesignRequests(state as never, tramaFiles as never, () => p, launch);
    await sleep(10);
    expect(tabs.filter((tab) => tab.input.uri.fsPath === document.uri.fsPath)).toHaveLength(0);
    expect(launches).toHaveLength(0);
  });
});

describe("closing the tab of a request", () => {
  const tabsShowing = (document: FakeDocument) => tabs.filter((tab) => tab.input.uri.fsPath === document.uri.fsPath);
  const settle = () => sleep(10);

  test("sends a request never sent with the text on disk, and marks it sent", async () => {
    const document = await writeRequest("- ```md\n  # Example title\n  ```\n# On disk\n");
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

  test("chiudere volontariamente senza che l'istruzione parta lascia il file mai inviato e recuperabile", async () => {
    outcome = undefined;
    const document = await writeRequest("# Resi\n");
    await document.save();
    closeTabs(tabsShowing(document));
    await settle();
    expect(tabs).toEqual([]);
    expect(state.get<string[]>(SENT_KEY, [])).toEqual([]);
    expect(readFileSync(document.uri.fsPath, "utf8")).toBe(document.text);

    const reopened = openDocument(document.uri.fsPath);
    tabs.push(tabOf(reopened));
    focus(reopened);
    expect(lastContext()).toBe(true);
    outcome = "terminal";
    await requests.send();
    expect(state.get<string[]>(SENT_KEY, [])).toEqual([idOf(document)]);
    expect(launches).toHaveLength(2);
    expect(tabs).toEqual([]);
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
    for (const document of [clean, dirty]) deleteFile(document);
    await settle();
    expect(tabsShowing(clean)).toHaveLength(0);
    expect(tabsShowing(dirty)).toHaveLength(1);
    expect(launches).toHaveLength(0);
    await sleep(SAVE_DELAY_MS + 100);
    expect(dirty.saves).toBe(0);
    expect(existsSync(dirty.uri.fsPath)).toBe(false);
  });

  for (const dirty of [false, true]) {
    test(`deletion while the instruction is being prepared cancels delivery and keeps only dirty tabs (${dirty})`, async () => {
      let resume!: () => void;
      let ready!: () => void;
      const preparing = new Promise<void>((resolve) => { ready = resolve; });
      const waiting = new Promise<void>((resolve) => { resume = resolve; });
      const deliveries: string[] = [];
      requests.dispose();
      requests = new DesignRequests(state as never, tramaFiles as never, () => p, async (_root, instruction, _name, _title, canSend) => {
        ready();
        await waiting;
        if (canSend?.() === false) return undefined;
        deliveries.push(instruction);
        return "terminal";
      });
      try {
        const document = await writeRequest("# Cancel before delivery\n");
        const sending = requests.send();
        await preparing;
        if (dirty) type(document, "unsaved");
        deleteFile(document);
        resume();
        await sending;
        expect(deliveries).toEqual([]);
        expect(state.get(SENT_KEY, [])).toEqual([]);
        expect(existsSync(document.uri.fsPath)).toBe(false);
        expect(tabsShowing(document)).toHaveLength(dirty ? 1 : 0);
      } finally {
        requests.dispose();
        requests = new DesignRequests(state as never, tramaFiles as never, () => p, launch);
      }
    });
  }


  test("the hand-over consuming a sent request closes its clean tab and drops it from the sent list", async () => {
    const document = await writeRequest("# Handed over\n");
    await requests.send();
    tabs.push(tabOf(openDocument(document.uri.fsPath)));
    deleteFile(document);
    await settle();
    expect(tabsShowing(document)).toHaveLength(0);
    expect(state.get(SENT_KEY, [])).toEqual([]);
    expect(launches).toHaveLength(1);
  });

  test("a sent request whose file is gone leaves the sent list at once, even while its tab is open", async () => {
    const document = await writeRequest("# Sent and gone\n");
    await requests.send();
    tabs.push(tabOf(openDocument(document.uri.fsPath)));
    type(document, " unsaved");
    deleteFile(document);
    expect(state.get(SENT_KEY, [])).toEqual([]);
    closeTabs(tabsShowing(document));
    await settle();
  });

  for (const folder of ["requests", ".trama"]) {
    test(`deleting the folder ${folder} consumes every request in it, as if each file had been deleted`, async () => {
      const sent = await writeRequest("# Sent\n");
      await requests.send();
      tabs.push(tabOf(openDocument(sent.uri.fsPath)));
      const clean = await writeRequest("# Clean\n");
      await clean.save();
      const dirty = await writeRequest("# Dirty\n");
      const gone = folder === "requests" ? requestsDir(p) : p.dir;
      const kept = folder === ".trama" ? join(dir, "kept") : undefined;
      if (kept) cpSync(p.dir, kept, { recursive: true });
      rmSync(gone, { recursive: true });
      // The editor reports only the folder.
      for (const fn of listeners.deleted) fn(fileUri(gone));
      await settle();
      expect(tabsShowing(sent)).toHaveLength(0);
      expect(tabsShowing(clean)).toHaveLength(0);
      expect(tabsShowing(dirty)).toHaveLength(1);
      expect(state.get(SENT_KEY, [])).toEqual([]);
      expect(launches).toHaveLength(1);
      await sleep(SAVE_DELAY_MS + 100);
      expect(dirty.saves).toBe(0);
      if (kept) {
        cpSync(kept, p.dir, { recursive: true });
        rmSync(kept, { recursive: true });
      }
    });
  }

  test("a deleted request kept open with unsaved changes is neither saved back nor sent again", async () => {
    const document = await writeRequest("# Consumed\n");
    await requests.send();
    // The developer reopens the sent request and edits it while its Proposal is handed over.
    tabs.push(tabOf(openDocument(document.uri.fsPath)));
    type(document, "more");
    deleteFile(document);
    type(document, " and more");
    await sleep(SAVE_DELAY_MS + 100);
    expect(existsSync(document.uri.fsPath)).toBe(false);
    closeTabs(tabsShowing(document));
    await settle();
    expect(launches).toHaveLength(1);
  });

  for (const sentBefore of [false, true]) {
    test(`a deleted request saved back by the editor stays finished: no Send to agent, no sending (sent before: ${sentBefore})`, async () => {
      const document = await writeRequest("# Finished\n");
      if (sentBefore) {
        await requests.send();
        tabs.push(tabOf(openDocument(document.uri.fsPath)));
      }
      type(document, " unsaved");
      deleteFile(document);
      // The developer saves the tab kept open, which writes the file again.
      await document.save();
      focus(undefined);
      focus(document);
      expect(lastContext()).toBe(false);
      await requests.send();
      closeTabs(tabsShowing(document));
      await settle();
      expect(launches).toHaveLength(sentBefore ? 1 : 0);
      expect(state.get(SENT_KEY, [])).toEqual([]);
    });
  }

  test("a request finished before a restart is written again once its restored tab saves the file: nothing is kept across restarts", async () => {
    const document = await writeRequest("# Finished before restart\n");
    deleteFile(document);
    await document.save();
    requests.dispose();
    requests = new DesignRequests(state as never, tramaFiles as never, () => p, launch);
    focus(undefined);
    focus(document);
    expect(lastContext()).toBe(true);
    await requests.send();
    expect(launches).toHaveLength(1);
  });
});

describe("Start from Scratch: the setup request", () => {
  test("is opened as Add Work Item… does and joins the setup list", async () => {
    await requests.writeSetup();
    const document = active as FakeDocument;
    expect(shown.at(-1)?.preview).toBe(false);
    expect(state.get<string[]>(SETUP_KEY, [])).toEqual([idOf(document)]);
  });

  test("sending it starts the trama-setup skill in the Setup terminal and marks it sent", async () => {
    await requests.writeSetup();
    const document = active as FakeDocument;
    type(document, "# Un gestore di ordini\n");
    await requests.send();
    expect(launches).toHaveLength(1);
    expect(launches[0]?.instruction).toContain("trama-setup");
    expect(launches[0]?.instruction).toContain(idOf(document));
    expect(launches[0]?.name).toBe("Setup");
    expect(state.get<string[]>(SENT_KEY, [])).toEqual([idOf(document)]);
  });

  test("a setup request whose file is gone leaves the setup list and, when its setup Proposal is approved, starts Run all", async () => {
    const runs: number[] = [];
    requests.dispose();
    requests = new DesignRequests(state as never, tramaFiles as never, () => p, launch, async () => void runs.push(1));
    await requests.writeSetup();
    const document = active as FakeDocument;
    type(document, "# Un gestore di ordini\n");
    await requests.send();
    const proposal = newProposal(p, "Set up the shop", "", { kind: "setup", request: idOf(document) });
    proposal.data.status = "approved";
    save(proposal);
    try {
      deleteFile(document);
      await sleep(10);
      expect(runs).toHaveLength(1);
      expect(state.get<string[]>(SETUP_KEY, [])).toEqual([]);
    } finally {
      rmSync(proposal.dir, { recursive: true, force: true });
      requests.dispose();
      requests = new DesignRequests(state as never, tramaFiles as never, () => p, launch);
    }
  });

  test("an open setup Proposal is reported, and a setup request without one leaves the list and starts nothing", async () => {
    const runs: number[] = [];
    requests.dispose();
    requests = new DesignRequests(state as never, tramaFiles as never, () => p, launch, async () => void runs.push(1));
    await requests.writeSetup();
    const document = active as FakeDocument;
    type(document, "# Un gestore di ordini\n");
    await requests.send();
    const proposal = newProposal(p, "Set up the shop", "", { kind: "setup", request: idOf(document) });
    proposal.data.status = "open";
    save(proposal);
    try {
      deleteFile(document);
      await sleep(10);
      expect(runs).toHaveLength(0);
      expect(warnings.some((w) => w.startsWith("Trama: the setup Proposal could not be approved on its own: "))).toBe(true);
      expect(state.get<string[]>(SETUP_KEY, [])).toEqual([]);
      expect(listProposals(p).some((x) => x.data.request === idOf(document))).toBe(true);
    } finally {
      rmSync(proposal.dir, { recursive: true, force: true });
      requests.dispose();
      requests = new DesignRequests(state as never, tramaFiles as never, () => p, launch);
    }
  });

  test("at start-up a setup request whose file vanished with no editor open leaves the setup list, and a later deletion starts nothing", async () => {
    const runs: number[] = [];
    requests.dispose();
    requests = new DesignRequests(state as never, tramaFiles as never, () => p, launch, async () => void runs.push(1));
    await requests.writeSetup();
    const setup = active as FakeDocument;
    type(setup, "# Un gestore di ordini\n");
    await requests.send();
    const proposal = newProposal(p, "Set up the shop", "", { kind: "setup", request: idOf(setup) });
    proposal.data.status = "approved";
    save(proposal);
    await requests.write();
    const other = active as FakeDocument;
    type(other, "# Un'altra richiesta\n");
    try {
      rmSync(setup.uri.fsPath); // gone while no editor had the project open: no deletion event reaches the extension
      requests.dispose();
      requests = new DesignRequests(state as never, tramaFiles as never, () => p, launch, async () => void runs.push(1));
      await sleep(10);
      expect(state.get<string[]>(SETUP_KEY, [])).toEqual([]);
      expect(runs).toHaveLength(0);
      deleteFile(other);
      await sleep(10);
      expect(runs).toHaveLength(0);
    } finally {
      rmSync(proposal.dir, { recursive: true, force: true });
      requests.dispose();
      requests = new DesignRequests(state as never, tramaFiles as never, () => p, launch);
    }
  });
});

/** The developer's editor shows `fsPath` again: a restored tab or one reopened from the file explorer. */
function reopen(fsPath: string): FakeDocument {
  const document = openDocument(fsPath);
  tabs.push(tabOf(document));
  for (const fn of listeners.visible) fn(undefined);
  return document;
}
/** The developer deletes everything in `document`. */
function erase(document: FakeDocument) {
  document.text = "";
  document.isDirty = true;
  for (const fn of listeners.change) fn({ document, contentChanges: [{ text: "" }] });
}
/** The ghost text shown on the editor of `fsPath`, with its colour; undefined when none is shown. */
function ghostOf(fsPath: string): { text: string; color: string } | undefined {
  const decorations = editors.get(fsPath)?.decorations ?? new Map<FakeDecorationType, unknown[]>();
  for (const [type, ranges] of decorations) {
    if (ranges.length > 0) return { text: type.options.after.contentText, color: type.options.after.color.id };
  }
  return undefined;
}

const DESIGN_GHOST = "Describe the change to design: behaviour, edge cases, requirements. Paste or drop images for context. Close this tab or press Send to agent when you are done.";
const SETUP_GHOST = "Describe the application to build: what it does and who it is for. Paste or drop images for context. Close this tab or press Send to agent when you are done.";

describe("the ghost text of a request never sent", () => {
  test("Add Work Item… shows the design text in the disabled colour, at the start, and the file stays empty and unsaved", async () => {
    await requests.write();
    const document = active as FakeDocument;
    expect(ghostOf(document.uri.fsPath)).toEqual({ text: DESIGN_GHOST, color: "disabledForeground" });
    expect(readFileSync(document.uri.fsPath, "utf8")).toBe("");
    expect(document.saves).toBe(0);
  });

  test("Start from Scratch shows the setup text", async () => {
    await requests.writeSetup();
    const document = active as FakeDocument;
    expect(ghostOf(document.uri.fsPath)).toEqual({ text: SETUP_GHOST, color: "disabledForeground" });
  });

  test("the first keystroke removes it, and deleting everything brings it back", async () => {
    await requests.write();
    const document = active as FakeDocument;
    type(document, "A");
    expect(ghostOf(document.uri.fsPath)).toBeUndefined();
    erase(document);
    expect(ghostOf(document.uri.fsPath)).toEqual({ text: DESIGN_GHOST, color: "disabledForeground" });
  });

  test("a text of only spaces or line breaks counts as written: no ghost", async () => {
    await requests.write();
    const document = active as FakeDocument;
    type(document, " \n");
    expect(ghostOf(document.uri.fsPath)).toBeUndefined();
  });

  test("a request restored after a restart, or reopened from the file explorer, shows its ghost again", async () => {
    await requests.write();
    const design = (active as FakeDocument).uri.fsPath;
    await requests.writeSetup();
    const setup = (active as FakeDocument).uri.fsPath;
    tabs.length = 0;
    reopen(design);
    reopen(setup);
    expect(ghostOf(design)).toEqual({ text: DESIGN_GHOST, color: "disabledForeground" });
    expect(ghostOf(setup)).toEqual({ text: SETUP_GHOST, color: "disabledForeground" });
  });

  test("a request already sent shows no ghost, even when the developer empties it", async () => {
    await requests.write();
    const document = active as FakeDocument;
    type(document, "# Returns\n");
    await requests.send();
    reopen(document.uri.fsPath);
    erase(document);
    expect(ghostOf(document.uri.fsPath)).toBeUndefined();
  });

  test("a document that is not a request shows no ghost", async () => {
    const other = join(dir, "notes.md");
    reopen(other);
    expect(ghostOf(other)).toBeUndefined();
  });
});

const HANDOFF_GHOST = "Describe the work to give your team: what should change, for whom, any deadline or constraint. Close this tab or press Send to agent when you are done.";

describe("New handoff: the handoff request", () => {
  /** The folder is a git repository whose origin is on GitHub, so Team can be turned on. */
  const git = (...args: string[]) => spawnSync("git", args, { cwd: dir, encoding: "utf8", timeout: 30_000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
  beforeAll(() => {
    git("init", "-q");
    git("remote", "add", "origin", "https://github.com/acme/web");
  });
  afterEach(() => setManagerMode(p, false));

  test("without Team it opens nothing, remembers nothing and says why", async () => {
    await requests.writeHandoff();
    expect(shown).toEqual([]);
    expect(state.get<string[]>(HANDOFF_KEY, [])).toEqual([]);
    expect(warnings).toEqual(["Trama: Manager Mode is off in this working copy."]);
    expect(existsSync(requestsDir(p)) ? readdirSync(requestsDir(p)) : []).toEqual([]);
  });

  test("with Team it is opened as Add Work Item… does, joins the handoff list and shows its own ghost text", async () => {
    setManagerMode(p, true);
    await requests.writeHandoff();
    const document = active as FakeDocument;
    expect(shown.at(-1)?.preview).toBe(false);
    expect(state.get<string[]>(HANDOFF_KEY, [])).toEqual([idOf(document)]);
    expect(state.get<string[]>(SETUP_KEY, [])).toEqual([]);
    expect(ghostOf(document.uri.fsPath)).toEqual({ text: HANDOFF_GHOST, color: "disabledForeground" });
    type(document, "A");
    expect(ghostOf(document.uri.fsPath)).toBeUndefined();
    erase(document);
    expect(ghostOf(document.uri.fsPath)).toEqual({ text: HANDOFF_GHOST, color: "disabledForeground" });
  });

  test("sending it starts the trama-handoff skill in the Handoff terminal, announces a work (no Board column) and marks it sent", async () => {
    setManagerMode(p, true);
    await requests.writeHandoff();
    const document = active as FakeDocument;
    type(document, "# Cancel an order\n\nLet customers cancel.\n");
    await requests.send();
    expect(launches).toHaveLength(1);
    expect(launches[0]?.instruction).toStartWith("Use the trama-handoff skill on the handoff request in");
    expect(launches[0]?.instruction).toContain(`.trama/requests/${idOf(document)}.md`);
    expect(launches[0]?.instruction).toContain("Bind the first handoff you open to it with the `request` field.");
    expect(launches[0]?.name).toBe("Handoff");
    expect(launches[0]?.title).toEqual({ kind: "work", title: "Cancel an order" } as never);
    expect(state.get<string[]>(SENT_KEY, [])).toEqual([idOf(document)]);
  });

  test("a handoff request whose file is gone leaves the handoff list, and the list survives a restart while the file is there", async () => {
    setManagerMode(p, true);
    await requests.writeHandoff();
    const document = active as FakeDocument;
    type(document, "# Cancel an order\n");
    requests.dispose();
    requests = new DesignRequests(state as never, tramaFiles as never, () => p, launch);
    expect(state.get<string[]>(HANDOFF_KEY, [])).toEqual([idOf(document)]);
    deleteFile(document);
    await sleep(10);
    expect(state.get<string[]>(HANDOFF_KEY, [])).toEqual([]);
  });
});
