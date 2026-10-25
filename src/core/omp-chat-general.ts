// The conversation General of omp Chat (Machine `omp-chat-general`): its states, its transitions and the queue of the developer's messages while
// its process starts. Pure: the host (`extension/src/host/omp-chat/general.ts`) runs the effects and feeds the events back.

/** The states of General: `absent` is no General in the window, `waiting` is the window closed with a session kept for the next one. */
export type GeneralPhase = "absent" | "starting" | "ready" | "stopped" | "resuming" | "waiting" | "kept";

/**
 * What the host tells the machine. `usable` is omp Chat in use and the window with a folder open; `inTurn` is the agent in a turn; `saved` is a session
 * kept for the window (the entry under `trama.ompChat.general`).
 */
export type GeneralEvent =
  | { type: "settings"; usable: boolean; inTurn: boolean; saved: boolean }
  | { type: "reopen" }
  | { type: "sessionStarted" }
  | { type: "startFailed"; missing: boolean }
  | { type: "exited" }
  | { type: "sessionResumed" }
  | { type: "sessionNotResumed" }
  | { type: "send" }
  | { type: "stop" }
  | { type: "clear" }
  | { type: "close" }
  | { type: "windowClosed" };

/** What the host does for a transition. */
export type GeneralEffect =
  | "show"
  | "removed"
  | "start"
  | "startNew"
  | "resume"
  | "stop"
  | "discard"
  | "withdraw"
  | "save"
  | "unsave"
  | "deliver"
  | "wait"
  | "cancel"
  | "failed"
  | "missing"
  | "exited"
  | "cleared";

export interface GeneralMachine {
  phase: GeneralPhase;
  /** A session of General is known (opened, or kept for the next process): `stopped` starts with `resume` then, and `start` otherwise. */
  session: boolean;
}

export interface GeneralStep {
  next: GeneralMachine;
  effects: GeneralEffect[];
}

export const GENERAL_INITIAL: GeneralMachine = { phase: "absent", session: false };

const stay = (machine: GeneralMachine, ...effects: GeneralEffect[]): GeneralStep => ({ next: machine, effects });
const to = (phase: GeneralPhase, session: boolean, ...effects: GeneralEffect[]): GeneralStep => ({ next: { phase, session }, effects });

/** Leaving `absent` shows General; arriving there removes it from the view. */
function withView(from: GeneralPhase, step: GeneralStep): GeneralStep {
  if (from === "absent" && step.next.phase !== "absent") return { ...step, effects: ["show", ...step.effects] };
  if (from !== "absent" && step.next.phase === "absent") return { ...step, effects: [...step.effects, "removed"] };
  return step;
}

/** One transition of General for `event`; an event that has no transition in `machine.phase` changes nothing. */
export function generalStep(machine: GeneralMachine, event: GeneralEvent): GeneralStep {
  return withView(machine.phase, transition(machine, event));
}

function transition({ phase, session }: GeneralMachine, event: GeneralEvent): GeneralStep {
  switch (phase) {
    case "absent":
      if (event.type !== "settings") return stay({ phase, session });
      if (!event.usable) return event.saved ? to("absent", false, "discard") : stay({ phase, session });
      return event.saved ? to("waiting", true) : to("starting", false, "start");
    case "waiting":
      if (event.type === "reopen") return to("resuming", true, "resume");
      if (event.type === "sessionResumed") return to("ready", true, "deliver", "save");
      if (event.type === "sessionNotResumed") return to("starting", false, "startNew");
      if (event.type === "settings" && !event.usable) return to("absent", false, "discard");
      return stay({ phase, session });
    case "starting":
      if (event.type === "sessionStarted") return to("ready", true, "deliver", "save");
      if (event.type === "startFailed") return to("stopped", false, "failed", ...(event.missing ? ["missing" as const] : []));
      if (event.type === "send") return stay({ phase, session }, "wait");
      if (event.type === "clear") return to("starting", false, "stop", "discard", "withdraw", "cleared", "start");
      if (event.type === "settings" && !event.usable) return to("absent", false, "stop", "discard", "withdraw");
      if (event.type === "windowClosed") return to("absent", false, "stop", "discard", "withdraw");
      return stay({ phase, session });
    case "ready":
      if (event.type === "send") return stay({ phase, session }, "deliver");
      if (event.type === "stop") return stay({ phase, session }, "cancel");
      if (event.type === "clear") return to("starting", false, "stop", "discard", "withdraw", "cleared", "start");
      if (event.type === "exited") return to("stopped", session, "withdraw", "exited");
      if (event.type === "settings" && !event.usable) return event.inTurn ? to("kept", session, "unsave") : to("absent", false, "stop", "discard", "withdraw");
      if (event.type === "windowClosed") return to("waiting", true, "stop", "withdraw");
      return stay({ phase, session });
    case "stopped":
      if (event.type === "send") return session ? to("resuming", true, "resume", "wait") : to("starting", false, "start", "wait");
      if (event.type === "clear") return to("starting", false, "discard", "withdraw", "cleared", "start");
      if (event.type === "settings" && !event.usable) return to("absent", false, "discard", "withdraw");
      if (event.type === "windowClosed") return session ? to("waiting", true, "withdraw") : to("absent", false, "withdraw");
      return stay({ phase, session });
    case "resuming":
      if (event.type === "sessionResumed") return to("ready", true, "deliver", "save");
      if (event.type === "sessionNotResumed") return to("starting", false, "startNew");
      if (event.type === "send") return stay({ phase, session }, "wait");
      if (event.type === "clear") return to("starting", false, "stop", "discard", "withdraw", "cleared", "start");
      if (event.type === "settings" && !event.usable) return to("absent", false, "stop", "discard", "withdraw");
      if (event.type === "windowClosed") return to("waiting", true, "stop", "withdraw");
      return stay({ phase, session });
    case "kept":
      if (event.type === "send") return stay({ phase, session }, "deliver");
      if (event.type === "stop") return stay({ phase, session }, "cancel");
      if (event.type === "close") return to("absent", false, "stop", "discard", "withdraw");
      if (event.type === "exited") return to("absent", false, "withdraw", "discard");
      if (event.type === "settings" && event.usable) return to("ready", session, "save");
      if (event.type === "windowClosed") return to("absent", false, "stop", "discard", "withdraw");
      return stay({ phase, session });
  }
}

/** The phase General shows in its tab (`generalStatus`): absent and waiting are not drawn. */
export const drawnPhase = (phase: GeneralPhase): "starting" | "ready" | "stopped" | "resuming" | "kept" | undefined =>
  phase === "absent" || phase === "waiting" ? undefined : phase;

/**
 * The developer's messages of General that wait for its session, in the order they were sent. They go to the agent when the session opens, or back into
 * the field when the start fails.
 */
export class GeneralQueue {
  private readonly waiting: string[] = [];

  /** A message the developer sent while General's session is not open yet. An empty text is nothing to send. */
  push(text: string): void {
    if (text !== "") this.waiting.push(text);
  }

  /** Takes the waiting messages, in order, and empties the queue. */
  take(): string[] {
    return this.waiting.splice(0, this.waiting.length);
  }

  get size(): number {
    return this.waiting.length;
  }
}

/** The text a failed start returns to the field: the waiting messages, one under the other. */
export const returnedText = (messages: readonly string[]): string => messages.join("\n");
