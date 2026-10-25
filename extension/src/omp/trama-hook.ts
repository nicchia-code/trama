import { statSync } from "node:fs";
import { resolve } from "node:path";
import { ADVISOR_AGENT, type Claim, type ClaimRole, type ClaimWriter, checkWrites, namedPaths, PARALLEL_ENV, PARALLEL_ON, projectPathOf, projectRootOf, releaseAgentClaims, RUN_ENV, RUN_ON, TASK_ENV } from "../../../src/core/claims";
import { QUESTION_TOOL_REFUSAL } from "../../../src/core/questions";

// Loaded by omp through `--hook` in the terminals Trama starts: tells the editor which process is the agent (once) and when the main agent has settled, refuses the agent's own question tool, and, in the terminals of a Run, claims the files the agent writes so that sub-agents do not write the same file at once. With the parallel execution on, a sub-agent stopped by another Task's claim records the clash with `trama timing new`.
// `session_stop` never fires for sub-agents and waits for the agent's own async jobs; `session_shutdown` covers omp quitting.
interface Ctx {
  cwd: string;
  agent?: { kind: "main" | "sub"; id?: string; parentId?: string };
}
interface Pi {
  on(event: "session_start" | "agent_start" | "agent_end" | "session_stop" | "session_shutdown" | "tool_call", handler: (event: unknown, ctx: Ctx) => unknown): void;
  exec(command: string, args: string[], options?: { cwd?: string; timeout?: number }): Promise<unknown>;
}

// The tools that write files: in a Run, the files they name are claimed before they run.
const WRITE_TOOLS: Record<string, true> = { write: true, edit: true, apply_patch: true, ast_edit: true };

// `ast_edit` names files by path or by glob pattern. A name that is a file of its own is claimed as written, whatever characters it has (`routes/[id].ts`); only a name that is no file and has a wildcard is expanded where the agent works.
const isFile = (path: string, cwd: string): boolean => {
  try {
    return statSync(resolve(cwd, path)).isFile();
  } catch {
    return false;
  }
};
const expandGlob = (pattern: string, cwd: string): string[] =>
  /[*?[{]/.test(pattern) && !isFile(pattern, cwd)
    ? Array.from(new Bun.Glob(pattern).scanSync({ cwd, onlyFiles: true })).filter((path) => !/(^|\/)(node_modules|\.git)(\/|$)/.test(path))
    : [pattern];

export default function tramaHook(pi: Pi): void {
  const terminal = process.env["TRAMA_TERMINAL"];
  if (!terminal) return;

  // In an omp Chat conversation (`TRAMA_ACP`) Trama started the process and knows the end of the work from omp's answer to the prompt: the hook says neither.
  const acp = process.env["TRAMA_ACP"] !== undefined && process.env["TRAMA_ACP"] !== "";

  const sendAgentEvent = async (cwd: string) => {
    await pi.exec("trama", ["hook", "idle"], { cwd, timeout: 3000 }).catch(() => undefined);
  };

  if (!acp) {
    // `agent-hook.STARTED`: said once, by the main session only, at its first `session_start` or, if omp gives none before the turn, its first `agent_start`.
    let started = false;
    const sendStarted = (ctx: Ctx) => {
      if (started || ctx.agent?.kind !== "main") return;
      started = true;
      void pi.exec("trama", ["hook", "start", String(process.pid)], { cwd: ctx.cwd, timeout: 3000 }).catch(() => undefined);
    };
    pi.on("session_start", (_event, ctx) => sendStarted(ctx));
    pi.on("agent_start", (_event, ctx) => sendStarted(ctx));

    pi.on("session_stop", (_event, ctx) => {
      if (ctx.agent?.kind !== "sub") void sendAgentEvent(ctx.cwd);
    });
    pi.on("session_shutdown", (_event, ctx) => {
      if (ctx.agent?.kind === "main") void sendAgentEvent(ctx.cwd);
    });
  }

  // The parent of each agent, as the events show it: the ancestors of a writer are read from here.
  const parents = new Map<string, string>();
  const observe = (ctx: Ctx) => {
    if (ctx.agent?.id !== undefined && ctx.agent.parentId !== undefined) parents.set(ctx.agent.id, ctx.agent.parentId);
  };
  const writerOf = (ctx: Ctx): ClaimWriter => {
    const agent = ctx.agent?.id ?? "main";
    const role: ClaimRole = ctx.agent?.kind !== "sub" ? "main" : agent === ADVISOR_AGENT ? "advisor" : "sub";
    const ancestors: string[] = [];
    for (let next = ctx.agent?.parentId; next !== undefined && !ancestors.includes(next); next = parents.get(next)) ancestors.push(next);
    const task = process.env[TASK_ENV];
    return { role, agent, terminal, ancestors, ...(task === undefined || task === "" ? {} : { task }) };
  };
  // A sub-agent stopped by a claim of another Task records the clash, when the parallel execution is on and both Tasks are known: a choice needs two different Tasks.
  const recordConflict = (ctx: Ctx, writer: ClaimWriter, holder: Claim) => {
    if (process.env[PARALLEL_ENV] !== PARALLEL_ON || writer.role !== "sub" || writer.task === undefined || holder.task === undefined || holder.task === writer.task) return;
    const input = JSON.stringify({ kind: "conflict", tasks: [writer.task, holder.task], reason: `${holder.path} is claimed by another Task's sub-agent` });
    void pi.exec("trama", ["timing", "new", "--input", input], { cwd: ctx.cwd, timeout: 3000 }).catch(() => undefined);
  };
  const claimOf = (toolName: string, input: unknown, ctx: Ctx): { block: true; reason: string } | undefined => {
    const root = projectRootOf(ctx.cwd);
    if (root === undefined) return undefined;
    const named = namedPaths(toolName, input);
    const globbed = toolName === "ast_edit" ? named.flatMap((pattern) => expandGlob(pattern, ctx.cwd)) : named;
    const paths = globbed.flatMap((path) => projectPathOf(root, ctx.cwd, path) ?? []);
    if (paths.length === 0) return undefined;
    const writer = writerOf(ctx);
    const refusal = checkWrites(root, paths, writer);
    if (refusal === undefined) return undefined;
    if (refusal.holder !== undefined) recordConflict(ctx, writer, refusal.holder);
    return { block: true, reason: refusal.reason };
  };

  // Trama's terminals refuse the agent's own question tool in every session, without the editor: the refusal says to use `trama question new`.
  pi.on("tool_call", (event, ctx) => {
    observe(ctx);
    const record = typeof event === "object" && event !== null ? (event as Record<string, unknown>) : {};
    const toolName = record["toolName"];
    if (toolName === "ask") return { block: true, reason: QUESTION_TOOL_REFUSAL };
    if (process.env[RUN_ENV] !== RUN_ON || typeof toolName !== "string" || WRITE_TOOLS[toolName] !== true) return undefined;
    return claimOf(toolName, record["input"], ctx);
  });

  // A sub-agent that settles without continuing has finished: the files it claimed are free for the others.
  pi.on("agent_end", (event, ctx) => {
    observe(ctx);
    const id = ctx.agent?.id;
    if (ctx.agent?.kind !== "sub" || id === undefined || id === ADVISOR_AGENT) return;
    if ((event as { willContinue?: unknown } | null)?.willContinue === true) return;
    const root = projectRootOf(ctx.cwd);
    if (root === undefined) return;
    try {
      releaseAgentClaims(root, terminal, id);
    } catch {
      // A claim that cannot be released expires on its own.
    }
  });
}
