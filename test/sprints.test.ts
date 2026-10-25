import { describe, expect, test } from "bun:test";
import type { GitHubIteration } from "../src/core/github";
import { absenceDaysIn, capacityIn, isWorkingDay, lacksSprints, lastDayOf, loadIn, type OpenLoad, sprintsShown, workingDaysOf } from "../src/core/sprints";

const sprint = (n: number, startDate: string, duration = 7): GitHubIteration => ({ id: `I${n}`, title: `Sprint ${n}`, startDate, duration });
// Weekly sprints from Monday 2026-10-19: 12 is 19–25 Oct, 13 is 26 Oct–1 Nov, … 16 is 16–22 Nov.
const SPRINTS = [sprint(12, "2026-10-19"), sprint(13, "2026-10-26"), sprint(14, "2026-11-02"), sprint(15, "2026-11-09"), sprint(16, "2026-11-16")];

describe("working days", () => {
  test("Monday to Friday are working days, Saturday and Sunday are not", () => {
    expect(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"].every(isWorkingDay)).toBe(true);
    expect(isWorkingDay("2026-10-31")).toBe(false);
    expect(isWorkingDay("2026-11-01")).toBe(false);
  });

  test("a weekly sprint has the five days of its week, a two-week one ten, and the weekend days of its dates do not count", () => {
    expect(workingDaysOf(sprint(13, "2026-10-26"))).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"]);
    expect(workingDaysOf(sprint(13, "2026-10-26", 14))).toHaveLength(10);
    expect(workingDaysOf(sprint(13, "2026-10-31", 2))).toEqual([]);
  });

  test("the last day of a sprint is its start plus its duration minus one", () => {
    expect(lastDayOf(sprint(13, "2026-10-26"))).toBe("2026-11-01");
    expect(lastDayOf(sprint(13, "2026-10-26", 14))).toBe("2026-11-08");
  });
});

describe("capacity of a person in a sprint", () => {
  const week = sprint(15, "2026-11-09");

  test("without absences it is the capacity per sprint", () => {
    expect(capacityIn({ capacity: 5, absences: [] }, week)).toBe(5);
    expect(capacityIn({ capacity: 4.5, absences: [] }, week)).toBe(4.5);
  });

  test("the working days of the absences are taken away: three of five days off leave two fifths of the capacity", () => {
    expect(capacityIn({ capacity: 5, absences: [{ from: "2026-11-10", to: "2026-11-12" }] }, week)).toBe(2);
    expect(capacityIn({ capacity: 4, absences: [{ from: "2026-11-12", to: "2026-11-12" }] }, week)).toBe(3);
  });

  test("it is rounded to half a day", () => {
    expect(capacityIn({ capacity: 3, absences: [{ from: "2026-11-09", to: "2026-11-09" }] }, week)).toBe(2.5);
    expect(capacityIn({ capacity: 4, absences: [{ from: "2026-11-09", to: "2026-11-09" }, { from: "2026-11-13", to: "2026-11-13" }] }, week)).toBe(2.5);
  });

  test("a weekend, a day outside the sprint and an absence in another sprint take nothing; a whole week off leaves nothing", () => {
    expect(capacityIn({ capacity: 5, absences: [{ from: "2026-11-14", to: "2026-11-15" }] }, week)).toBe(5);
    expect(capacityIn({ capacity: 5, absences: [{ from: "2026-11-16", to: "2026-11-20" }] }, week)).toBe(5);
    expect(capacityIn({ capacity: 5, absences: [{ from: "2026-11-02", to: "2026-11-30" }] }, week)).toBe(0);
  });

  test("an absence takes as many days of a sprint as it covers of its working days, across the end of the sprint too", () => {
    expect(absenceDaysIn({ from: "2026-11-10", to: "2026-11-12" }, week)).toBe(3);
    expect(absenceDaysIn({ from: "2026-11-12", to: "2026-11-20" }, week)).toBe(2);
    expect(absenceDaysIn({ from: "2026-11-14", to: "2026-11-15" }, week)).toBe(0);
  });
});

describe("load of a person in a sprint", () => {
  const loads: OpenLoad[] = [
    { assignee: "Giulia", sprint: "Sprint 13", estimate: 4 },
    { assignee: "giulia", sprint: "Sprint 13", estimate: 2 },
    { assignee: "giulia", sprint: "Sprint 13", estimate: null },
    { assignee: "giulia", sprint: "Sprint 14", estimate: 3 },
    { assignee: "marco", sprint: "Sprint 13", estimate: 1 },
  ];

  test("it adds up the estimates of the person's items in the sprint, matching the handle without case, and counts the items without estimate", () => {
    expect(loadIn(loads, "giulia", "Sprint 13")).toEqual({ days: 6, unestimated: 1 });
    expect(loadIn(loads, "GIULIA", "Sprint 14")).toEqual({ days: 3, unestimated: 0 });
  });

  test("nobody, or a sprint without items, has nothing", () => {
    expect(loadIn(loads, "sara", "Sprint 13")).toEqual({ days: 0, unestimated: 0 });
    expect(loadIn(loads, "marco", "Sprint 15")).toEqual({ days: 0, unestimated: 0 });
  });
});

describe("the sprints the Timeline shows", () => {
  const titles = (iterations: GitHubIteration[]) => iterations.map((iteration) => iteration.title);
  const TODAY = "2026-10-27"; // inside Sprint 13

  test("without an open published issue it starts from the current sprint and goes to the last iteration", () => {
    expect(titles(sprintsShown(SPRINTS, new Set(), TODAY))).toEqual(["Sprint 13", "Sprint 14", "Sprint 15", "Sprint 16"]);
  });

  test("it starts from the earliest sprint, current or past, that holds an open published issue", () => {
    expect(titles(sprintsShown(SPRINTS, new Set(["Sprint 12", "Sprint 14"]), TODAY))).toEqual(["Sprint 12", "Sprint 13", "Sprint 14", "Sprint 15", "Sprint 16"]);
    expect(titles(sprintsShown(SPRINTS, new Set(["Sprint 13"]), TODAY))[0]).toBe("Sprint 13");
  });

  test("an open issue in a sprint that has not started does not move the start before the current sprint", () => {
    expect(titles(sprintsShown(SPRINTS, new Set(["Sprint 15"]), TODAY))[0]).toBe("Sprint 13");
  });

  test("between two sprints it starts from the next one; when every sprint is over, from the last", () => {
    const gap = [sprint(1, "2026-10-05"), sprint(2, "2026-11-02")];
    expect(titles(sprintsShown(gap, new Set(), "2026-10-27"))).toEqual(["Sprint 2"]);
    expect(titles(sprintsShown(SPRINTS, new Set(), "2027-01-04"))).toEqual(["Sprint 16"]);
  });

  test("a Project without iterations shows no sprint", () => {
    expect(sprintsShown([], new Set(["Sprint 1"]), TODAY)).toEqual([]);
  });
});

describe("a Project that lacks sprints", () => {
  test("its last iteration ends less than three weeks after today", () => {
    expect(lacksSprints(SPRINTS, "2026-11-10")?.last?.title).toBe("Sprint 16");
    // Sprint 16 ends on 22 Nov: from 2 Nov on that is less than three weeks away.
    expect(lacksSprints(SPRINTS, "2026-11-02")?.last?.title).toBe("Sprint 16");
  });

  test("it has enough sprints when the last one ends three weeks after today or later", () => {
    expect(lacksSprints(SPRINTS, "2026-10-27")).toBeUndefined();
    expect(lacksSprints(SPRINTS, "2026-11-01")).toBeUndefined();
  });

  test("with no iteration at all it lacks sprints and has none to name", () => {
    expect(lacksSprints([], "2026-10-27")).toEqual({ last: null });
  });
});
