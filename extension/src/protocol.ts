import type { Snapshot } from "../../src/core/snapshot";

export type Column = "todo" | "doing" | "done";

/** What the buttons can ask an external agent to do. The host turns each into a prompt for one skill. */
export type AgentAction =
  /** `prompt` absent: the host asks the developer with an input box. */
  | { kind: "design"; prompt?: string }
  /** `feature` absent: the whole System. */
  | { kind: "scan"; feature?: string }
  | { kind: "implement"; task: string }
  /** Every Task in "todo", in order; the agent stops at the first Drift. */
  | { kind: "implement-all" }
  /** Describe the existing code as Proposals for the Model; the agent asks its own questions. */
  | { kind: "import" };

/** Webview -> host. The host validates everything: the webview is untrusted input. */
export type ToHost =
  | { type: "ready" }
  | { type: "launch"; action: AgentAction }
  /** Tracked path: relative to `.trama/model/`, or `requirements/<area>.md`. */
  | { type: "openModelFile"; path: string }
  /** Path relative to `.trama/` (for example `tasks/0003-x.md`). */
  | { type: "openFile"; path: string }
  | { type: "moveTask"; id: string; column: Column }
  /** The host asks for the title with an input box. */
  | { type: "newTechnicalTask" }
  | { type: "approveProposal"; id: string }
  /** The host asks for the feedback with an input box. */
  | { type: "rejectProposal"; id: string }
  | { type: "resolveDrift"; id: string; how: "fix-code" | "accept-proposal" | "dismiss" };

export type ViewName = "diagram" | "board" | "requirements";

export interface NavigateOptions {
  /** Element reference (`checkout`, `order`, `order/Paid`, `user.CANCEL`…): the Diagram shows it. */
  ref?: string;
  /** Open Proposal to draw over the Model. */
  proposal?: string;
}

/** Host -> webview. */
export type ToWebview =
  | { type: "snapshot"; snapshot: Snapshot }
  /** An operation failed, or the files on disk cannot be read. Shown until dismissed or replaced by a snapshot. */
  | { type: "error"; message: string }
  | ({ type: "navigate"; view: ViewName } & NavigateOptions);
