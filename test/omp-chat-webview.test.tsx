import { afterEach, expect, test } from "bun:test";
import type { SessionNotification } from "@agentclientprotocol/sdk";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ConversationItem, ToChatHost, ToChatWebview } from "../extension/src/omp-chat-protocol";
import { ChatApp, createChatController } from "../extension/src/webview/omp-chat/app";
import { fieldsOf } from "../extension/src/webview/omp-chat/forms";
import { createChatStore } from "../extension/src/webview/omp-chat/state";
import { announcement, applyUpdate, cutLines, emptyTranscript, MAX_OUTPUT_LINES, start } from "../extension/src/webview/omp-chat/transcript";

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

test("the agent's streamed text builds one Markdown message, and a tool call is a compact row that opens its result", () => {
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
  host({
    type: "conversationUpdate",
    id: "a",
    update: { sessionId: "s", update: { sessionUpdate: "tool_call_update", toolCallId: "t1", status: "completed", content: [{ type: "content", content: { type: "text", text: "3 passed" } }] } },
  });
  expect(screen.queryByText("3 passed")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Run tests/ }));
  expect(screen.getByText("3 passed")).not.toBeNull();
});

test("a tool output is cut after 200 lines with the number of lines left", () => {
  const output = Array.from({ length: MAX_OUTPUT_LINES + 7 }, (_, at) => `line ${at}`).join("\n");
  expect(cutLines(output)).toMatchObject({ more: 7 });
  expect(cutLines("a\nb").more).toBe(0);
  const { host } = setup();
  host({ type: "conversations", items: [item("a", "T3")], selected: "a" });
  host({ type: "conversationUpdate", id: "a", update: { sessionId: "s", update: { sessionUpdate: "tool_call", toolCallId: "t", title: "Read", kind: "read", status: "completed", rawOutput: output } } });
  fireEvent.click(screen.getByRole("button", { name: /Read/ }));
  expect(document.body.textContent).toContain("… 7 more lines");
});

test("an edit shows only the file, which opens in the editor", () => {
  const { host, posted } = setup();
  host({ type: "conversations", items: [item("a", "T3")], selected: "a" });
  host({
    type: "conversationUpdate",
    id: "a",
    update: {
      sessionId: "s",
      update: { sessionUpdate: "tool_call", toolCallId: "t", title: "Edit", kind: "edit", status: "completed", content: [{ type: "diff", path: "src/a.ts", newText: "x" }] },
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "src/a.ts" }));
  expect(posted).toEqual([{ type: "openFile", path: "src/a.ts" }]);
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
  expect(posted).toEqual([{ type: "sendMessage", id: "a", text: "hello" }]);
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
