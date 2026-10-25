import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A minimal editor: one webview panel that records what it is sent, user settings in memory and the messages the editor shows.
const messages: Record<string, unknown>[] = [];
const userSettings = new Map<string, unknown>();
const infos: string[] = [];
const warnings: { text: string; buttons: string[] }[] = [];
const errors: string[] = [];
const commands: string[] = [];
/** What the developer chooses on the next warning with buttons. */
let warningChoice: string | undefined;
let workspaceFolders: { name: string; uri: { fsPath: string; scheme: string } }[] = [];
let receive: ((raw: unknown) => void) | undefined;

mock.module("vscode", () => ({
  window: {
    createWebviewPanel: () => {
      const disposed: (() => void)[] = [];
      return {
        title: "",
        reveal() {},
        onDidDispose: (listener: () => void) => {
          disposed.push(listener);
          return { dispose() {} };
        },
        dispose() {
          for (const listener of disposed.splice(0)) listener();
        },
        webview: {
          html: "",
          cspSource: "",
          asWebviewUri: (uri: unknown) => uri,
          onDidReceiveMessage: (listener: (raw: unknown) => void) => {
            receive = listener;
            return { dispose() {} };
          },
          postMessage: async (message: Record<string, unknown>) => {
            messages.push(message);
            return true;
          },
        },
      };
    },
    showInformationMessage: async (text: string) => void infos.push(text),
    showWarningMessage: async (text: string, ...buttons: string[]) => {
      warnings.push({ text, buttons });
      return warningChoice;
    },
    showErrorMessage: async (message: string) => void errors.push(message),
  },
  workspace: {
    get workspaceFolders() {
      return workspaceFolders;
    },
    getWorkspaceFolder: () => undefined,
    getConfiguration: () => ({
      get: (key: string, fallback: unknown) => userSettings.get(key) ?? fallback,
      inspect: (key: string) => ({ globalValue: userSettings.get(key) }),
      update: async () => undefined,
    }),
    fs: { readDirectory: async () => [] },
  },
  extensions: { getExtension: () => ({ packageJSON: JSON.parse(readFileSync(join(import.meta.dir, "../extension/package.json"), "utf8")) }) },
  ConfigurationTarget: { Global: 1, Workspace: 2 },
  Uri: {
    joinPath: (base: { fsPath: string }, ...parts: string[]) => ({ fsPath: join(base.fsPath, ...parts) }),
    file: (path: string) => ({ fsPath: path }),
    parse: (value: string) => ({ toString: () => value }),
  },
  ViewColumn: { Active: 1, Beside: -2 },
  commands: { executeCommand: async (command: string) => void commands.push(command) },
  env: { appName: "Visual Studio Code", openExternal: async () => true },
  Disposable: class {
    constructor(readonly dispose: () => void) {}
  },
}));

// The editor is mocked above, so the host modules are loaded after it.
const { Controller } = await import("../extension/src/host/controller");
const { forgetUpdateCheck } = await import("../extension/src/host/omp-update");
const { bundlePath, resetSystemCertificatesState, setSystemCertificatesSetting, systemCertificatesState, useExportDeps } = await import("../extension/src/host/system-certificates");
const { configuredSystemCertificates } = await import("../extension/src/host/agent");
const { certificateErrorText } = await import("../extension/src/certificate-errors");

// A self-signed certificate authority, valid for a hundred years.
const CA = `-----BEGIN CERTIFICATE-----
MIIBZTCCAQygAwIBAgIUaq65BLhkaNrHDM5Hm/WBfrOFgg0wCgYIKoZIzj0EAwIw
GDEWMBQGA1UEAwwNVHJhbWEgdGVzdCBjYTAgFw0yNjEwMjUwNzIxMzFaGA8yMTI2
MTAwMTA3MjEzMVowGDEWMBQGA1UEAwwNVHJhbWEgdGVzdCBjYTBZMBMGByqGSM49
AgEGCCqGSM49AwEHA0IABHSXqAldslbw8Bvj7Wb+PuqInFsmLmd6W5IK6I048E+a
SIw2rI0cbLnCaqeZ/MNINTLSMKawZjp78aN6bmA7ogGjMjAwMB0GA1UdDgQWBBS3
KXP/kTTIn5VVu9rqMHhIWfIeBDAPBgNVHRMBAf8EBTADAQH/MAoGCCqGSM49BAMC
A0cAMEQCIBbhDHba77KEKUJ8vi3I/HQcVyKWBzdudnPJBu9UJCelAiAjJ+QJKDxv
pH3vkL889yhR2bWTT9pp7hRHGCK2khCZjQ==
-----END CERTIFICATE-----`;

let root: string;
let controller: InstanceType<typeof Controller>;
let log: string;
/** What the fake store gives, or the failure of the read; each read is counted. */
let source: { text: string; reads: number; gate?: Promise<void> };
const saved = { HOME: process.env["HOME"], XDG_CACHE_HOME: process.env["XDG_CACHE_HOME"], NODE_EXTRA_CA_CERTS: process.env["NODE_EXTRA_CA_CERTS"] };

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "trama-system-certificates-"));
  process.env["HOME"] = root;
  delete process.env["XDG_CACHE_HOME"];
  delete process.env["NODE_EXTRA_CA_CERTS"];
  workspaceFolders = [{ name: "app", uri: { fsPath: root, scheme: "file" } }];
  messages.length = 0;
  infos.length = 0;
  warnings.length = 0;
  errors.length = 0;
  commands.length = 0;
  warningChoice = undefined;
  userSettings.clear();
  receive = undefined;
  forgetUpdateCheck();
  resetSystemCertificatesState();
  setSystemCertificatesSetting(configuredSystemCertificates);
  source = { text: CA, reads: 0 };
  useExportDeps(() => ({
    read: async () => {
      source.reads++;
      await source.gate;
      return source.text;
    },
    path: bundlePath(),
    roots: [],
  }));
  // An omp that lists one model, says its version, and logs every call with the certificate variable it received.
  const program = join(root, "omp");
  log = join(root, "calls.log");
  writeFileSync(program, `#!/bin/sh\nprintf '%s|%s\\n' "$*" "\${NODE_EXTRA_CA_CERTS-unset}" >> '${log}'\ncase "$1" in\n  models) echo '{"models":[{"selector":"a/b","provider":"anthropic"}]}' ;;\n  update) echo 'Current version: 18.12.6'; echo 'Already up to date' ;;\n  *) echo 'omp/18.12.6' ;;\nesac\n`);
  chmodSync(program, 0o755);
  userSettings.set("ompPath", program);
  controller = new Controller({ fsPath: root } as never, undefined, undefined, undefined);
});

afterEach(() => {
  controller.dispose();
  useExportDeps(undefined);
  setSystemCertificatesSetting(() => false);
  resetSystemCertificatesState();
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  rmSync(root, { recursive: true, force: true });
});

/** Real time passes here because the host under test runs real child processes (the fake omp) and its answers arrive when they end. */
function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

/** Opens the panel the first time, sends a message from the webview and waits until the host has been quiet for a while. */
async function send(message: Record<string, unknown>): Promise<void> {
  if (receive === undefined) {
    await controller.open();
    messages.length = 0;
  }
  receive?.(message);
  let seen = -1;
  for (let quiet = 0; quiet < 8; ) {
    await sleep(25);
    quiet = messages.length === seen ? quiet + 1 : 0;
    seen = messages.length;
  }
}

const ofType = (type: string) => messages.filter((m) => m["type"] === type);
const states = () => ofType("systemCertificates").map(({ type: _type, ...state }) => state);
const calls = (): string[] => (existsSync(log) ? readFileSync(log, "utf8").split("\n").filter((line) => line !== "") : []);
const omp = (args: string) => calls().filter((line) => line.startsWith(`${args}|`)).map((line) => line.slice(args.length + 1));

test("the state of the bundle goes to the webview at ready, and at every change of it", async () => {
  await send({ type: "ready" });
  expect(states()).toEqual([{ exporting: false }]);
  userSettings.set("systemCertificates", true);
  messages.length = 0;
  await send({ type: "refreshSystemCertificates" });
  const seen = states();
  expect(seen[0]).toEqual({ exporting: true });
  const last = seen.at(-1) as { exporting: boolean; count?: number; exportedAt?: string };
  expect(last.exporting).toBe(false);
  expect(last.count).toBe(1);
  expect(typeof last.exportedAt).toBe("string");
  messages.length = 0;
  await send({ type: "ready" });
  expect(states()).toEqual([last]);
  messages.length = 0;
  await send({ type: "ompStatusWanted" });
  expect(states()).toEqual([last]);
});

// Windows has no `#!/bin/sh` programs: the tests that run the fake omp are skipped there.
test.skipIf(process.platform === "win32")("Refresh of the Settings tab exports only while the saved setting is on; off, the webview is only told the state", async () => {
  await send({ type: "refreshSystemCertificates" });
  expect(source.reads).toBe(0);
  expect(states()).toEqual([{ exporting: false }]);
  expect(existsSync(bundlePath())).toBe(false);
  userSettings.set("systemCertificates", true);
  await send({ type: "refreshSystemCertificates" });
  expect(source.reads).toBe(1);
  expect(existsSync(bundlePath())).toBe(true);
  // A workspace value never turns the mode on: only the user value is read (the fake settings expose only it).
  expect(configuredSystemCertificates()).toBe(true);
});

test.skipIf(process.platform === "win32")("after an export the Settings tab and the wizard's check run again in silence, and omp started afterwards receives the bundle", async () => {
  userSettings.set("systemCertificates", true);
  await send({ type: "refreshSystemCertificates" });
  expect(ofType("ompStatus").map((m) => m["state"])).toEqual(["checking", "done"]);
  expect(ofType("agentCheck").some((m) => m["state"] === "done")).toBe(true);
  expect(ofType("modelSuggestions")).toHaveLength(1);
  const path = bundlePath();
  expect(omp("models --json")).toEqual([path, path]);
  expect(omp("--version").every((value) => value === path)).toBe(true);
  expect(omp("update --check")).toEqual([path]);
  expect(infos).toEqual([]);
  expect(errors).toEqual([]);
});

test("the wizard's export runs whatever the saved setting says, and only the Settings tab is checked by the host: the step checks omp by itself", async () => {
  await send({ type: "systemCertificatesExport" });
  expect(source.reads).toBe(1);
  expect(ofType("agentCheck")).toEqual([]);
  expect(ofType("ompStatus").map((m) => m["state"])).toEqual(["checking", "done"]);
  expect(states().at(-1)).toMatchObject({ exporting: false, count: 1 });
});

test("a second request while an export of this window runs does nothing", async () => {
  userSettings.set("systemCertificates", true);
  const gate = Promise.withResolvers<void>();
  source.gate = gate.promise;
  await controller.open();
  receive?.({ type: "refreshSystemCertificates" });
  await sleep(50);
  receive?.({ type: "refreshSystemCertificates" });
  receive?.({ type: "systemCertificatesExport" });
  await sleep(50);
  expect(source.reads).toBe(1);
  expect(systemCertificatesState()).toEqual({ exporting: true });
  gate.resolve();
  await sleep(200);
  expect(source.reads).toBe(1);
  expect(systemCertificatesState().exporting).toBe(false);
});

test.skipIf(process.platform === "win32")("a failed export keeps the earlier bundle and its count and time, and tells the webview why", async () => {
  userSettings.set("systemCertificates", true);
  await send({ type: "refreshSystemCertificates" });
  const before = readFileSync(bundlePath(), "utf8");
  const earlier = systemCertificatesState();
  source.text = "no certificates in here";
  messages.length = 0;
  await send({ type: "refreshSystemCertificates" });
  expect(readFileSync(bundlePath(), "utf8")).toBe(before);
  expect(states().at(-1)).toEqual({ exporting: false, count: earlier.count as number, exportedAt: earlier.exportedAt as string, error: "no certificate authority found" });
  // The processes started afterwards keep receiving the earlier bundle.
  expect(omp("models --json").at(-1)).toBe(bundlePath());
});

test("the command says its outcome in an editor message: the count on success, the reason, and the bundle in use, on failure; off, it only says the mode is off", async () => {
  await controller.refreshSystemCertificatesCommand();
  expect(infos).toEqual(["Trama: System Certificates is off."]);
  expect(source.reads).toBe(0);
  infos.length = 0;
  userSettings.set("systemCertificates", true);
  await controller.refreshSystemCertificatesCommand();
  expect(infos).toEqual(["Trama: exported 1 system certificates."]);
  expect(errors).toEqual([]);
  source.text = "";
  await controller.refreshSystemCertificatesCommand();
  expect(errors).toHaveLength(1);
  expect(errors[0]?.startsWith("Trama: could not export the system certificates: no certificate authority found. Using the ones exported ")).toBe(true);
  expect(infos).toEqual(["Trama: exported 1 system certificates."]);
});

test("an automatic export that fails warns once with Open Settings, and Open Settings opens the panel on the Settings tab; the command and the panel do not warn", async () => {
  userSettings.set("systemCertificates", true);
  source.text = "";
  warningChoice = "Open Settings";
  await controller.exportSystemCertificates("automatic");
  await sleep(50);
  expect(warnings).toEqual([{ text: "Trama: could not export the system certificates: no certificate authority found.", buttons: ["Open Settings"] }]);
  expect(receive).toBeDefined();
  await controller.exportSystemCertificates("panel");
  await controller.exportSystemCertificates("wizard");
  expect(warnings).toHaveLength(1);
  // With an earlier bundle in use the warning says so.
  source.text = CA;
  await controller.exportSystemCertificates("panel");
  source.text = "";
  warningChoice = undefined;
  await controller.exportSystemCertificates("automatic");
  expect(warnings).toHaveLength(2);
  expect(warnings[1]?.text.startsWith("Trama: could not export the system certificates: no certificate authority found. Using the ones exported ")).toBe(true);
});

test.skipIf(process.platform === "win32")("turning the mode on exports the bundle; turning it off exports nothing, leaves the bundle on disk and checks omp again", async () => {
  await controller.open();
  userSettings.set("systemCertificates", true);
  await controller.systemCertificatesChanged();
  expect(source.reads).toBe(1);
  expect(existsSync(bundlePath())).toBe(true);
  await sleep(300);
  const withBundle = omp("models --json");
  expect(withBundle.at(-1)).toBe(bundlePath());
  userSettings.set("systemCertificates", false);
  messages.length = 0;
  await controller.systemCertificatesChanged();
  await sleep(300);
  expect(source.reads).toBe(1);
  expect(existsSync(bundlePath())).toBe(true);
  expect(omp("models --json").at(-1)).toBe("unset");
  expect(ofType("ompStatus").map((m) => m["state"])).toEqual(["checking", "done"]);
});

test.skipIf(process.platform === "win32")("the wizard's step value counts for its own check: on gives omp the bundle although the saved setting is off, and off takes it away although the saved setting is on", async () => {
  userSettings.set("systemCertificates", true);
  await send({ type: "refreshSystemCertificates" });
  const path = bundlePath();
  userSettings.set("systemCertificates", false);
  messages.length = 0;
  const program = join(root, "omp");
  await send({ type: "agentCheckWanted", ompPath: program, systemCertificates: true });
  const done = ofType("agentCheck").find((m) => m["state"] === "done");
  expect(done).toMatchObject({ ok: true, models: 1 });
  expect(omp("models --json").at(-1)).toBe(path);
  userSettings.set("systemCertificates", true);
  await send({ type: "agentCheckWanted", ompPath: program, systemCertificates: false });
  expect(omp("models --json").at(-1)).toBe("unset");
  // Without the field the saved setting counts.
  await send({ type: "agentCheckWanted", ompPath: program });
  expect(omp("models --json").at(-1)).toBe(path);
});

test.skipIf(process.platform === "win32")("a certificate error in the models list of a check reads in plain words in the wizard's check, with the step's mode", async () => {
  const failing = join(root, "omp-failing");
  writeFileSync(failing, "#!/bin/sh\ncase \"$1\" in\n  models) echo 'Error: SELF_SIGNED_CERT_IN_CHAIN' >&2; exit 1 ;;\n  update) echo 'Current version: 18.12.6'; echo 'Already up to date' ;;\n  *) echo 'omp/18.12.6' ;;\nesac\n");
  chmodSync(failing, 0o755);
  userSettings.set("ompPath", failing);
  await send({ type: "agentCheckWanted", ompPath: failing, systemCertificates: false });
  expect(ofType("agentCheck").find((m) => m["state"] === "done")).toMatchObject({ ok: false, error: certificateErrorText(false) });
  messages.length = 0;
  forgetUpdateCheck();
  await send({ type: "agentCheckWanted", ompPath: failing, systemCertificates: true });
  expect(ofType("agentCheck").find((m) => m["state"] === "done")).toMatchObject({ ok: false, error: certificateErrorText(true) });
});
