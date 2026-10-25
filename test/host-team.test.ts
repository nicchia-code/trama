import { afterAll, beforeAll, beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { githubProjectFile, linkGithubProject } from "../src/core/github";
import { moveIssue, rosterOf } from "../src/core/issues";
import { approveProposal, editInProposal, getProposal, newProposal, submitProposal } from "../src/core/proposals";
import { setManagerMode } from "../src/core/manager-mode";
import { projectAt } from "../src/core/store";
import { type MemoryPeopleStore, memoryPeopleStore, People, saveFailure, TEAM_KEY } from "../extension/src/host/team/people";

// A minimal editor: one webview panel, what the host posts to it and the answer to the modal dialog.
interface FakePanel {
  receive?: (raw: unknown) => void;
}
const panels: FakePanel[] = [];
const posted: { type: string; [key: string]: unknown }[] = [];
let workspaceFolders: { uri: { fsPath: string; scheme: string } }[] = [];
let warnings: { message: string; detail: string | undefined }[] = [];
let warningAnswer: string | undefined;
const output: string[] = [];
let outputShown = false;

mock.module("vscode", () => ({
  window: {
    createWebviewPanel: () => {
      const panel: FakePanel = {};
      panels.push(panel);
      return {
        get title() { return ""; },
        set title(_value: string) {},
        reveal: () => {},
        onDidDispose: () => ({ dispose() {} }),
        dispose() {},
        webview: {
          options: { localResourceRoots: [] as { fsPath: string }[] },
          html: "",
          cspSource: "",
          asWebviewUri: (uri: unknown) => uri,
          onDidReceiveMessage: (listener: (raw: unknown) => void) => {
            panel.receive = listener;
            return { dispose() {} };
          },
          postMessage: async (message: { type: string }) => {
            posted.push(message);
            return true;
          },
        },
      };
    },
    showInformationMessage: async () => undefined,
    showWarningMessage: async (message: string, options?: { detail?: string }) => {
      warnings.push({ message, detail: options?.detail });
      return warningAnswer;
    },
    showErrorMessage: () => undefined,
    createOutputChannel: () => ({
      clear: () => void (output.length = 0),
      appendLine: (line: string) => void output.push(line),
      show: () => void (outputShown = true),
      dispose() {},
    }),
  },
  workspace: {
    get workspaceFolders() {
      return workspaceFolders;
    },
    getWorkspaceFolder: () => undefined,
    getConfiguration: () => ({ get: () => undefined, inspect: () => undefined, update: async () => undefined }),
  },
  extensions: { getExtension: () => ({ packageJSON: JSON.parse(readFileSync(join(import.meta.dir, "../extension/package.json"), "utf8")) }) },
  ConfigurationTarget: { Global: 1, Workspace: 2 },
  Uri: {
    joinPath: (base: { fsPath: string }, ...parts: string[]) => ({ fsPath: join(base.fsPath, ...parts), toString: () => join(base.fsPath, ...parts) }),
    file: (path: string) => ({ fsPath: path, toString: () => path }),
    parse: (value: string) => ({ toString: () => value }),
  },
  ViewColumn: { Active: 1, Beside: -2 },
  commands: { executeCommand: async () => undefined },
  env: { appName: "Visual Studio Code", openExternal: async () => true },
  Disposable: class {
    constructor(readonly dispose: () => void) {}
  },
}));

// The modules load after mock.module replaced "vscode", as the other host tests do.
const { Controller } = await import("../extension/src/host/controller");

const ADA = { name: "Ada Lovelace", handle: "@ada", level: "senior", skills: ["Rust"], capacity: 4.5, absences: [] };

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-team-host-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  workspaceFolders = [{ uri: { fsPath: dir, scheme: "file" } }];
  const git = (...args: string[]) => spawnSync("git", args, { cwd: dir, stdio: "ignore", timeout: 30_000, killSignal: "SIGKILL" });
  git("init", "-q");
  git("remote", "add", "origin", "git@github.com:Acme/Shop.git");
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

beforeEach(() => {
  posted.length = 0;
  warnings = [];
  warningAnswer = undefined;
  setManagerMode(projectAt(dir), true);
});

/** The value under the key, as the tests of this file wrote it (the store holds `unknown`). */
const stored = (store: MemoryPeopleStore) => store.values.get(TEAM_KEY) as { people: { repositories: string[] }[] };

const ids = ["aaaaaaa1", "aaaaaaa2", "aaaaaaa3"];
const people = (store = memoryPeopleStore()) => {
  const draw = [...ids];
  return { store, people: new People(store, () => "2026-10-25", () => draw.shift() ?? "zzzzzzzz") };
};

/** The panel of a controller with `people`, after `ready`. */
async function open(team: People) {
  const controller = new Controller({ fsPath: dir } as never, undefined, undefined, undefined, undefined, team);
  await controller.open();
  panels.at(-1)?.receive?.({ type: "ready" });
  await Bun.sleep(0);
  return controller;
}
const send = async (message: unknown) => {
  panels.at(-1)?.receive?.(message);
  await Bun.sleep(0); // the handlers are chains of microtasks: one turn of the loop lets them end
};
interface SentTeam {
  members: { id: string; name: string }[];
  others: { id: string }[];
  unreadable: number;
  error: string | null;
}
/** The `team` messages the panel got; `posted` holds loose messages, and these are the ones this file sent. */
const teams = (): SentTeam[] => posted.filter((message) => message.type === "team") as unknown as SentTeam[];

test("with Team available the ready of the panel sends the people of this project's team, and nothing when Manager mode is off", async () => {
  const { people: team } = people();
  const controller = await open(team);
  expect(teams()).toEqual([{ type: "team", members: [], others: [], unreadable: 0, error: null } as never]);
  controller.dispose();
  posted.length = 0;
  setManagerMode(projectAt(dir), false);
  const off = await open(team);
  expect(teams()).toEqual([]);
  off.dispose();
});

test("the Team view asks again when it is shown: viewChanged to team sends the people, to another view nothing", async () => {
  const { people: team } = people();
  const controller = await open(team);
  posted.length = 0;
  await send({ type: "viewChanged", view: "history" });
  expect(teams()).toEqual([]);
  await send({ type: "viewChanged", view: "team" });
  expect(teams()).toHaveLength(1);
  controller.dispose();
});

test("Save writes a new person into the team of this project, in lower case, and sends the people and the Manager Mode row", async () => {
  const { people: team, store } = people();
  const controller = await open(team);
  posted.length = 0;
  await send({ type: "savePerson", person: ADA });
  const [sent] = teams();
  expect(sent?.members.map((person) => person.name)).toEqual(["Ada Lovelace"]);
  expect(sent?.error).toBeNull();
  expect(posted.map((message) => message.type)).toEqual(["team", "managerMode"]);
  expect(store.values.get(TEAM_KEY)).toEqual({
    version: 1,
    people: [{ id: "aaaaaaa1", name: "Ada Lovelace", handle: "ada", level: "senior", skills: ["Rust"], capacity: 4.5, absences: [], repositories: ["acme/shop"] }],
  });
  controller.dispose();
});

test("a person that breaks rules#person is refused with the message of each field and nothing is written", async () => {
  const { people: team, store } = people();
  const controller = await open(team);
  posted.length = 0;
  await send({ type: "savePerson", person: { ...ADA, name: " ", handle: "a b", capacity: 9 } });
  expect(posted).toEqual([
    {
      type: "personRejected",
      errors: { name: "Enter a name of 1 to 80 characters.", handle: "A GitHub handle can't contain spaces.", capacity: expect.any(String) },
    } as never,
  ]);
  expect(store.values.has(TEAM_KEY)).toBe(false);
  controller.dispose();
});

test("Remove from team takes the person out of this project only, Undo and Add from other projects put them back", async () => {
  const { people: team, store } = people();
  const controller = await open(team);
  await send({ type: "savePerson", person: ADA });
  posted.length = 0;
  await send({ type: "removeFromTeam", id: "aaaaaaa1" });
  expect(teams().at(-1)).toMatchObject({ members: [], others: [{ id: "aaaaaaa1" }] });
  expect(stored(store).people[0]?.repositories).toEqual([]);
  await send({ type: "undoRemoveFromTeam", id: "aaaaaaa1" });
  expect(teams().at(-1)).toMatchObject({ members: [{ id: "aaaaaaa1" }], others: [] });
  await send({ type: "removeFromTeam", id: "aaaaaaa1" });
  await send({ type: "addToTeam", id: "aaaaaaa1" });
  expect(teams().at(-1)).toMatchObject({ members: [{ id: "aaaaaaa1" }], others: [] });
  controller.dispose();
});

test("Delete person asks in the modal dialog of the editor: cancelling changes nothing, Delete removes the person from the list", async () => {
  const { people: team, store } = people();
  const controller = await open(team);
  await send({ type: "savePerson", person: ADA });
  posted.length = 0;
  await send({ type: "deletePerson", id: "aaaaaaa1" });
  expect(warnings).toEqual([{ message: "Delete Ada Lovelace?", detail: "They leave every project's team. Issues already assigned to them on GitHub stay assigned." }]);
  expect(posted).toEqual([]);
  expect(stored(store).people).toHaveLength(1);
  warningAnswer = "Delete";
  await send({ type: "deletePerson", id: "aaaaaaa1" });
  expect(teams().at(-1)).toMatchObject({ members: [], others: [] });
  expect(stored(store).people).toEqual([]);
  controller.dispose();
});

test("a write that fails reaches the tab as the sentence of the notice, with the people as they are stored", async () => {
  const store = memoryPeopleStore();
  store.update = () => Promise.reject(new Error("disk full"));
  const { people: team } = people(store);
  const controller = await open(team);
  posted.length = 0;
  await send({ type: "savePerson", person: ADA });
  expect(teams().at(-1)).toMatchObject({ members: [], error: saveFailure("disk full") });
  expect(teams().at(-1)?.error).toBe("Trama could not save the team: disk full.");
  controller.dispose();
});

test("the writes of the People tab do nothing while Team is not available", async () => {
  const { people: team, store } = people();
  const controller = await open(team);
  setManagerMode(projectAt(dir), false);
  posted.length = 0;
  await send({ type: "savePerson", person: ADA });
  expect(teams()).toEqual([]);
  expect(store.values.has(TEAM_KEY)).toBe(false);
  controller.dispose();
});

test("when Team stops being available while the panel shows it, the host navigates to the Board", async () => {
  const { people: team } = people();
  const controller = await open(team);
  await send({ type: "viewChanged", view: "team" });
  posted.length = 0;
  setManagerMode(projectAt(dir), false);
  await send({ type: "ready" });
  expect(posted).toContainEqual({ type: "managerMode", available: false, recorded: false, repository: "acme/shop", reason: null } as never);
  expect(posted).toContainEqual({ type: "navigate", view: "board" });
  controller.dispose();
});

test("the Show Team command without Team does the ordinary opening, and with it opens the panel on Team", async () => {
  const { people: team } = people();
  setManagerMode(projectAt(dir), false);
  const without = new Controller({ fsPath: dir } as never, undefined, undefined, undefined, undefined, team);
  const before = panels.length;
  await without.show("team");
  expect(panels.length).toBe(before + 1);
  panels.at(-1)?.receive?.({ type: "ready" });
  await Bun.sleep(0);
  expect(posted.some((message) => message.type === "navigate")).toBe(false);
  without.dispose();

  setManagerMode(projectAt(dir), true);
  posted.length = 0;
  const with_ = new Controller({ fsPath: dir } as never, undefined, undefined, undefined, undefined, team);
  await with_.show("team");
  panels.at(-1)?.receive?.({ type: "ready" });
  await Bun.sleep(0);
  expect(posted).toContainEqual({ type: "navigate", view: "team" });
  with_.dispose();
});

// ---- The GitHub Project (`rules#github-project`): a fake `gh` first in the PATH, so the reads run the real code against canned answers ----

const PROJECTS_ANSWER = JSON.stringify({
  data: {
    repositoryOwner: {
      login: "Acme",
      projectsV2: {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [
          { number: 1, title: "Roadmap", closed: false, fields: { nodes: [{ name: "Estimate", dataType: "NUMBER" }, { name: "Sprint", dataType: "ITERATION" }] } },
          { number: 2, title: "Bug triage", closed: false, fields: { nodes: [{ name: "Priority", dataType: "SINGLE_SELECT" }] } },
        ],
      },
    },
    repository: { projectsV2: { nodes: [{ number: 1 }] } },
  },
});
const PROJECT_ANSWER = JSON.stringify({
  data: {
    repositoryOwner: {
      projectV2: {
        fields: { nodes: [{ id: "F3", name: "Sprint", dataType: "ITERATION", configuration: { iterations: [{ id: "I2", title: "Sprint 2", startDate: "2026-10-26", duration: 7 }], completedIterations: [] } }] },
      },
    },
  },
});

const ITEMS_ANSWER = JSON.stringify({
  data: {
    repositoryOwner: {
      projectV2: {
        items: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [
            {
              content: { number: 126, title: "Paid orders", state: "CLOSED", stateReason: "COMPLETED", repository: { nameWithOwner: "Acme/Shop" }, assignees: { nodes: [{ login: "giulia" }] }, closedByPullRequestsReferences: { nodes: [] }, linkedBranches: { nodes: [] } },
              fieldValues: { nodes: [{ title: "Sprint 2", field: { name: "Sprint" } }] },
            },
          ],
        },
      },
    },
  },
});

interface SentGitHub {
  state: string;
  reading: boolean;
  repository: string | null;
  linked: { owner: string; number: number; title: string } | null;
  readAt: string | null;
  project: { fields: unknown[]; iterations: unknown[] } | null;
  issues: { number: number; status: string; assignee: string | null; sprint: string | null; estimate: number | null }[];
  projects: { number: number; iteration: boolean }[];
  error: string | null;
}
const githubs = (): SentGitHub[] => posted.filter((message) => message.type === "teamGitHub") as unknown as SentGitHub[];
const notices = (): string[] => posted.filter((message) => message.type === "notice").map((message) => String(message["text"]));

let ghDir: string;
const originalPath = process.env["PATH"];
/** Installs a `gh` in the first folder of the PATH: logged in or not, answering the two queries from files. */
function installGh(loggedIn: boolean): void {
  writeFileSync(join(ghDir, "projects.json"), PROJECTS_ANSWER);
  writeFileSync(join(ghDir, "project.json"), PROJECT_ANSWER);
  writeFileSync(join(ghDir, "items.json"), ITEMS_ANSWER);
  const script = [
    "#!/bin/sh",
    'case "$1" in',
    '  --version) echo "gh version 2.60.0";;',
    loggedIn ? '  auth) echo "Logged in";;' : '  auth) echo "You are not logged into any GitHub hosts" >&2; exit 1;;',
    `  api) case "$*" in *"repository(owner"*) cat "${join(ghDir, "projects.json")}";; *"items(first"*) cat "${join(ghDir, "items.json")}";; *) cat "${join(ghDir, "project.json")}";; esac;;`,
    "esac",
  ].join("\n");
  writeFileSync(join(ghDir, "gh"), script);
  chmodSync(join(ghDir, "gh"), 0o755);
}

const github = process.platform === "win32" ? test.skip : test; // a fake gh is a shell script
const memory = () => {
  const values = new Map<string, unknown>();
  return { get: (key: string) => values.get(key), update: async (key: string, value: unknown) => void values.set(key, value) };
};
/** A controller with a workspace state (without one the Team view has nothing to read), its panel after `ready`. */
async function openWithGitHub(team: People) {
  const controller = new Controller({ fsPath: dir } as never, undefined, undefined, undefined, memory(), team);
  await controller.open();
  panels.at(-1)?.receive?.({ type: "ready" });
  await Bun.sleep(0);
  return controller;
}
/** Lets the reads that `send` started end: they run a real child process, so there is no promise to await and no clock to fake. */
const settled = async (until: () => boolean) => {
  for (let i = 0; i < 200 && !until(); i++) await Bun.sleep(10);
};

beforeAll(() => {
  ghDir = mkdtempSync(join(tmpdir(), "trama-fake-gh-"));
  mkdirSync(ghDir, { recursive: true });
  process.env["PATH"] = `${ghDir}:${originalPath ?? ""}`;
});
afterAll(() => {
  process.env["PATH"] = originalPath;
  rmSync(ghDir, { recursive: true, force: true });
});
beforeEach(() => {
  rmSync(githubProjectFile(projectAt(dir)), { force: true });
  output.length = 0;
  outputShown = false;
});

github("showing the Team view reads GitHub once: loading first, then the Projects of the owner and nothing linked", async () => {
  installGh(true);
  const { people: team } = people();
  const controller = await openWithGitHub(team);
  posted.length = 0;
  await send({ type: "viewChanged", view: "team" });
  await settled(() => githubs().at(-1)?.state === "ready" && githubs().at(-1)?.reading === false);
  const sent = githubs();
  expect(sent[0]).toMatchObject({ state: "loading", reading: false, repository: "acme/shop", linked: null });
  expect(sent.some((message) => message.reading)).toBe(true);
  expect(sent.at(-1)).toMatchObject({ state: "ready", reading: false, linked: null, project: null, error: null });
  expect(sent.at(-1)?.projects).toMatchObject([
    { number: 1, iteration: true },
    { number: 2, iteration: false },
  ]);
  controller.dispose();
});

github("a Project with an iteration field is linked and read, one without is refused with the reason and nothing is written; Unlink deletes only the local record", async () => {
  installGh(true);
  const { people: team } = people();
  const controller = await openWithGitHub(team);
  await send({ type: "viewChanged", view: "team" });
  await settled(() => githubs().at(-1)?.state === "ready" && githubs().at(-1)?.reading === false);
  posted.length = 0;

  await send({ type: "linkGitHubProject", owner: "Acme", number: 2 });
  expect(notices()[0]).toContain("No Iteration field");
  expect(existsSync(githubProjectFile(projectAt(dir)))).toBe(false);
  await send({ type: "linkGitHubProject", owner: "Acme", number: 99 });
  expect(notices()[1]).toContain("not one of the Projects read from GitHub");
  expect(existsSync(githubProjectFile(projectAt(dir)))).toBe(false);

  posted.length = 0;
  await send({ type: "linkGitHubProject", owner: "Acme", number: 1 });
  await settled(() => githubs().at(-1)?.project !== null && githubs().at(-1)?.reading === false);
  expect(JSON.parse(readFileSync(githubProjectFile(projectAt(dir)), "utf8"))).toEqual({ owner: "Acme", number: 1, title: "Roadmap" });
  expect(githubs().at(-1)).toMatchObject({ state: "ready", linked: { owner: "Acme", number: 1, title: "Roadmap" }, project: { iterations: [{ id: "I2", title: "Sprint 2" }] } });

  posted.length = 0;
  await send({ type: "unlinkGitHubProject" });
  await settled(() => githubs().at(-1)?.linked === null && githubs().at(-1)?.reading === false);
  expect(existsSync(githubProjectFile(projectAt(dir)))).toBe(false);
  expect(githubs().at(-1)).toMatchObject({ linked: null, project: null });
  controller.dispose();
});

github("a gh that is not logged in is the state not-logged-in, and Show details opens the output channel on what gh said", async () => {
  installGh(false);
  const { people: team } = people();
  const controller = await openWithGitHub(team);
  posted.length = 0;
  await send({ type: "refreshTeam" });
  await settled(() => githubs().at(-1)?.state === "not-logged-in" && githubs().at(-1)?.reading === false);
  expect(githubs().at(-1)).toMatchObject({ state: "not-logged-in", error: "You're not logged in to GitHub" });
  await send({ type: "showGitHubDetails" });
  expect(output.join("\n")).toContain("You are not logged into any GitHub hosts");
  expect(outputShown).toBe(true);
  controller.dispose();
});

github("the GitHub messages do nothing while Team is not available", async () => {
  installGh(true);
  const { people: team } = people();
  const controller = await openWithGitHub(team);
  setManagerMode(projectAt(dir), false);
  posted.length = 0;
  await send({ type: "refreshTeam" });
  await send({ type: "linkGitHubProject", owner: "Acme", number: 1 });
  expect(githubs()).toEqual([]);
  expect(existsSync(githubProjectFile(projectAt(dir)))).toBe(false);
  controller.dispose();
});

github("the Team view is told where each published issue is from the last read, and the editor answers the same to an agent that asks", async () => {
  installGh(true);
  const { people: team } = people();
  const issuesDir = join(dir, ".trama", "issues");
  const handoff = newProposal(projectAt(dir), "Order work", "Why.", { kind: "handoff", label: "orders" }).id;
  linkGithubProject(projectAt(dir), { owner: "Acme", number: 1, title: "Roadmap", iteration: true });
  writeFileSync(editInProposal(projectAt(dir), handoff, "issues/paid.md"), "---\nrefs: [order/Paid]\nestimate: 1\nassignee: ada\nreviewer: bob\nsprint: Sprint 2\n---\n\n# Paid orders\n\nBody.\n");
  submitProposal(projectAt(dir), handoff, [], { team: rosterOf([{ handle: "ada" }, { handle: "bob" }]) });
  const [card] = approveProposal(projectAt(dir), handoff, []).issues;
  moveIssue(projectAt(dir), card as string, "published", { number: 126, url: "https://github.com/Acme/Shop/issues/126" });
  const controller = await openWithGitHub(team);
  try {
    expect(controller.issueStates(projectAt(dir))).toEqual([]);
    posted.length = 0;
    await send({ type: "viewChanged", view: "team" });
    await settled(() => githubs().at(-1)?.project !== null && githubs().at(-1)?.reading === false);
    expect(githubs().at(-1)?.issues).toEqual([{ number: 126, status: "Closed", assignee: "giulia", sprint: "Sprint 2", estimate: 1 }]); // the Project has no estimate field: the estimate is the card's
    expect(controller.issueStates(projectAt(dir))).toMatchObject([{ number: 126, status: "Closed" }]);
    // With the Project unlinked nothing says where the issues are.
    await send({ type: "unlinkGitHubProject" });
    expect(controller.issueStates(projectAt(dir))).toEqual([]);
  } finally {
    controller.dispose();
    rmSync(issuesDir, { recursive: true, force: true });
    rmSync(join(dir, ".trama", "proposals"), { recursive: true, force: true });
  }
});

github("the Team view is told the signals of the open published issues at every picture, and the actions that are refused say why and change nothing", async () => {
  installGh(true);
  // The issue is open on GitHub: the item of the fake gh is the closed one, opened again.
  writeFileSync(join(ghDir, "items.json"), ITEMS_ANSWER.replace('"state":"CLOSED","stateReason":"COMPLETED"', '"state":"OPEN","stateReason":null'));
  const { people: team } = people();
  const project = projectAt(dir);
  const orderFile = join(dir, ".trama", "model", "checkout", "order.md");
  const model = readFileSync(orderFile, "utf8");
  const handoff = newProposal(project, "Order work", "Why.", { kind: "handoff", label: "orders" }).id;
  linkGithubProject(project, { owner: "Acme", number: 1, title: "Roadmap", iteration: true });
  writeFileSync(editInProposal(project, handoff, "issues/paid.md"), "---\nrefs: [order/Paid]\nestimate: 1\nassignee: ada\nreviewer: bob\nsprint: Sprint 2\n---\n\n# Paid orders\n\nBody.\n");
  submitProposal(project, handoff, [], { team: rosterOf([{ handle: "ada" }, { handle: "bob" }]) });
  const [card] = approveProposal(project, handoff, []).issues;
  moveIssue(project, card as string, "published", { number: 126, url: "https://github.com/Acme/Shop/issues/126" });
  const controller = await openWithGitHub(team);
  try {
    posted.length = 0;
    await send({ type: "viewChanged", view: "team" });
    await settled(() => githubs().at(-1)?.project !== null && githubs().at(-1)?.reading === false);
    let last = githubs().at(-1) as unknown as { issues: { number: number; status: string }[]; signals: Record<string, { kind: string; reason: string }[]>; actions: Record<string, { update: string | null; scan: string | null }> };
    // Open, the Model as it was: no signal, and both actions free; the action that does not fit the issue is refused.
    expect(last.issues).toMatchObject([{ number: 126, status: "Open" }]);
    expect(last.signals).toEqual({});
    expect(last.actions).toEqual({ 126: { update: null, scan: null } });
    posted.length = 0;
    await send({ type: "askIssueUpdate", issue: card as string });
    await send({ type: "scanIssue", issue: card as string });
    expect(notices()).toEqual([
      "Trama could not ask the agent to comment on issue #126: The Model did not change after the issue was published.",
      "Trama could not scan issue #126: Only a closed issue can be scanned.",
    ]);

    // The Model changes under the issue: the next picture says it is stale, without another read of GitHub.
    writeFileSync(orderFile, model.replace("### Paid\n", "### Paid\nThe customer has paid and the shop owes a receipt.\n"));
    posted.length = 0;
    await send({ type: "viewChanged", view: "team" });
    await settled(() => githubs().length > 0 && githubs().at(-1)?.reading === false && Object.keys((githubs().at(-1) as unknown as typeof last).signals).length > 0);
    last = githubs().at(-1) as unknown as typeof last;
    expect(last.signals).toEqual({ 126: [{ kind: "stale", reason: "The Model changed after publishing" }] });
  } finally {
    controller.dispose();
    writeFileSync(orderFile, model);
    rmSync(join(dir, ".trama", "issues"), { recursive: true, force: true });
    rmSync(join(dir, ".trama", "proposals"), { recursive: true, force: true });
  }
});

github("Comment update and Scan are refused with the reason of Team when it is not available, and for an issue that is not published", async () => {
  installGh(true);
  const { people: team } = people();
  const project = projectAt(dir);
  const handoff = newProposal(project, "Order work", "Why.", { kind: "handoff", label: "orders" }).id;
  linkGithubProject(project, { owner: "Acme", number: 1, title: "Roadmap", iteration: true });
  writeFileSync(editInProposal(project, handoff, "issues/paid.md"), "---\nrefs: [order/Paid]\nestimate: 1\nassignee: ada\nreviewer: bob\n---\n\n# Paid orders\n\nBody.\n");
  submitProposal(project, handoff, [], { team: rosterOf([{ handle: "ada" }, { handle: "bob" }]) });
  const [card] = approveProposal(project, handoff, []).issues;
  const controller = await openWithGitHub(team);
  try {
    posted.length = 0;
    await send({ type: "askIssueUpdate", issue: card as string });
    expect(notices().at(-1)).toContain("The issue is not published");
    setManagerMode(project, false);
    await send({ type: "scanIssue", issue: card as string });
    expect(notices().at(-1)).toContain("Manager Mode is off in this working copy");
  } finally {
    controller.dispose();
    setManagerMode(project, true);
    rmSync(join(dir, ".trama", "issues"), { recursive: true, force: true });
    rmSync(join(dir, ".trama", "proposals"), { recursive: true, force: true });
  }
});

// ---- The handoffs of the Decisions tab ----

/** An open handoff with one issue, written in the project the tests share; `forget` removes it. */
function openHandoff(): { id: string; issue: string; forget: () => void } {
  const project = projectAt(dir);
  const id = newProposal(project, "Order work", "Why.", { kind: "handoff", label: "orders" }).id;
  writeFileSync(editInProposal(project, id, "issues/paid.md"), "---\nrefs: [order/Paid]\nestimate: 2\nassignee: ada\nreviewer: bob\n---\n\n# Paid orders\n\nBody.\n");
  submitProposal(project, id, [], { team: rosterOf([{ handle: "ada" }, { handle: "bob" }]) });
  const issue = getProposal(project, id).issues[0]?.id as string;
  return { id, issue, forget: () => rmSync(join(dir, ".trama", "proposals"), { recursive: true, force: true }) };
}
const managerOf = (handoff: string, issue: string) => getProposal(projectAt(dir), handoff).issues.find((i) => i.id === issue)?.data.manager;
const rejections = (): { key: string; message: string }[] => posted.filter((message) => message.type === "issueFieldRejected") as unknown as { key: string; message: string }[];

github("setIssueField writes the Manager's value of an issue of an open handoff, checked against the team and the linked Project; a refused value reaches the preview and writes nothing", async () => {
  installGh(true);
  const { people: team } = people();
  const handoff = openHandoff();
  const controller = await openWithGitHub(team);
  try {
    await send({ type: "setIssueField", handoff: handoff.id, issue: handoff.issue, key: "estimate", value: 2.5 });
    expect(managerOf(handoff.id, handoff.issue)).toEqual({ estimate: 2.5 });
    expect(rejections()).toEqual([]);
    expect(getProposal(projectAt(dir), handoff.id).data.status).toBe("open");
    // The value of the agent again is the undo.
    await send({ type: "setIssueField", handoff: handoff.id, issue: handoff.issue, key: "estimate", value: 2 });
    expect(managerOf(handoff.id, handoff.issue)).toEqual({});

    await send({ type: "setIssueField", handoff: handoff.id, issue: handoff.issue, key: "estimate", value: 0.25 });
    await send({ type: "setIssueField", handoff: handoff.id, issue: handoff.issue, key: "assignee", value: "eve" });
    await send({ type: "setIssueField", handoff: handoff.id, issue: handoff.issue, key: "sprint", value: "Sprint 9" });
    expect(rejections().map((r) => [r.key, r.message])).toEqual([
      ["estimate", "Enter 0.5 days or more, in steps of 0.5."],
      ["assignee", "Choose a member of the team."],
      ["sprint", expect.stringContaining("Choose a sprint")],
    ]);
    expect(managerOf(handoff.id, handoff.issue)).toEqual({});
  } finally {
    controller.dispose();
    handoff.forget();
  }
});

github("setIssueField is refused while Team is not available", async () => {
  installGh(true);
  const { people: team } = people();
  const handoff = openHandoff();
  const controller = await openWithGitHub(team);
  try {
    setManagerMode(projectAt(dir), false);
    posted.length = 0;
    await send({ type: "setIssueField", handoff: handoff.id, issue: handoff.issue, key: "estimate", value: 3 });
    expect(rejections().map((r) => r.message)).toEqual(["Team is not available."]);
    expect(managerOf(handoff.id, handoff.issue)).toEqual({});
  } finally {
    controller.dispose();
    handoff.forget();
  }
});

test("a handoff is approved, rejected and reworked only from the Team view: from any other view the host refuses with a notice and nothing changes", async () => {
  const { people: team } = people();
  const handoff = openHandoff();
  const controller = await open(team);
  try {
    await send({ type: "viewChanged", view: "board" });
    posted.length = 0;
    await send({ type: "approveProposal", id: handoff.id });
    await send({ type: "rejectProposal", id: handoff.id });
    await send({ type: "reworkProposal", proposal: handoff.id });
    expect(notices()).toEqual([
      "Trama could not approve the handoff: decide it in the Team view.",
      "Trama could not reject the handoff: decide it in the Team view.",
      "Trama could not rework the handoff: decide it in the Team view.",
    ]);
    expect(getProposal(projectAt(dir), handoff.id).data.status).toBe("open");
  } finally {
    controller.dispose();
    handoff.forget();
  }
});

test("the same Reject, made from the Team view, rejects the handoff", async () => {
  const { people: team } = people();
  const handoff = openHandoff();
  const controller = await open(team);
  try {
    await send({ type: "viewChanged", view: "team" });
    posted.length = 0;
    await send({ type: "rejectProposal", id: handoff.id });
    expect(notices()).toEqual([]);
    expect(getProposal(projectAt(dir), handoff.id).data.status).toBe("rejected");
  } finally {
    controller.dispose();
    handoff.forget();
  }
});
