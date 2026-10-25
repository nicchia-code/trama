import { expect, test } from "bun:test";
import {
  addDays,
  addRepository,
  checkPerson,
  dropOldAbsences,
  firstInvalid,
  handleTaken,
  initials,
  isDate,
  localDate,
  membersOf,
  nextAbsence,
  othersOf,
  PERSON_MESSAGES,
  type Person,
  type PersonInput,
  personSchema,
  personView,
  readTeam,
  removeRepository,
  upcomingAbsences,
} from "../src/core/people";

const person = (patch: Partial<Person> = {}): Person => ({
  id: "ab12cd34",
  name: "Ada Lovelace",
  handle: "ada",
  level: "senior",
  skills: ["TypeScript", "Review"],
  capacity: 4.5,
  absences: [],
  repositories: ["acme/shop"],
  ...patch,
});

const input = (patch: Partial<PersonInput> = {}): PersonInput => ({ name: "Ada Lovelace", handle: "ada", level: "mid", skills: [], capacity: 5, absences: [], ...patch });

test("the dates are real calendar dates written YYYY-MM-DD", () => {
  expect(isDate("2026-02-28")).toBe(true);
  expect(isDate("2024-02-29")).toBe(true);
  expect(isDate("2026-02-29")).toBe(false);
  expect(isDate("2026-2-3")).toBe(false);
  expect(isDate("")).toBe(false);
});

test("today is the local date, and days move across months and years", () => {
  expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
});

test("the next absence is the first one that ends today or later, whatever the order of the list", () => {
  const absences = [
    { from: "2026-11-10", to: "2026-11-12" },
    { from: "2026-10-01", to: "2026-10-02" },
    { from: "2026-10-25", to: "2026-10-25" },
  ];
  expect(nextAbsence(absences, "2026-10-25")).toEqual({ from: "2026-10-25", to: "2026-10-25" });
  expect(nextAbsence(absences, "2026-10-26")).toEqual({ from: "2026-11-10", to: "2026-11-12" });
  expect(nextAbsence(absences, "2026-11-13")).toBeNull();
  expect(upcomingAbsences(absences, "2026-10-26")).toEqual([{ from: "2026-11-10", to: "2026-11-12" }]);
});

test("absences that ended more than 90 days ago are dropped, the ones that ended exactly 90 days ago stay", () => {
  const today = "2026-10-25";
  const edge = addDays(today, -90);
  const old = addDays(today, -91);
  expect(dropOldAbsences([{ from: old, to: old }, { from: edge, to: edge }], today)).toEqual([{ from: edge, to: edge }]);
});

test("the initials are the first letters of the first two words, upper case", () => {
  expect(initials("ada lovelace")).toBe("AL");
  expect(initials("  Grace  Brewster Murray Hopper ")).toBe("GB");
  expect(initials("Linus")).toBe("L");
  expect(initials("émile zola")).toBe("ÉZ");
});

test("a person is checked field by field with the messages of rules#person, and nothing is cleaned when something is wrong", () => {
  const bad = checkPerson(input({ name: "  ", handle: "a b", capacity: 0.3, skills: Array.from({ length: 21 }, (_, i) => `s${i}`), absences: [{ from: "2026-05-02", to: "2026-05-01" }, { from: "", to: "2026-05-01" }] }), [], "2026-10-25");
  expect(bad.ok).toBe(false);
  if (bad.ok) return;
  expect(bad.errors.name).toBe(PERSON_MESSAGES.name);
  expect(bad.errors.handle).toBe("A GitHub handle can't contain spaces.");
  expect(bad.errors.capacity).toBe("Enter 0.5 to 5 days, in steps of 0.5.");
  expect(bad.errors.skills).toBe("At most 20 skills.");
  expect(bad.errors.absences).toEqual({ message: "The end of an absence can't be before its start.", rows: [0, 1] });
  expect(firstInvalid(bad.errors)).toBe("name");
});

test("a missing date of an absence is told as such, and a handle of another shape gets the generic message", () => {
  const missing = checkPerson(input({ absences: [{ from: "2026-05-01", to: "" }] }), [], "2026-10-25");
  expect(missing.ok ? null : missing.errors.absences?.message).toBe("Enter both dates.");
  for (const handle of ["-ada", "ada-", "a--b", "a_b", "x".repeat(40), "@", ""]) {
    const result = checkPerson(input({ handle }), [], "2026-10-25");
    expect(result.ok ? null : result.errors.handle).toBe(PERSON_MESSAGES.handle);
  }
});

test("the capacity goes from 0.5 to 5 in steps of 0.5", () => {
  for (const capacity of [0.5, 1, 4.5, 5]) expect(checkPerson(input({ capacity }), [], "2026-10-25").ok).toBe(true);
  for (const capacity of [0, 0.25, 5.5, 6, -1, Number.NaN]) expect(checkPerson(input({ capacity }), [], "2026-10-25").ok).toBe(false);
});

test("a skill of more than 30 characters is refused; doubles without case add nothing", () => {
  const long = checkPerson(input({ skills: ["x".repeat(31)] }), [], "2026-10-25");
  expect(long.ok ? null : long.errors.skills).toBe(PERSON_MESSAGES.skill);
  const ok = checkPerson(input({ skills: [" Go ", "go", "GO", "Rust", ""] }), [], "2026-10-25");
  expect(ok.ok && ok.person.skills).toEqual(["Go", "Rust"]);
});

test("a valid person is cleaned: spaces and the leading @ go, the absences are sorted and the old ones fall", () => {
  const today = "2026-10-25";
  const old = addDays(today, -200);
  const result = checkPerson(
    input({ name: "  Ada Lovelace  ", handle: " @Ada-L ", absences: [{ from: "2026-12-01", to: "2026-12-02" }, { from: old, to: old }, { from: "2026-11-01", to: "2026-11-03" }] }),
    [],
    today,
  );
  expect(result).toEqual({
    ok: true,
    person: { name: "Ada Lovelace", handle: "Ada-L", level: "mid", skills: [], capacity: 5, absences: [{ from: "2026-11-01", to: "2026-11-03" }, { from: "2026-12-01", to: "2026-12-02" }] },
  });
});

test("more than 50 absences are refused", () => {
  const absences = Array.from({ length: 51 }, (_, i) => ({ from: addDays("2027-01-01", i), to: addDays("2027-01-01", i) }));
  const result = checkPerson(input({ absences }), [], "2026-10-25");
  expect(result.ok ? null : result.errors.absences?.message).toBe("At most 50 absences.");
});

test("two people never share a handle, compared without case, but a person keeps their own", () => {
  const others = [{ id: "ab12cd34", handle: "Ada" }];
  const taken = checkPerson(input({ handle: "@ADA" }), others, "2026-10-25");
  expect(taken.ok ? null : taken.errors.handle).toBe(handleTaken("ADA"));
  expect(handleTaken("ADA")).toBe("@ADA is already in your list: add them from other projects.");
  expect(checkPerson(input({ id: "ab12cd34", handle: "ada" }), others, "2026-10-25").ok).toBe(true);
});

test("a level outside junior, mid and senior is refused", () => {
  const result = checkPerson({ ...input(), level: "lead" as never }, [], "2026-10-25");
  expect(result.ok ? null : result.errors.level).toBe(PERSON_MESSAGES.level);
});

test("the stored value: absent is an empty team, a version other than 1 is not read, and a person that does not fit is counted and kept", () => {
  expect(readTeam(undefined)).toEqual({ readable: true, stored: { version: 1, people: [] }, people: [], invalid: 0 });
  expect(readTeam({ version: 2, people: [] })).toEqual({ readable: false });
  expect(readTeam("nonsense")).toEqual({ readable: false });
  expect(readTeam({ version: 1 })).toEqual({ readable: false });
  const broken = { id: "xx", name: "" };
  const read = readTeam({ version: 1, people: [person(), broken] });
  expect(read.readable && read.people).toEqual([person()]);
  expect(read.readable && read.invalid).toBe(1);
  expect(read.readable && read.stored.people).toEqual([person(), broken]);
});

test("a stored person must match the shape and the rules exactly", () => {
  expect(personSchema.safeParse(person()).success).toBe(true);
  expect(personSchema.safeParse(person({ id: "AB12CD34" })).success).toBe(false);
  expect(personSchema.safeParse(person({ handle: "@ada" })).success).toBe(false);
  expect(personSchema.safeParse(person({ name: " Ada" })).success).toBe(false);
  expect(personSchema.safeParse(person({ capacity: 5.5 })).success).toBe(false);
  expect(personSchema.safeParse(person({ skills: ["Go", "go"] })).success).toBe(false);
  expect(personSchema.safeParse(person({ repositories: ["Acme/Shop"] })).success).toBe(false);
  expect(personSchema.safeParse(person({ repositories: ["acme/shop", "acme/shop"] })).success).toBe(false);
  expect(personSchema.safeParse(person({ absences: [{ from: "2026-02-03", to: "2026-02-01" }] })).success).toBe(false);
  expect(personSchema.safeParse(person({ absences: [{ from: "2026-05-01", to: "2026-05-02" }, { from: "2026-04-01", to: "2026-04-02" }] })).success).toBe(false);
  expect(personSchema.safeParse({ ...person(), extra: 1 }).success).toBe(false);
});

test("the teams: members and others by name, and a person with no project is offered everywhere", () => {
  const people = [person({ id: "00000003", name: "zed", handle: "zed" }), person({ id: "00000001", name: "Bea", handle: "bea", repositories: [] }), person({ id: "00000002", name: "ada", handle: "ada2", repositories: ["acme/other"] }), person({ id: "00000004", name: "Cy", handle: "cy", repositories: ["acme/shop", "acme/other"] })];
  expect(membersOf(people, "acme/shop").map((p) => p.name)).toEqual(["Cy", "zed"]);
  expect(othersOf(people, "acme/shop").map((p) => p.name)).toEqual(["ada", "Bea"]);
  expect(othersOf(people, "acme/new").map((p) => p.name)).toEqual(["ada", "Bea", "Cy", "zed"]);
});

test("a person is put in and taken out of a team without being changed, and never twice", () => {
  const p = person();
  expect(addRepository(p, "acme/shop")).toBe(p);
  expect(addRepository(p, "acme/other").repositories).toEqual(["acme/shop", "acme/other"]);
  expect(removeRepository(p, "acme/shop").repositories).toEqual([]);
  expect(p.repositories).toEqual(["acme/shop"]);
});

test("the view of a person carries the initials and the next absence", () => {
  const view = personView(person({ absences: [{ from: "2026-11-10", to: "2026-11-12" }] }), "2026-10-25");
  expect(view.initials).toBe("AL");
  expect(view.nextAbsence).toEqual({ from: "2026-11-10", to: "2026-11-12" });
});
