// The conversations the stand-in `omp acp` replays for the scenes that show omp Chat: the `session/update` notifications of each recorded turn, in the order omp sent them, each after `after`
// milliseconds. A `session/prompt` replays the first turn whose `match` its text contains; a prompt no turn matches is a job that stays at work: its turn says nothing and ends only when the
// scene finishes the job (a `finish` step). A turn with `hold` does not end after its last notification either (the agent is still working, or waits for the developer), until the same.
// The texts follow the rules of Trama's own texts: Trama and the agent are named, never "I" or "we".
import type { SessionUpdate } from "@agentclientprotocol/sdk";

export interface RecordedUpdate {
  /** The pause before this notification, in milliseconds. */
  after: number;
  update: SessionUpdate;
}

export interface RecordedTurn {
  /** A text the prompt of the turn contains. */
  match: string;
  updates: readonly RecordedUpdate[];
  /** The turn stays open after its last notification. */
  hold?: true;
}

const text = (message: string): { type: "text"; text: string } => ({ type: "text", text: message });

/** A tool call that ran: the call and its completion. */
function ran(toolCallId: string, name: string, title: string, command: string, output: string): RecordedUpdate[] {
  return [
    { after: 150, update: { sessionUpdate: "tool_call", toolCallId, title, kind: "execute", status: "in_progress", name, rawInput: { command } } as SessionUpdate },
    { after: 200, update: { sessionUpdate: "tool_call_update", toolCallId, status: "completed", content: [{ type: "content", content: text(output) }] } as SessionUpdate },
  ];
}

const thought = (message: string): RecordedUpdate => ({ after: 150, update: { sessionUpdate: "agent_thought_chunk", content: text(message) } });
const say = (message: string): RecordedUpdate => ({ after: 150, update: { sessionUpdate: "agent_message_chunk", content: text(message) } });

export const TURNS: readonly RecordedTurn[] = [
  // General: the developer asks about the Model.
  {
    match: "Which states can an order be in?",
    updates: [
      thought("The Model of the shop describes the order Machine; reading it shows every state."),
      ...ran("call-1", "bash", "trama model show order", "trama model show order", "# Order\n\nStates: Draft, Awaiting payment, Paid (Preparing, Ready to ship), Refunding, Shipped, Cancelled."),
      say(
        "An order moves through **Draft**, **Awaiting payment**, **Paid**, **Shipped**, **Refunding** and **Cancelled**.\n\n- Confirming the cart moves it from *Draft* to *Awaiting payment*, and payment moves it to *Paid*.\n- Inside *Paid* the order is *Preparing* and then *Ready to ship*.\n- A cancelled order is refunded first once preparation has started.\n- *Shipped* and *Cancelled* are final.",
      ),
    ],
  },
  // Refining a stale Proposal.
  {
    match: "refine the stale Proposal",
    hold: true,
    updates: [
      thought("The Model changed under the Proposal. Reading what it changes and the current Model before adapting it."),
      ...ran("refine-1", "bash", "trama proposal show P2", "trama proposal show P2", "# Describe the draft order\n\nChanges: checkout/order.md"),
    ],
  },
  // A design job: the agent reads the Model and the request, and asks its round of questions.
  {
    match: "trama-design skill",
    hold: true,
    updates: [
      thought("The request asks for returns after shipping. Reading the order Machine and the Requirements before asking anything."),
      ...ran("design-1", "bash", "trama model show order", "trama model show order", "# Order\n\nStates: Draft, Awaiting payment, Paid, Refunding, Shipped, Cancelled."),
      ...ran("design-2", "bash", "trama model show requirements/data", "trama model show requirements/data", "# Data\n\nAn order keeps the payment reference and the shipping address."),
      say("The Model has no way back from **Shipped**. A few decisions are open before the Proposal can be written, so the agent asks them in one round."),
    ],
  },
  // Run: the agent builds a Task.
  {
    match: "trama-implement skill",
    hold: true,
    updates: [
      thought("Reading the Task and the Model elements it references."),
      ...ran("run-1", "bash", "trama task show", "trama task show", "# Task\n\nReferences: order/Shipped, user.RETURN"),
      say("Building the Task in `src/order.ts`."),
    ],
  },
  // Scan: the agent compares the Machines with the code.
  {
    match: "trama-scan skill",
    hold: true,
    updates: [
      thought("Comparing every Machine of the System with the code, one at a time."),
      ...ran("scan-1", "bash", "trama comparison new order", "trama comparison new order", "Machine: order\nReferences: order/Draft, order/Awaiting payment, order/Paid, order/Refunding, order/Shipped, order/Cancelled"),
      say("Comparing the `order` Machine with `src/order.ts`."),
    ],
  },
  // Import: the agent reads the repository.
  {
    match: "trama-import skill",
    hold: true,
    updates: [
      thought("Reading the repository: manifests, tests and the source folders, before describing it as it is."),
      ...ran("import-1", "bash", "ls src", "ls src", "adapters\ncart.ts\ncheckout.ts\nevents.ts\nmoney.ts\norder.ts\npayment.ts\nshop.test.ts"),
      say("The repository is an online shop in TypeScript. Describing the System and its Actors first."),
    ],
  },
];
