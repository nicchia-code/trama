import { describe, expect, test } from "bun:test";
import { chatViewState, ompChatVisible, tabAfterClose, tabKeyAction } from "../src/core/omp-chat-view";

describe("the state of the omp Chat view", () => {
  test("Hidden without omp Chat in use and without conversations", () => {
    expect(chatViewState({ inUse: false, conversations: 0 })).toBe("hidden");
    expect(ompChatVisible({ inUse: false, conversations: 0 })).toBe(false);
  });

  test("Empty when omp Chat is in use and no conversation is open", () => {
    expect(chatViewState({ inUse: true, conversations: 0 })).toBe("empty");
    expect(ompChatVisible({ inUse: true, conversations: 0 })).toBe(true);
  });

  test("With conversations whenever one is open or waiting to resume, in use or not", () => {
    expect(chatViewState({ inUse: true, conversations: 2 })).toBe("with-conversations");
    expect(chatViewState({ inUse: false, conversations: 1 })).toBe("with-conversations");
    expect(ompChatVisible({ inUse: false, conversations: 1 })).toBe(true);
  });
});

describe("the context key", () => {
  test("is a boolean: true while the view is there, false in Hidden", () => {
    expect(ompChatVisible({ inUse: true, conversations: 0 })).toBe(true);
    expect(ompChatVisible({ inUse: false, conversations: 2 })).toBe(true);
    expect(ompChatVisible({ inUse: false, conversations: 0 })).toBe(false);
  });
});

describe("the tab shown after a close", () => {
  const order = ["a", "b", "c"];

  test("the tab in view stays when another one closes", () => {
    expect(tabAfterClose(order, "a", "c")).toBe("c");
  });

  test("closing the tab in view moves to the one that took its place", () => {
    expect(tabAfterClose(order, "b", "b")).toBe("c");
    expect(tabAfterClose(order, "a", "a")).toBe("b");
  });

  test("closing the last tab in view moves to the previous one", () => {
    expect(tabAfterClose(order, "c", "c")).toBe("b");
  });

  test("closing the only tab leaves none", () => {
    expect(tabAfterClose(["a"], "a", "a")).toBeUndefined();
  });

  test("with no tab in view the neighbour of the closed one is shown", () => {
    expect(tabAfterClose(order, "b", undefined)).toBe("c");
  });
});

describe("keys on a tab", () => {
  const order = ["a", "b", "c"];

  test("the arrows move to the neighbour and wrap round the ends", () => {
    expect(tabKeyAction("ArrowRight", order, "a")).toEqual({ select: "b" });
    expect(tabKeyAction("ArrowRight", order, "c")).toEqual({ select: "a" });
    expect(tabKeyAction("ArrowLeft", order, "a")).toEqual({ select: "c" });
    expect(tabKeyAction("ArrowLeft", order, "c")).toEqual({ select: "b" });
  });

  test("Home and End go to the ends", () => {
    expect(tabKeyAction("Home", order, "b")).toEqual({ select: "a" });
    expect(tabKeyAction("End", order, "b")).toEqual({ select: "c" });
  });

  test("Delete closes the tab", () => {
    expect(tabKeyAction("Delete", order, "b")).toEqual({ close: "b" });
  });

  test("other keys, and a tab that is not there, do nothing", () => {
    expect(tabKeyAction("Enter", order, "b")).toBeUndefined();
    expect(tabKeyAction("ArrowRight", order, "z")).toBeUndefined();
    expect(tabKeyAction("ArrowRight", [], "a")).toBeUndefined();
  });
});
