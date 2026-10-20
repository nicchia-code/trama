import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { createQuestionServer, settleCoordinatorMessages, type QuestionServer } from "../src/core/question-channel";
import { getProposal, newProposal } from "../src/core/proposals";
import { resolveDriftInProposal } from "../src/core/resolution";
import { projectAt } from "../src/core/store";
import { newDrift } from "../src/core/work";
import { FIX_OPTIONS } from "./fix-options";

// The default runtime directory is under %LOCALAPPDATA% on Windows and under $XDG_RUNTIME_DIR elsewhere.
const RUNTIME_VARIABLE = process.platform === "win32" ? "LOCALAPPDATA" : "XDG_RUNTIME_DIR";

let root: string;
let projectRoot: string;
let runtimeDir: string;
let previousRuntimeDir: string | undefined;
let server: QuestionServer | undefined;

beforeEach(() => {
  root = mkdtempSync(process.platform === "win32" ? join(tmpdir(), "trama-auto-resolution-") : "/tmp/trama-ar-");
  projectRoot = join(root, "project");
  cpSync(join(import.meta.dir, "../examples/shop"), projectRoot, { recursive: true });
  previousRuntimeDir = process.env[RUNTIME_VARIABLE];
  process.env[RUNTIME_VARIABLE] = root;
  runtimeDir = process.platform === "win32" ? join(root, "Trama", "questions") : join(root, `trama-q-${process.getuid!()}`);
});
afterEach(async () => {
  await server?.dispose();
  server = undefined;
  if (previousRuntimeDir === undefined) delete process.env[RUNTIME_VARIABLE];
  else process.env[RUNTIME_VARIABLE] = previousRuntimeDir;
  rmSync(root, { recursive: true, force: true });
});

test("--job requires an automatic resolution", () => {
  const job = (input: object) => run(["proposal", "new", "--input", JSON.stringify({ title: "Resolve", ...input })], projectRoot, {});
  expect(() => job({ job: "job-1" })).toThrow(/job: applies only with automatic/);
  expect(() => job({ kind: "resolution", job: "job-1" })).toThrow(/job: applies only with automatic/);
});

test("an automatic resolution draft relays its proposal and job ids without persisting the job", async () => {
  let receive!: (message: Record<string, unknown>) => void;
  const received = new Promise<Record<string, unknown>>((resolve) => { receive = resolve; });
  server = await createQuestionServer({ project: projectAt(projectRoot), runtimeDir, handler: async () => ({ status: "unavailable", reason: "No project coordinator is available." }), onCoordinatorMessage: receive });

  const result = run(["proposal", "new", "--json", "--input", JSON.stringify({ title: "Resolve", kind: "resolution", automatic: true, job: "job-123" })], projectRoot, {});
  const output: unknown = JSON.parse(result.out);
  if (output === null || typeof output !== "object" || !("id" in output) || typeof output.id !== "string") throw new Error("CLI did not return a proposal id");
  const id = output.id;
  expect(await received).toEqual({ type: "proposal-draft", proposal: id, job: "job-123" });
  const proposal = getProposal(projectAt(projectRoot), id);
  expect(proposal.data.automatic).toBe(true);
  const file = readFileSync(join(proposal.dir, "proposal.md"), "utf8");
  expect(file).not.toContain("job-123");
});

test("without a live editor, the automatic resolution draft still exists", () => {
  const result = run(["proposal", "new", "--json", "--input", JSON.stringify({ title: "Resolve", kind: "resolution", automatic: true, job: "job-456" })], projectRoot, {});
  expect(result.exit).toBe(0);
  const output: unknown = JSON.parse(result.out);
  if (output === null || typeof output !== "object" || !("id" in output) || typeof output.id !== "string") throw new Error("CLI did not return a proposal id");
  const proposal = getProposal(projectAt(projectRoot), output.id);
  expect(proposal.data.status).toBe("draft");
  expect(proposal.data.automatic).toBe(true);
  expect(readFileSync(join(proposal.dir, "proposal.md"), "utf8")).not.toContain("job-456");
});

test("handing an automatic resolution over relays its id to the coordinator", async () => {
  const received: Record<string, unknown>[] = [];
  server = await createQuestionServer({ project: projectAt(projectRoot), runtimeDir, handler: async () => ({ status: "unavailable", reason: "No project coordinator is available." }), onCoordinatorMessage: (message) => { received.push(message); } });
  const project = projectAt(projectRoot);
  const finding = newDrift(project, { where: "src/refund.ts", title: "Finding", refs: ["order"], happens: "Code does it.", should: "Model says so.", options: FIX_OPTIONS });
  const proposal = newProposal(project, "Resolve", "", { kind: "resolution", automatic: true });
  resolveDriftInProposal(project, proposal.id, finding.id, { decision: "fix-code", option: 1 });

  expect(run(["proposal", "move", proposal.id, "open"], projectRoot, {}).exit).toBe(0);
  await settleCoordinatorMessages();
  expect(received).toEqual([{ type: "proposal-submitted", proposal: proposal.id }]);
});
