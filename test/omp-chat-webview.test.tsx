import { afterEach, beforeEach, expect, test } from "bun:test";
import type { SessionNotification } from "@agentclientprotocol/sdk";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ConversationItem, ToChatHost, ToChatWebview } from "../extension/src/omp-chat-protocol";
import { ChatApp, createChatController } from "../extension/src/webview/omp-chat/app";
import { fieldsOf } from "../extension/src/webview/omp-chat/forms";
import { createChatStore } from "../extension/src/webview/omp-chat/state";
import { announcement, applyUpdate, type Block, emptyTranscript, errorLine, MAX_ERROR_CHARS, start, type Transcript } from "../extension/src/webview/omp-chat/transcript";

afterEach(cleanup);

function setup() {
  const store = createChatStore();
  const posted: ToChatHost[] = [];
  const controller = createChatController(store, (message) => void posted.push(message), () => 1000);
  render(<ChatApp store={store} controller={controller} />);
  const host = (message: ToChatWebview) => act(() => controller.receive(message));
  return { store, posted, host, controller };
}

const item = (id: string, name: string, state: ConversationItem["state"] = "idle"): ConversationItem => ({ id, name, state });
const chunk = (text: string, kind: "agent_message_chunk" | "agent_thought_chunk" | "user_message_chunk" = "agent_message_chunk", messageId?: string): SessionNotification => ({
  sessionId: "s",
  update: { sessionUpdate: kind, content: { type: "text", text }, ...(messageId === undefined ? {} : { messageId }) },
});

test("with no conversation the view shows one sentence in secondary text and nothing else", () => {
  setup();
  const text = screen.getByText("Trama's jobs with omp open here, one conversation each.");
  expect(text.parentElement?.className).toContain("text-muted-foreground");
  expect(document.body.textContent).toBe("Trama's jobs with omp open here, one conversation each.");
  expect(screen.queryByRole("tablist")).toBeNull();
});

test("with conversations there is a tab for each, in order, and the one in view is selected", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3"), item("b", "All tasks · gpt-5"), item("c", "Ask P2")], selected: "b" });
  const tabs = screen.getAllByRole("tab");
  expect(tabs.map((tab) => tab.textContent)).toEqual(["T3", "All tasks · gpt-5", "Ask P2"]);
  expect(tabs.map((tab) => tab.getAttribute("aria-selected"))).toEqual(["false", "true", "false"]);
  expect(screen.getByRole("tablist")).not.toBeNull();
  expect(screen.queryByText("Trama's jobs with omp open here, one conversation each.")).toBeNull();
});

test("the tab shows an animated dot while the agent is in a turn and a warning dot while a form waits", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3", "running"), item("b", "Quick", "waiting-form"), item("c", "Scan")], selected: "a" });
  const [first, second, third] = screen.getAllByRole("tab");
  expect(first?.querySelector('[data-dot="running"]')?.className).toContain("animate-pulse");
  expect(first?.querySelector('[data-dot="running"]')?.className).toContain("motion-reduce:animate-none");
  expect(second?.querySelector('[data-dot="waiting-form"]')?.className).toContain("bg-amber-500");
  expect(second?.querySelector('[data-dot="waiting-form"]')?.className).not.toContain("animate-pulse");
  expect(third?.querySelector("[data-dot]")).toBeNull();
});

test("each tab has an X with the name Close <name>", () => {
  const { host, posted } = setup();
  host({ type: "conversations", items: [item("a", "T3"), item("b", "Quick")], selected: "a" });
  fireEvent.click(screen.getByRole("button", { name: "Close Quick" }));
  expect(posted).toEqual([{ type: "closeConversation", id: "b" }]);
});

test("the arrows pass from one tab to the next, round the ends", () => {
  const { host, posted } = setup();
  host({ type: "conversations", items: [item("a", "T3"), item("b", "Quick"), item("c", "Scan")], selected: "a" });
  const tab = (name: string) => screen.getByRole("tab", { name });
  fireEvent.keyDown(tab("T3"), { key: "ArrowRight" });
  expect(tab("Quick").getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(tab("Quick"));
  fireEvent.keyDown(tab("Quick"), { key: "ArrowLeft" });
  fireEvent.keyDown(tab("T3"), { key: "ArrowLeft" });
  expect(tab("Scan").getAttribute("aria-selected")).toBe("true");
  expect(posted.filter((message) => message.type === "selectConversation").map((message) => (message as { id: string }).id)).toEqual(["b", "a", "c"]);
});

test("Delete on a tab closes its conversation like the X", () => {
  const { host, posted } = setup();
  host({ type: "conversations", items: [item("a", "T3"), item("b", "Quick")], selected: "a" });
  fireEvent.keyDown(screen.getByRole("tab", { name: "Quick" }), { key: "Delete" });
  expect(posted).toEqual([{ type: "closeConversation", id: "b" }]);
});

test("after a close the host's neighbour is in view, and the last close shows the empty view", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3"), item("b", "Quick"), item("c", "Scan")], selected: "b" });
  host({ type: "conversations", items: [item("a", "T3"), item("c", "Scan")], selected: "c" });
  expect(screen.getByRole("tab", { name: "Scan" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.queryByRole("tab", { name: "Quick" })).toBeNull();
  host({ type: "conversations", items: [] });
  expect(screen.getByText("Trama's jobs with omp open here, one conversation each.")).not.toBeNull();
});

test("only the conversation of the selected tab shows", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3"), item("b", "Quick")], selected: "a" });
  host({ type: "conversationStart", id: "a", first: { text: "Do the Task" }, focus: false });
  host({ type: "conversationStart", id: "b", first: { text: "Ask me" }, focus: false });
  const panels = screen.getAllByRole("tabpanel", { hidden: true });
  expect(panels.map((panel) => panel.hidden)).toEqual([false, true]);
  expect(screen.getByText("Do the Task")).not.toBeNull();
});

test("Trama's instruction is the first message, labelled Trama, with its attachment expandable", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "Unify")], selected: "a" });
  host({ type: "conversationStart", id: "a", first: { text: "Unify the Drifts", attachment: { name: "unify.md", text: "the attached text" } }, notice: "The window reloaded; the agent continues its work.", focus: false });
  expect(screen.getByText("The window reloaded; the agent continues its work.")).not.toBeNull();
  expect(screen.getByText("Trama")).not.toBeNull();
  expect(screen.queryByText("the attached text")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /unify\.md/ }));
  expect(screen.getByText("the attached text")).not.toBeNull();
});

test("the agent's streamed text builds one Markdown message, and a tool call whose title fits is a plain row that is not a button and does not show its result", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3", "running")], selected: "a" });
  host({ type: "conversationUpdate", id: "a", update: chunk("Hello **wor") });
  host({ type: "conversationUpdate", id: "a", update: chunk("ld**") });
  expect(document.querySelectorAll('[data-message="agent"]')).toHaveLength(1);
  expect(document.querySelector('[data-message="agent"] strong')?.textContent).toBe("world");
  host({
    type: "conversationUpdate",
    id: "a",
    update: { sessionId: "s", update: { sessionUpdate: "tool_call", toolCallId: "t1", title: "Run tests", kind: "execute", status: "in_progress" } },
  });
  const row = document.querySelector('[data-tool="t1"]') as HTMLElement;
  expect(within(row).getByLabelText("Running")).not.toBeNull();
  host({
    type: "conversationUpdate",
    id: "a",
    update: { sessionId: "s", update: { sessionUpdate: "tool_call_update", toolCallId: "t1", status: "completed", content: [{ type: "content", content: { type: "text", text: "3 passed" } }] } },
  });
  expect(within(row).getByLabelText("Done")).not.toBeNull();
  expect(within(row).queryByRole("button")).toBeNull();
  expect(row.querySelector("[aria-expanded]")).toBeNull();
  expect(row.querySelector("[tabindex], button, a")).toBeNull();
  expect(row.textContent).toBe("Run tests");
  expect(screen.queryByText("3 passed")).toBeNull();
  fireEvent.click(screen.getByText("Run tests"));
  expect(screen.queryByText("3 passed")).toBeNull();
});

test("a failed call shows the first line of omp's error under its row, in the error colour, and nothing when there is no error text", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3")], selected: "a" });
  const update = (next: SessionNotification["update"]) => host({ type: "conversationUpdate", id: "a", update: { sessionId: "s", update: next } });
  update({ sessionUpdate: "tool_call", toolCallId: "f", title: "Run tests", kind: "execute", status: "in_progress" });
  update({ sessionUpdate: "tool_call_update", toolCallId: "f", status: "failed", content: [{ type: "content", content: { type: "text", text: "\n  \nexit code 1: boom\nsecond line" } }] });
  update({ sessionUpdate: "tool_call", toolCallId: "g", title: "Read", kind: "read", status: "failed" });
  const row = document.querySelector('[data-tool="f"]') as HTMLElement;
  expect(within(row).getByLabelText("Failed").getAttribute("class")).toContain("text-destructive");
  const error = within(row).getByText("exit code 1: boom");
  expect(error.className).toContain("text-destructive");
  expect(error.className).toContain("text-xs");
  expect(error.className).toContain("truncate");
  expect(error.className).toContain("pl-5");
  expect(row.textContent).not.toContain("second line");
  expect(within(row).queryByRole("button")).toBeNull();
  const bare = document.querySelector('[data-tool="g"]') as HTMLElement;
  expect(within(bare).getByLabelText("Failed")).not.toBeNull();
  expect(bare.querySelectorAll("p")).toHaveLength(0);
});

test("the error line is the first line of the report that is not blank, trimmed; none without text", () => {
  expect(errorLine("\n \n  exit 2  \nnext")).toBe("exit 2");
  expect(errorLine("only")).toBe("only");
  expect(errorLine("")).toBeUndefined();
  expect(errorLine(" \n\t\n")).toBeUndefined();
  expect(errorLine(undefined)).toBeUndefined();
  expect(errorLine("x".repeat(MAX_ERROR_CHARS + 50))).toHaveLength(MAX_ERROR_CHARS);
});

test("a block keeps the error line of a failed call and nothing of a call that succeeded", () => {
  const tool = (t: Transcript) => t.blocks[0] as Extract<Block, { kind: "tool" }>;
  const call = (status: "completed" | "failed") =>
    applyUpdate(
      applyUpdate(emptyTranscript(), { sessionId: "s", update: { sessionUpdate: "tool_call", toolCallId: "t", title: "x", kind: "execute", status: "in_progress", content: [{ type: "content", content: { type: "text", text: "why\nmore" } }] } }, 1),
      { sessionId: "s", update: { sessionUpdate: "tool_call_update", toolCallId: "t", status } },
      2,
    );
  expect(tool(call("failed")).error).toBe("why");
  expect(tool(call("completed"))).not.toHaveProperty("error");
  expect(tool(call("completed"))).not.toHaveProperty("output");
});

test("a call whose title starts with a language prefix shows that language's logo before the title, which loses the prefix", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3")], selected: "a" });
  host({ type: "conversationUpdate", id: "a", update: { sessionId: "s", update: { sessionUpdate: "tool_call", toolCallId: "t", title: "[py] print(1)", kind: "execute", status: "completed" } } });
  const row = document.querySelector('[data-tool="t"]') as HTMLElement;
  const line = row.firstElementChild?.firstElementChild as HTMLElement;
  expect(within(line).getByRole("img", { name: "Python" })).not.toBeNull();
  expect(line.firstElementChild?.tagName.toLowerCase()).toBe("svg");
  expect(line.textContent).toBe("print(1)");
});

test("an edit shows the path of each file it touched as plain text that opens nothing", () => {
  const { host, posted } = setup();
  host({ type: "conversations", items: [item("a", "T3")], selected: "a" });
  host({
    type: "conversationUpdate",
    id: "a",
    update: {
      sessionId: "s",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "t",
        title: "Edit",
        kind: "edit",
        status: "completed",
        content: [
          { type: "diff", path: "src/a.ts", newText: "x" },
          { type: "diff", path: "src/b.ts", newText: "y" },
        ],
      },
    },
  });
  const row = document.querySelector('[data-tool="t"]') as HTMLElement;
  expect(within(row).queryByRole("button")).toBeNull();
  const paths = [...row.querySelectorAll("p")];
  expect(paths.map((path) => path.textContent)).toEqual(["src/a.ts", "src/b.ts"]);
  expect(paths[0]?.className).toContain("font-mono");
  expect(paths[0]?.className).toContain("text-muted-foreground");
  fireEvent.click(screen.getByText("src/a.ts"));
  expect(posted).toEqual([]);
  expect(document.body.textContent).not.toContain("newText");
});

test("the plan sits above the message field with its count, and goes when the agent has none", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3")], selected: "a" });
  host({
    type: "conversationUpdate",
    id: "a",
    update: {
      sessionId: "s",
      update: {
        sessionUpdate: "plan",
        entries: [
          { content: "Read", priority: "medium", status: "completed" },
          { content: "Write", priority: "medium", status: "in_progress" },
          { content: "Test", priority: "medium", status: "pending" },
        ],
      },
    },
  });
  const plan = screen.getByRole("region", { name: "Plan" });
  expect(within(plan).getByText("1/3")).not.toBeNull();
  expect(within(plan).getAllByRole("listitem")).toHaveLength(3);
  host({ type: "conversationUpdate", id: "a", update: { sessionId: "s", update: { sessionUpdate: "plan_removed", planId: "p" } } });
  expect(screen.queryByRole("region", { name: "Plan" })).toBeNull();
});

test("Enter sends, Shift+Enter does not, Send waits for text, and Stop shows only while the agent is in a turn", () => {
  const { host, posted } = setup();
  host({ type: "conversations", items: [item("a", "T3")], selected: "a" });
  const field = screen.getByPlaceholderText("Message omp…");
  expect((screen.getByRole("button", { name: "Send" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByRole("button", { name: "Stop the agent" })).toBeNull();
  fireEvent.change(field, { target: { value: "hello" } });
  expect((screen.getByRole("button", { name: "Send" }) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.keyDown(field, { key: "Enter", shiftKey: true });
  expect(posted).toEqual([]);
  fireEvent.keyDown(field, { key: "Enter" });
  expect(posted).toEqual([{ type: "sendMessage", id: "a", text: "hello", messageId: expect.any(String) }]);
  expect((field as HTMLTextAreaElement).value).toBe("");
  expect(screen.getByText("hello")).not.toBeNull();
  host({ type: "conversations", items: [item("a", "T3", "running")], selected: "a" });
  // The field stays active while the agent works, and Stop sits beside Send.
  expect((field as HTMLTextAreaElement).disabled).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Stop the agent" }));
  expect(posted[1]).toEqual({ type: "stopAgent", id: "a" });
});

test("a message that did not start comes back into the field and leaves the transcript, and an empty return leaves the field as it is", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3")], selected: "a" });
  const field = screen.getByPlaceholderText("Message omp…") as HTMLTextAreaElement;
  fireEvent.change(field, { target: { value: "hello" } });
  fireEvent.keyDown(field, { key: "Enter" });
  expect(screen.getByText("hello")).not.toBeNull();
  host({ type: "returnToField", id: "a", text: "hello" });
  expect(field.value).toBe("hello");
  expect(screen.queryAllByText("hello").filter((element) => element.tagName !== "TEXTAREA")).toEqual([]);
  fireEvent.change(field, { target: { value: "other" } });
  host({ type: "returnToField", id: "a", text: "" });
  expect(field.value).toBe("other");
});

test("a form of the agent shows its question, takes the answer and stays read-only", () => {
  const { host, posted } = setup();
  host({ type: "conversations", items: [item("a", "Quick", "waiting-form")], selected: "a" });
  host({
    type: "formRequest",
    id: "a",
    requestId: "r1",
    message: "Which database?",
    schema: { type: "object", properties: { db: { type: "string", title: "Database", oneOf: [{ const: "pg", title: "Postgres" }, { const: "my", title: "MySQL" }] }, note: { type: "string", title: "Note" } }, required: ["db"] },
  });
  expect(screen.getByText("Which database?")).not.toBeNull();
  const submit = screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement;
  expect(submit.disabled).toBe(true);
  fireEvent.click(screen.getByRole("radio", { name: "Postgres" }));
  expect(submit.disabled).toBe(false);
  fireEvent.click(submit);
  expect(posted).toEqual([{ type: "formAnswer", id: "a", requestId: "r1", answer: { action: "accept", content: { db: "pg" } } }]);
  expect(screen.queryByRole("button", { name: "Submit" })).toBeNull();
  expect(screen.getByText("Postgres")).not.toBeNull();
});

test("Skip refuses the form", () => {
  const { host, posted } = setup();
  host({ type: "conversations", items: [item("a", "Quick", "waiting-form")], selected: "a" });
  host({ type: "formRequest", id: "a", requestId: "r1", message: "Sure?", schema: { type: "object", properties: { ok: { type: "boolean", title: "OK" } } } });
  fireEvent.click(screen.getByRole("button", { name: "Skip" }));
  expect(posted).toEqual([{ type: "formAnswer", id: "a", requestId: "r1", answer: { action: "decline" } }]);
  expect(screen.getByText("Skipped")).not.toBeNull();
});

test("a model chosen from the selector goes to the host", () => {
  const { host, posted } = setup();
  host({ type: "conversations", items: [item("a", "T3")], selected: "a" });
  host({ type: "models", id: "a", available: [{ id: "m1", name: "One" }, { id: "m2", name: "Two" }], current: "m1" });
  fireEvent.click(screen.getByRole("combobox", { name: "Model" }));
  fireEvent.click(screen.getByText("Two"));
  expect(posted).toEqual([{ type: "setModel", id: "a", model: "m2" }]);
});

test("an error of omp shows in the conversation", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3")], selected: "a" });
  host({ type: "conversationError", id: "a", message: "unknown model" });
  expect(screen.getByRole("alert").textContent).toBe("unknown model");
});

test("a reset forgets every conversation", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3")], selected: "a" });
  host({ type: "reset" });
  expect(screen.getByText("Trama's jobs with omp open here, one conversation each.")).not.toBeNull();
});

test("the transcript drops the echo of a message it already shows, and keeps a history it replays", () => {
  let t = start(emptyTranscript(), { text: "Do it" }, undefined, 0);
  t = applyUpdate(t, chunk("Do ", "user_message_chunk"), 1);
  t = applyUpdate(t, chunk("it", "user_message_chunk"), 1);
  expect(t.blocks).toHaveLength(1);
  const replayed = applyUpdate(emptyTranscript(), chunk("Earlier message", "user_message_chunk", "m1"), 1);
  expect(replayed.blocks).toMatchObject([{ kind: "user", text: "Earlier message" }]);
  const joined = applyUpdate(replayed, chunk(" continues", "user_message_chunk", "m1"), 1);
  expect(joined.blocks).toMatchObject([{ kind: "user", text: "Earlier message continues" }]);
});

test("the agent's message is announced once it is complete, not at each chunk", () => {
  let t = applyUpdate(emptyTranscript(), chunk("Part"), 1);
  expect(announcement(t, true)).toBe("");
  t = applyUpdate(t, chunk(" two"), 2);
  expect(announcement(t, true)).toBe("");
  expect(announcement(t, false)).toBe("Part two");
  t = applyUpdate(t, { sessionId: "s", update: { sessionUpdate: "tool_call", toolCallId: "t", title: "x", kind: "read" } }, 3);
  expect(announcement(t, true)).toBe("Part two");
});

test("a thought is a closed block with the elapsed time while it goes on", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3", "running")], selected: "a" });
  host({ type: "conversationUpdate", id: "a", update: chunk("pondering", "agent_thought_chunk") });
  const header = screen.getByRole("button", { name: /Thinking/ });
  expect(header.textContent).toMatch(/^Thinking · \d+ s$/);
  expect(header.getAttribute("aria-expanded")).toBe("false");
  expect(screen.queryByText("pondering")).toBeNull();
  fireEvent.click(header);
  expect(screen.getByText("pondering")).not.toBeNull();
});

test("a form's fields come from the schema: single and multiple choice, text, boolean and number", () => {
  const fields = fieldsOf({
    type: "object",
    properties: {
      one: { type: "string", enum: ["a", "b"] },
      many: { type: "array", items: { type: "string", enum: ["x", "y"] } },
      free: { type: "string" },
      flag: { type: "boolean" },
      count: { type: "integer" },
    },
    required: ["one"],
  });
  expect(fields.map((field) => [field.key, field.kind, field.required])).toEqual([
    ["one", "single", true],
    ["many", "multi", false],
    ["free", "text", false],
    ["flag", "boolean", false],
    ["count", "number", false],
  ]);
});

const permissionOptions = [
  { optionId: "once", name: "Allow once", kind: "allow_once" as const },
  { optionId: "always", name: "Allow always", kind: "allow_always" as const },
  { optionId: "no", name: "Reject", kind: "reject_once" as const },
];

test("a permission request shows in the flow with the warnings border, the tool row and a button per option in omp's order", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3", "waiting-permission")], selected: "a" });
  host({ type: "permissionRequest", id: "a", requestId: "p1", toolCall: { toolCallId: "t", title: "Run rm -rf build", kind: "execute" }, options: permissionOptions });
  const box = document.querySelector('[data-permission="p1"]');
  expect(box?.className).toContain("border-amber-500");
  expect(within(box as HTMLElement).getByText("omp asks permission")).not.toBeNull();
  expect(within(box as HTMLElement).getByText("Run rm -rf build")).not.toBeNull();
  const buttons = within(box as HTMLElement).getAllByRole("button");
  expect(buttons.map((button) => button.textContent)).toEqual(["Allow once", "Allow always", "Reject"]);
  expect(buttons.map((button) => button.className.includes("border bg-background"))).toEqual([false, false, true]);
});

test("choosing an option posts the answer and leaves the request read-only with that option", () => {
  const { host, posted } = setup();
  host({ type: "conversations", items: [item("a", "T3", "waiting-permission")], selected: "a" });
  host({ type: "permissionRequest", id: "a", requestId: "p1", toolCall: { toolCallId: "t", title: "Run ls" }, options: permissionOptions });
  fireEvent.click(screen.getByRole("button", { name: "Allow always" }));
  expect(posted).toEqual([{ type: "permissionAnswer", id: "a", requestId: "p1", optionId: "always" }]);
  expect(screen.queryByRole("button", { name: "Reject" })).toBeNull();
  expect(screen.getByText("Allow always")).not.toBeNull();
});

test("a request cancelled by Stop or by the end of the process says Cancelled and keeps no buttons", () => {
  const { host, posted } = setup();
  host({ type: "conversations", items: [item("a", "T3", "waiting-permission")], selected: "a" });
  host({ type: "permissionRequest", id: "a", requestId: "p1", toolCall: { toolCallId: "t", title: "Run ls" }, options: permissionOptions });
  host({ type: "permissionCancelled", id: "a", requestId: "p1" });
  expect(screen.getByText("Cancelled")).not.toBeNull();
  expect(screen.queryByRole("button", { name: "Allow once" })).toBeNull();
  expect(posted).toEqual([]);
});

test("the tool row takes the title of the call already in the conversation when the request has none", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3", "running")], selected: "a" });
  host({ type: "conversationUpdate", id: "a", update: { sessionId: "s", update: { sessionUpdate: "tool_call", toolCallId: "t", title: "Edit a.ts", kind: "edit", status: "pending" } } });
  host({ type: "permissionRequest", id: "a", requestId: "p1", toolCall: { toolCallId: "t" }, options: permissionOptions });
  const box = document.querySelector('[data-permission="p1"]') as HTMLElement;
  expect(within(box).getByText("Edit a.ts")).not.toBeNull();
});

test("a tab waiting for a permission has the warnings dot, not the animated one", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3", "waiting-permission")], selected: "a" });
  const dot = screen.getAllByRole("tab")[0]?.querySelector('[data-dot="waiting-permission"]');
  expect(dot?.className).toContain("bg-amber-500");
  expect(dot?.className).not.toContain("animate-pulse");
});

test("Stop stays available while a permission request waits", () => {
  const { host, posted } = setup();
  host({ type: "conversations", items: [item("a", "T3", "waiting-permission")], selected: "a" });
  fireEvent.click(screen.getByRole("button", { name: "Stop the agent" }));
  expect(posted).toEqual([{ type: "stopAgent", id: "a" }]);
});

test("Steer or Queue is chosen for a message sent while the agent works; a queued message says so until it is delivered", () => {
  const { host, posted } = setup();
  host({ type: "sendMode", mode: "steer" });
  host({ type: "conversations", items: [item("a", "T3", "running")], selected: "a" });
  expect(screen.getByRole("radio", { name: "Steer" }).getAttribute("aria-checked")).toBe("true");
  fireEvent.click(screen.getByRole("radio", { name: "Queue" }));
  expect(posted).toEqual([{ type: "setSendMode", mode: "queue" }]);
  expect(screen.getByRole("radio", { name: "Queue" }).getAttribute("aria-checked")).toBe("true");
  const field = screen.getByPlaceholderText("Message omp…");
  fireEvent.change(field, { target: { value: "more" } });
  fireEvent.keyDown(field, { key: "Enter" });
  const sent = posted[1] as Extract<ToChatHost, { type: "sendMessage" }>;
  expect(sent).toEqual({ type: "sendMessage", id: "a", text: "more", messageId: expect.any(String) });
  host({ type: "messageStatus", id: "a", messageId: sent.messageId, status: "queued" });
  expect(screen.getByText("Queued")).not.toBeNull();
  host({ type: "messageStatus", id: "a", messageId: sent.messageId, status: "delivered" });
  expect(screen.queryByText("Queued")).toBeNull();
});

test("a message that is not delivered stays in place, with the reason", () => {
  const { host, posted } = setup();
  host({ type: "conversations", items: [item("a", "T3", "running")], selected: "a" });
  const field = screen.getByPlaceholderText("Message omp…");
  fireEvent.change(field, { target: { value: "lost" } });
  fireEvent.keyDown(field, { key: "Enter" });
  const sent = posted[0] as Extract<ToChatHost, { type: "sendMessage" }>;
  host({ type: "messageStatus", id: "a", messageId: sent.messageId, status: "failed", reason: "omp refused" });
  expect(screen.getByText("lost")).not.toBeNull();
  expect(screen.getByText("Not delivered: omp refused.")).not.toBeNull();
});

test("an Ask more conversation that is starting shows its placeholder and no Send until omp is up; Enter does nothing meanwhile", () => {
  const { host, posted } = setup();
  host({ type: "conversations", items: [{ ...item("a", "Ask"), placeholder: "Ask about T3 – Steer…", starting: true }], selected: "a" });
  expect(screen.queryByText("Starting omp…")).not.toBeNull();
  const field = screen.getByPlaceholderText("Ask about T3 – Steer…");
  expect((screen.getByRole("button", { name: "Send" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(field, { target: { value: "hello" } });
  fireEvent.keyDown(field, { key: "Enter" });
  expect(posted).toEqual([]);
  host({ type: "conversations", items: [item("a", "Ask")], selected: "a" });
  expect(screen.queryByText("Starting omp…")).toBeNull();
  expect(screen.getByPlaceholderText("Message omp…")).not.toBeNull();
  expect((screen.getByRole("button", { name: "Send" }) as HTMLButtonElement).disabled).toBe(false);
});

// Opening a call: the widths of the rows are the ones of a layout that happy-dom does not have, so a title is clipped when it is in `clippedTitles`.
const clippedTitles = new Set<string>();
const resizeCallbacks: (() => void)[] = [];
const originalObserver = (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;

beforeEach(() => {
  clippedTitles.clear();
  resizeCallbacks.length = 0;
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", { configurable: true, get: function (this: HTMLElement) { return clippedTitles.has(this.textContent ?? "") ? 300 : 100; } });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 100 });
  (globalThis as unknown as Record<string, unknown>).ResizeObserver = class {
    constructor(callback: () => void) {
      resizeCallbacks.push(callback);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollWidth;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
  (globalThis as unknown as Record<string, unknown>).ResizeObserver = originalObserver;
});

const SECRET_RESULT = "the result of the call";
const callOf = (host: (message: ToChatWebview) => void, toolCallId: string, title: string, extra: Record<string, unknown> = {}, id = "a") =>
  host({ type: "conversationUpdate", id, update: { sessionId: "s", update: { sessionUpdate: "tool_call", toolCallId, title, kind: "execute", status: "in_progress", ...extra } as SessionNotification["update"] } });
const rowOf = (toolCallId: string) => document.querySelector(`[data-tool="${toolCallId}"]`) as HTMLElement;

test("a call whose title is clipped is a button with the chevron, the title as its name and aria-expanded; one that fits is not", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3", "running")], selected: "a" });
  clippedTitles.add("A very long title");
  callOf(host, "long", "A very long title");
  callOf(host, "short", "Short");
  const button = within(rowOf("long")).getByRole("button", { name: "A very long title" });
  expect(button.tagName).toBe("BUTTON");
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(button.className).toContain("focus-visible:ring-2");
  expect(button.firstElementChild?.tagName.toLowerCase()).toBe("svg");
  expect(button.querySelector("span")?.className).toContain("select-text");
  const short = rowOf("short");
  expect(within(short).queryByRole("button")).toBeNull();
  expect(short.querySelector("[aria-expanded], [tabindex], button")).toBeNull();
  expect(short.querySelectorAll("svg")).toHaveLength(2);
});

test("clicking a clipped shell call opens a box with the whole command from its arguments, without the result, and clicking again closes it", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3", "running")], selected: "a" });
  const command = `echo ${"x".repeat(5000)}\nsecond line`;
  clippedTitles.add("echo xxx");
  callOf(host, "sh", "$ echo xxx", { name: "bash", rawInput: { command } });
  host({ type: "conversationUpdate", id: "a", update: { sessionId: "s", update: { sessionUpdate: "tool_call_update", toolCallId: "sh", status: "completed", content: [{ type: "content", content: { type: "text", text: SECRET_RESULT } }], rawOutput: SECRET_RESULT } } });
  const row = rowOf("sh");
  expect(row.querySelector("pre")).toBeNull();
  fireEvent.click(within(row).getByRole("button", { name: "echo xxx" }));
  const box = row.querySelector("pre") as HTMLElement;
  expect(box.textContent).toBe(command);
  expect(box.className).toContain("max-h-60");
  expect(box.className).toContain("overflow-auto");
  expect(box.className).toContain("whitespace-pre-wrap");
  expect(box.className).toContain("bg-background");
  expect(row.textContent).not.toContain(SECRET_RESULT);
  expect(within(row).getByRole("button", { name: "echo xxx" }).getAttribute("aria-expanded")).toBe("true");
  fireEvent.click(within(row).getByRole("button", { name: "echo xxx" }));
  expect(row.querySelector("pre")).toBeNull();
});

test("a call of another kind opens with its whole title, an edit keeps its paths and a failed call its error line under the box", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3", "running")], selected: "a" });
  const title = "Edit the configuration so that every setting is read once";
  clippedTitles.add(title);
  callOf(host, "e", title, { kind: "edit", status: "failed", content: [{ type: "diff", path: "src/a.ts", newText: "NEW TEXT" }] });
  host({ type: "conversationUpdate", id: "a", update: { sessionId: "s", update: { sessionUpdate: "tool_call_update", toolCallId: "e", status: "failed", content: [{ type: "content", content: { type: "text", text: "boom" } }] } } });
  const row = rowOf("e");
  fireEvent.click(within(row).getByRole("button", { name: title }));
  const box = row.querySelector("pre") as HTMLElement;
  expect(box.textContent).toBe(title);
  const order = [...row.children].map((child) => child.tagName.toLowerCase() + ":" + (child.textContent ?? ""));
  expect(order).toEqual([`div:${title}`, `pre:${title}`, "p:src/a.ts", "p:boom"]);
  expect(row.textContent).not.toContain("NEW TEXT");
});

test("a call of eval opens with the cells in order, each with a header in secondary text, and a call with no arguments opens with its title", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3", "running")], selected: "a" });
  callOf(host, "ev", "[py] Load settings\nimport json", {
    name: "eval",
    rawInput: { cells: [{ language: "py", title: "Load settings", code: "import json\nprint(1)" }, { language: "js", code: "console.log(2)" }] },
  });
  const row = rowOf("ev");
  // The text to show opened has more than one line: the row opens without being clipped.
  fireEvent.click(within(row).getByRole("button"));
  const box = row.querySelector("pre") as HTMLElement;
  expect(box.textContent).toBe("[py] Load settings\nimport json\nprint(1)\n\n[js]\nconsole.log(2)");
  const headers = [...box.querySelectorAll("span")];
  expect(headers.map((header) => header.textContent)).toEqual(["[py] Load settings", "[js]"]);
  expect(headers[0]?.className).toContain("text-muted-foreground");
  callOf(host, "ev2", "[py] print(1)", { name: "eval" });
  expect(within(rowOf("ev2")).queryByRole("button")).toBeNull();
});

test("a call opened stays open when its title would fit after a widening, and a row that did not fit becomes a button when the view narrows", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3", "running")], selected: "a" });
  clippedTitles.add("Wide");
  callOf(host, "w", "Wide");
  callOf(host, "n", "Narrow");
  fireEvent.click(within(rowOf("w")).getByRole("button", { name: "Wide" }));
  clippedTitles.delete("Wide");
  clippedTitles.add("Narrow");
  act(() => resizeCallbacks.forEach((callback) => callback()));
  expect(within(rowOf("w")).getByRole("button", { name: "Wide" }).getAttribute("aria-expanded")).toBe("true");
  expect(rowOf("w").querySelector("pre")?.textContent).toBe("Wide");
  expect(within(rowOf("n")).getByRole("button", { name: "Narrow" }).getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(within(rowOf("w")).getByRole("button", { name: "Wide" }));
  expect(within(rowOf("w")).queryByRole("button")).toBeNull();
});

test("a click that ends a text selection inside the row neither opens nor closes it", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3", "running")], selected: "a" });
  clippedTitles.add("Select me please");
  callOf(host, "s", "Select me please");
  const row = rowOf("s");
  const button = within(row).getByRole("button", { name: "Select me please" });
  const selection = window.getSelection() as Selection;
  selection.selectAllChildren(button.querySelector("span") as HTMLElement);
  expect(selection.toString()).toBe("Select me please");
  fireEvent.click(button);
  expect(button.getAttribute("aria-expanded")).toBe("false");
  selection.removeAllRanges();
  fireEvent.click(button);
  expect(button.getAttribute("aria-expanded")).toBe("true");
});

test("several calls are open together, each for itself, per conversation, and a tab switch keeps them", () => {
  const { host, posted } = setup();
  host({ type: "conversations", items: [item("a", "T3", "running"), item("b", "T4", "running")], selected: "a" });
  clippedTitles.add("First long");
  clippedTitles.add("Second long");
  callOf(host, "same", "First long");
  callOf(host, "other", "Second long");
  callOf(host, "same", "First long", {}, "b");
  fireEvent.click(within(rowOf("same")).getByRole("button"));
  fireEvent.click(within(rowOf("other")).getByRole("button"));
  fireEvent.click(screen.getAllByRole("tab")[1] as HTMLElement);
  fireEvent.click(screen.getAllByRole("tab")[0] as HTMLElement);
  const panels = document.querySelectorAll('[role="tabpanel"]');
  expect(panels[0]?.querySelectorAll("pre")).toHaveLength(2);
  expect(panels[1]?.querySelectorAll("pre")).toHaveLength(0);
  // Only the webview knows it: nothing goes to the host.
  expect(posted.every((message) => message.type === "selectConversation")).toBe(true);
});

test("the call of a permission request opens above the buttons, before and after the choice, with the text of the call that omp attaches", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3", "waiting-permission")], selected: "a" });
  clippedTitles.add("rm -rf build");
  const command = "rm -rf build\nrm -rf dist";
  host({ type: "permissionRequest", id: "a", requestId: "p1", toolCall: { toolCallId: "t", title: "$ rm -rf build", kind: "execute", name: "bash", rawInput: { command } }, options: permissionOptions });
  const box = document.querySelector('[data-permission="p1"]') as HTMLElement;
  fireEvent.click(within(box).getByRole("button", { name: "rm -rf build" }));
  const pre = box.querySelector("pre") as HTMLElement;
  expect(pre.textContent).toBe(command);
  expect(pre.compareDocumentPosition(within(box).getByRole("button", { name: "Allow once" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Allow once" }));
  expect(box.querySelector("pre")?.textContent).toBe(command);
  fireEvent.click(within(box).getByRole("button", { name: "rm -rf build" }));
  expect(box.querySelector("pre")).toBeNull();
  fireEvent.click(within(box).getByRole("button", { name: "rm -rf build" }));
  expect(box.querySelector("pre")?.textContent).toBe(command);
});

test("a permission row that fits is not a button", () => {
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3", "waiting-permission")], selected: "a" });
  host({ type: "permissionRequest", id: "a", requestId: "p1", toolCall: { toolCallId: "t", title: "Run ls", kind: "execute" }, options: permissionOptions });
  const box = document.querySelector('[data-permission="p1"]') as HTMLElement;
  expect(within(box).getAllByRole("button").map((button) => button.textContent)).toEqual(["Allow once", "Allow always", "Reject"]);
  expect(box.querySelector("[aria-expanded]")).toBeNull();
});

test("General says a missing omp, or one older than the minimum, in its error line, with Install omp, which asks the host to install it", () => {
  const { host, posted } = setup();
  host({ type: "conversations", items: [{ id: "general", name: "General", state: "idle", general: true }], selected: "general" });
  host({ type: "generalStatus", phase: "stopped", error: { kind: "missing" } });
  expect(within(screen.getByRole("alert")).getByText("omp is not installed. Trama runs every agent with omp.")).not.toBeNull();
  host({ type: "generalStatus", phase: "stopped", error: { kind: "missing", reason: "Trama needs omp 18.12.6 or later; the installed omp is 18.12.5." } });
  const alert = screen.getByRole("alert");
  expect(within(alert).getByText("Trama needs omp 18.12.6 or later; the installed omp is 18.12.5.")).not.toBeNull();
  expect(within(alert).queryByText(/is not installed/)).toBeNull();
  fireEvent.click(within(alert).getByRole("button", { name: "Install omp" }));
  expect(posted).toContainEqual({ type: "installOmp" });
});
