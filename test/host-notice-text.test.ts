import { expect, test } from "bun:test";
import { composeNotice, MAX_MESSAGE_BYTES } from "../extension/src/host/notice-text";

const bytes = (text: string) => new TextEncoder().encode(text).length;

test("a question notice shows the project, the position, the question and the option labels only", () => {
  expect(composeNotice({ kind: "question", project: "shop", step: 2, total: 3, question: "Which database?", options: ["SQLite", "Postgres"] })).toEqual({
    title: "Trama: the agent asks",
    message: "shop\nQuestion 2 of 3: Which database?\n- SQLite\n- Postgres",
    priority: 4,
    tags: ["question"],
  });
});

test("an end notice says how the command ended and counts the Board", () => {
  const board = { project: "shop", toDecide: 2, todo: 5, inProgress: 1 };
  expect(composeNotice({ kind: "end", outcome: { kind: "finished" }, ...board })).toEqual({
    title: "Trama: the agent stopped",
    message: "shop\nThe agent finished.\nTo decide: 2\nTo do: 5\nIn progress: 1",
    priority: 3,
    tags: ["white_check_mark"],
  });
  const failed = composeNotice({ kind: "end", outcome: { kind: "failed", exitCode: 130 }, ...board });
  expect(failed.message.split("\n")[1]).toBe("The agent failed (exit code 130).");
  expect([failed.priority, failed.tags]).toEqual([4, ["warning"]]);
  const unreported = composeNotice({ kind: "end", outcome: { kind: "unreported" }, ...board });
  expect(unreported.message.split("\n")[1]).toBe("The agent command ended.");
  expect([unreported.priority, unreported.tags]).toEqual([3, ["white_check_mark"]]);
});

test("titles are ASCII, since they travel in an HTTP header", () => {
  const question = composeNotice({ kind: "question", project: "città", step: 1, total: 1, question: "è?", options: ["sì", "no"] });
  const end = composeNotice({ kind: "end", outcome: { kind: "finished" }, project: "città", toDecide: 0, todo: 0, inProgress: 0 });
  for (const { title } of [question, end]) expect(/^[\x20-\x7e]*$/.test(title)).toBe(true);
});

test("a long message is cut at a character boundary within 4000 bytes, ends with an ellipsis and loses the last options first", () => {
  const options = Array.from({ length: 400 }, (_, i) => `è${i} ${"ü".repeat(10)}`);
  const { message } = composeNotice({ kind: "question", project: "shop", step: 1, total: 2, question: "Which?", options });
  expect(bytes(message)).toBeLessThanOrEqual(MAX_MESSAGE_BYTES);
  expect(message.endsWith("…")).toBe(true);
  expect(message.startsWith("shop\nQuestion 1 of 2: Which?\n- è0 ")).toBe(true);
  expect(message).not.toContain("�");
  expect(message).not.toContain("- è399");
});

test("a message that fits is left alone, and one with a 4-byte character is not split inside it", () => {
  const exact = "x".repeat(MAX_MESSAGE_BYTES - "p\nQuestion 1 of 1: ".length);
  const fits = composeNotice({ kind: "question", project: "p", step: 1, total: 1, question: exact, options: [] });
  expect(fits.message.endsWith("…")).toBe(false);
  const emoji = composeNotice({ kind: "question", project: "p", step: 1, total: 1, question: "😀".repeat(2000), options: [] });
  expect(bytes(emoji.message)).toBeLessThanOrEqual(MAX_MESSAGE_BYTES);
  expect(emoji.message).not.toContain("�");
});

test("an end notice from Cursor's chat says whether the turn ended normally or was interrupted", () => {
  const board = { project: "shop", toDecide: 0, todo: 1, inProgress: 0 };
  const stopped = composeNotice({ kind: "end", outcome: { kind: "chat-stopped" }, ...board });
  expect(stopped.message).toBe("shop\nThe agent stopped and may be waiting for you.\nTo decide: 0\nTo do: 1\nIn progress: 0");
  expect([stopped.title, stopped.priority, stopped.tags]).toEqual(["Trama: the agent stopped", 3, ["white_check_mark"]]);
  const interrupted = composeNotice({ kind: "end", outcome: { kind: "chat-interrupted" }, ...board });
  expect(interrupted.message.split("\n")[1]).toBe("The agent was interrupted or failed.");
  expect([interrupted.priority, interrupted.tags]).toEqual([4, ["warning"]]);
});
