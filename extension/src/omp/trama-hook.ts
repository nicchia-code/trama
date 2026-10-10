// Loaded by omp through `--hook` in the terminals Trama starts: tells the editor when the main agent has settled.
// `session_stop` never fires for sub-agents and waits for the agent's own async jobs; `session_shutdown` covers omp quitting.
interface Ctx {
  cwd: string;
  agent?: { kind: "main" | "sub" };
}
interface Pi {
  on(event: "session_stop" | "session_shutdown", handler: (event: unknown, ctx: Ctx) => unknown): void;
  exec(command: string, args: string[], options?: { cwd?: string; timeout?: number }): Promise<unknown>;
}

export default function tramaHook(pi: Pi): void {
  if (!process.env["TRAMA_TERMINAL"]) return;

  const sendAgentEvent = async (cwd: string) => {
    await pi.exec("trama", ["agent-event", "idle"], { cwd, timeout: 3000 }).catch(() => undefined);
  };

  pi.on("session_stop", (_event, ctx) => {
    if (ctx.agent?.kind !== "sub") void sendAgentEvent(ctx.cwd);
  });
  pi.on("session_shutdown", (_event, ctx) => {
    if (ctx.agent?.kind === "main") void sendAgentEvent(ctx.cwd);
  });
}
