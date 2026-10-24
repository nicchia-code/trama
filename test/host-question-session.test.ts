import { expect, test } from "bun:test";
import { QuestionRoundQueue } from "../src/core/question-rounds";
import { questionAborted, type QuestionRequest } from "../src/core/questions";
import { parseToHost } from "../extension/src/host/messages";
import { QuestionSession, type QuestionRoundView } from "../extension/src/host/question-session";

const request = (id = "q"): QuestionRequest => ({
  questions: [
    { id: `${id}1`, question: "First?", context: "Some **background**", options: [{ label: "A", description: "a" }, { label: "B", description: "b", details: "More" }], recommended: 0, multi: false },
    { id: `${id}2`, question: "Second?", options: [{ label: "C", description: "c" }, { label: "D", description: "d" }], recommended: 1, multi: true },
  ],
});

/** The tabs of this window: the terminal `abc123` is named `Design`. */
const tabName = (terminal: string) => terminal === "abc123" ? "Design" : undefined;

function session() {
  let reveals = 0;
  const seen: (QuestionRoundView | null)[] = [];
  const s = new QuestionSession(() => void reveals++, tabName);
  s.onChange((round) => seen.push(round));
  return { s, seen, reveals: () => reveals };
}

test("a round entering Asking reveals the panel, and the developer's actions deliver only confirmed answers", async () => {
  const { s, seen, reveals } = session();
  const answered = s.present(request(), { signal: new AbortController().signal, prepared: true });
  expect(reveals()).toBe(1);
  const round = s.current();
  expect(round?.name).toBeNull();
  expect(round?.prepared).toBe(true);
  expect(round?.state.drafts[0]).toEqual({ selected: [0], text: "" });
  const id = round?.id as number;

  s.act(id, { type: "setText", text: "because" });
  s.act(id, { type: "next" });
  s.act(id + 1, { type: "skip" }); // another round's action changes nothing
  expect(s.current()?.state.current).toBe(1);
  s.act(id, { type: "skip" });
  s.act(id, { type: "send" });
  expect(await answered).toEqual({ status: "answered", answers: { q1: { status: "answered", selected: ["A"], text: "because" }, q2: { status: "skipped" } } });
  expect(s.current()).toBeNull();
  expect(seen.at(-1)).toBeNull();
});

test("the round names the tab of the terminal or conversation that asked it: a prepared round and a terminal without a tab have no name", () => {
  const signal = new AbortController().signal;
  const named = (context: { prepared?: boolean; terminal?: string }) => {
    const other = session().s;
    void other.present(request(), { signal, ...context });
    const round = other.current();
    return { name: round?.name, prepared: round?.prepared };
  };
  expect(named({ terminal: "abc123" })).toEqual({ name: "Design", prepared: false });
  expect(named({ terminal: "zzz999" })).toEqual({ name: null, prepared: false });
  expect(named({})).toEqual({ name: null, prepared: false });
  expect(named({ prepared: true, terminal: "abc123" })).toEqual({ name: null, prepared: true });
});

test("an incomplete send from the panel is refused and the round stays open", () => {
  const { s } = session();
  void s.present(request(), { signal: new AbortController().signal });
  const id = s.current()?.id as number;
  s.act(id, { type: "openSummary" });
  s.act(id, { type: "send" });
  expect(s.current()?.state.view).toBe("summary");
});

test("when the agent stops waiting the overlay closes without delivering answers", async () => {
  const { s, seen } = session();
  const controller = new AbortController();
  const answered = s.present(request(), { signal: controller.signal });
  s.act(s.current()?.id as number, { type: "next" });
  controller.abort(questionAborted());
  await expect(answered).rejects.toThrow(/stopped waiting/);
  expect(s.current()).toBeNull();
  expect(seen.at(-1)).toBeNull();
});

test("the state survives the panel: a later reader sees the round exactly as it was", () => {
  const { s } = session();
  void s.present(request(), { signal: new AbortController().signal });
  const id = s.current()?.id as number;
  s.act(id, { type: "toggleOption", option: 1 });
  s.act(id, { type: "setText", text: "half typed" });
  s.act(id, { type: "minimize" });
  const later = s.current();
  expect(later?.state.minimized).toBe(true);
  expect(later?.state.drafts[0]).toEqual({ selected: [1], text: "half typed" });
  s.restore();
  expect(s.current()?.state.minimized).toBe(false);
  expect(s.current()?.state.drafts[0]).toEqual({ selected: [1], text: "half typed" });
});

test("closing the panel during the Skip all confirmation brings the overlay back on the question, with nothing skipped", () => {
  const { s } = session();
  void s.present(request(), { signal: new AbortController().signal });
  const id = s.current()?.id as number;
  s.act(id, { type: "setText", text: "half typed" });
  s.act(id, { type: "closeQuestions" });
  expect(s.current()?.state.confirming).toBe("question");
  s.panelClosed();
  s.restore();
  expect(s.current()?.state).toMatchObject({ confirming: null, view: "question", current: 0, minimized: false });
  expect(s.current()?.state.drafts[0]?.text).toBe("half typed");
});

test("restoring without a round changes nothing", () => {
  const { s, seen } = session();
  s.restore();
  expect(s.current()).toBeNull();
  expect(seen).toEqual([]);
});

test("the queue presents the next round in the panel once the first is delivered", async () => {
  const { s, reveals } = session();
  const queue = new QuestionRoundQueue(s.present);
  const first = queue.ask(request("a"), {});
  const second = queue.ask(request("b"), {});
  expect(s.current()?.state.questions[0]?.id).toBe("a1");
  const firstId = s.current()?.id as number;
  s.act(firstId, { type: "closeQuestions" });
  s.act(firstId, { type: "confirmSkipAll" });
  expect(await first).toEqual({ status: "answered", answers: { a1: { status: "skipped" }, a2: { status: "skipped" } } });
  await Promise.resolve();
  expect(s.current()?.state.questions[0]?.id).toBe("b1");
  expect(reveals()).toBe(2);
  queue.dispose();
  await expect(second).rejects.toThrow(/editor was lost/);
});

test("the panel's question actions are checked as untrusted input", () => {
  expect(parseToHost({ type: "questionAction", round: 3, action: { type: "toggleOption", option: 1 } })).toEqual({ ok: true, message: { type: "questionAction", round: 3, action: { type: "toggleOption", option: 1 } } });
  expect(parseToHost({ type: "questionAction", round: 3, action: { type: "setText", text: "hi" } })).toEqual({ ok: true, message: { type: "questionAction", round: 3, action: { type: "setText", text: "hi" } } });
  expect(parseToHost({ type: "questionAction", round: 3, action: { type: "send" } })).toEqual({ ok: true, message: { type: "questionAction", round: 3, action: { type: "send" } } });
  expect(parseToHost({ type: "questionAction", round: 3, action: { type: "pressKey", option: 1 } })).toEqual({ ok: true, message: { type: "questionAction", round: 3, action: { type: "pressKey", option: 1 } } });
  expect(parseToHost({ type: "questionAction", round: 3, action: { type: "pressKey", option: "1" } }).ok).toBe(false);
  expect(parseToHost({ type: "questionAction", round: "3", action: { type: "send" } }).ok).toBe(false);
  expect(parseToHost({ type: "questionAction", round: 3, action: { type: "toggleOption", option: "1" } }).ok).toBe(false);
  expect(parseToHost({ type: "questionAction", round: 3, action: { type: "explode" } }).ok).toBe(false);
});

test("a round of another project stays out of sight and comes back with its answers", async () => {
  const { s, reveals } = session();
  s.setProject("a");
  const answered = s.presentFor("a")(request(), { signal: new AbortController().signal });
  expect(reveals()).toBe(1);
  const id = s.current()?.id as number;
  s.act(id, { type: "setText", text: "kept" });

  s.setProject("b");
  expect(s.current()).toBeNull();
  s.act(id, { type: "skip" }); // nothing reaches the round while it is out of sight

  s.setProject("a");
  expect(reveals()).toBe(2);
  expect(s.current()?.state.drafts[0]).toEqual({ selected: [0], text: "kept" });
  s.act(id, { type: "next" });
  s.act(id, { type: "skip" });
  s.act(id, { type: "send" });
  expect(await answered).toEqual({ status: "answered", answers: { q1: { status: "answered", selected: ["A"], text: "kept" }, q2: { status: "skipped" } } });
  expect(s.current()).toBeNull();
});
