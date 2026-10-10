// Loaded by omp through `--hook` in the terminals Trama starts: sends heartbeats while an agent works, and tells the
// editor when the main agent has settled. `session_stop` never fires for sub-agents and waits for the agent's own async
// jobs; `session_shutdown` covers omp quitting.
interface Ctx {
  cwd: string;
  agent?: { kind: "main" | "sub" };
  setInterval(callback: () => void, interval: number): unknown;
  clearTimer(handle: unknown): void;
}
interface Pi {
  on(event: "agent_start" | "agent_end" | "session_stop" | "session_shutdown", handler: (event: unknown, ctx: Ctx) => unknown): void;
  exec(command: string, args: string[], options?: { cwd?: string; timeout?: number }): Promise<unknown>;
}

export default function tramaHook(pi: Pi): void {
  if (!process.env["TRAMA_TERMINAL"]) return;

  // Heartbeat: `alive` at once and then every 5 minutes, from agent_start to agent_end, for main and sub agents alike.
  // The timer is the handler context's, as omp gives it. Never holds omp up and never fails.
  let heartbeat: { ctx: Ctx; handle: unknown } | undefined;
  const sendAgentEvent = async (kind: "alive" | "idle", cwd: string) => {
    await pi.exec("trama", ["agent-event", kind], { cwd, timeout: 3000 }).catch(() => undefined);
  };
  const stopHeartbeat = () => {
    if (heartbeat !== undefined) {
      heartbeat.ctx.clearTimer(heartbeat.handle);
      heartbeat = undefined;
    }
  };
  const startHeartbeat = (ctx: Ctx) => {
    stopHeartbeat();
    void sendAgentEvent("alive", ctx.cwd);
    heartbeat = { ctx, handle: ctx.setInterval(() => void sendAgentEvent("alive", ctx.cwd), 300000) };
  };

  pi.on("agent_start", (_event, ctx) => startHeartbeat(ctx));
  pi.on("agent_end", () => stopHeartbeat());
  // Idle: the main session has settled. A sub-agent never says so; without `ctx.agent`, only session_stop does.
  pi.on("session_stop", (_event, ctx) => {
    if (ctx.agent?.kind !== "sub") void sendAgentEvent("idle", ctx.cwd);
  });
  pi.on("session_shutdown", (_event, ctx) => {
    stopHeartbeat();
    if (ctx.agent?.kind === "main") void sendAgentEvent("idle", ctx.cwd);
  });
}
