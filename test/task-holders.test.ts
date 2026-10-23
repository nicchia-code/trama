import { describe, expect, test } from "bun:test";
import { holdersToAsk, unfollowedTasks } from "../src/core/task-holders";

const facts = (over: Partial<Parameters<typeof unfollowedTasks>[0]> = {}) => ({
  tasks: [
    { id: "a", holder: "term1" },
    { id: "b", holder: "term2" },
    { id: "d", holder: null },
  ],
  followedHere: () => false,
  followedElsewhere: new Set<string>(),
  terminalProcessAlive: () => false,
  ...over,
});

describe("unfollowedTasks", () => {
  test("releases terminal Tasks nobody follows, never unknown holders", () => {
    expect(unfollowedTasks(facts())).toEqual(["a", "b"]);
  });
  test("a window following the holder, here or elsewhere, keeps the Task", () => {
    expect(unfollowedTasks(facts({ followedHere: (h) => h === "term1" }))).toEqual(["b"]);
    expect(unfollowedTasks(facts({ followedElsewhere: new Set(["term1", "term2"]) }))).toEqual([]);
  });
  test("a terminal whose agent process is alive keeps its Task", () => {
    expect(unfollowedTasks(facts({ terminalProcessAlive: (t) => t === "term2" }))).toEqual(["a"]);
  });
  test("holdersToAsk lists the distinct known holders this window does not follow", () => {
    const tasks = [...facts().tasks, { id: "e", holder: "term1" }];
    expect(holdersToAsk(tasks, (h) => h === "term2")).toEqual(["term1"]);
  });
});
