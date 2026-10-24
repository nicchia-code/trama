import { describe, expect, test } from "bun:test";
import { holdersToAsk, unfollowedAnnouncements, unfollowedTasks } from "../src/core/task-holders";

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
    const holders = [...facts().tasks.map((task) => task.holder), "term1", null];
    expect(holdersToAsk(holders, (h) => h === "term2")).toEqual(["term1"]);
  });
});

describe("unfollowedAnnouncements", () => {
  const announcements = [
    { id: "x", terminal: "term1" },
    { id: "y", terminal: "term2" },
    { id: "z", terminal: null },
  ];
  const withFacts = (over: Partial<Parameters<typeof unfollowedAnnouncements>[0]> = {}) => ({ ...facts(), announcements, ...over });

  test("withdraws the ghosts of holders nobody follows and the ones of no terminal", () => {
    expect(unfollowedAnnouncements(withFacts())).toEqual(["x", "y", "z"]);
  });
  test("a window following the terminal, here or elsewhere, keeps its ghost; one of no terminal has nobody to follow it", () => {
    expect(unfollowedAnnouncements(withFacts({ followedHere: (h) => h === "term1" }))).toEqual(["y", "z"]);
    expect(unfollowedAnnouncements(withFacts({ followedElsewhere: new Set(["term1", "term2"]), terminalProcessAlive: () => true }))).toEqual(["z"]);
  });
  test("a terminal whose agent process is alive keeps its ghost", () => {
    expect(unfollowedAnnouncements(withFacts({ terminalProcessAlive: (t) => t === "term2" }))).toEqual(["x", "z"]);
  });
});
