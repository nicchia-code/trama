import { expect, test } from "bun:test";
import { type MemoryPeopleStore, memoryPeopleStore, People, saveFailure, TEAM_KEY } from "../extension/src/host/team/people";

const ADA = { name: "Ada Lovelace", handle: "@Ada", level: "senior" as const, skills: ["Rust", "rust", " Go "], capacity: 4.5, absences: [{ from: "2026-11-12", to: "2026-11-10" }] };
const GRACE = { name: "Grace Hopper", handle: "grace", level: "mid" as const, skills: [], capacity: 5, absences: [] };
const TODAY = "2026-10-25";

function setup(initial?: unknown) {
  const store = memoryPeopleStore(initial);
  const draws = ["aaaaaaa1", "aaaaaaa1", "bbbbbbb2", "ccccccc3"];
  return { store, people: new People(store, () => TODAY, () => draws.shift() ?? "zzzzzzzz") };
}

/** The people the store holds, as written. */
const written = (store: MemoryPeopleStore) => store.values.get(TEAM_KEY);

test("nothing stored is an empty team, and reading never writes", () => {
  const { people, store } = setup();
  expect(people.view("acme/web")).toEqual({ type: "team", members: [], others: [], unreadable: 0, error: null });
  expect(people.members("acme/web")).toEqual({ members: [] });
  expect(store.values.size).toBe(0);
});

test("a new person starts in the team of the project, cleaned, with their identity drawn free", async () => {
  const { people, store } = setup();
  expect(await people.save("acme/web", { ...ADA, absences: [{ from: "2026-11-10", to: "2026-11-12" }] })).toEqual({ ok: true });
  expect(written(store)).toEqual({
    version: 1,
    people: [{ id: "aaaaaaa1", name: "Ada Lovelace", handle: "Ada", level: "senior", skills: ["Rust", "Go"], capacity: 4.5, absences: [{ from: "2026-11-10", to: "2026-11-12" }], repositories: ["acme/web"] }],
  });
  // The second draw is the same as the first: a used identity is never given again.
  expect(await people.save("acme/web", GRACE)).toEqual({ ok: true });
  expect((written(store) as { people: { id: string }[] }).people.map((person) => person.id)).toEqual(["aaaaaaa1", "bbbbbbb2"]);
});

test("a refused person is told field by field and nothing is written; a handle already in the list is refused without case", async () => {
  const { people, store } = setup();
  await people.save("acme/web", GRACE);
  const before = structuredClone(written(store));
  const refused = await people.save("acme/web", { ...GRACE, name: "Grace again", handle: "@GRACE" });
  expect(refused).toEqual({ ok: false, errors: { handle: "@GRACE is already in your list: add them from other projects." } });
  const wrongAbsence = await people.save("acme/web", { ...ADA, absences: [{ from: "2026-11-12", to: "2026-11-10" }] });
  expect(wrongAbsence.ok).toBe(false);
  expect(written(store)).toEqual(before);
});

test("a change to a person holds in every project they are in, and the other people are not touched", async () => {
  const { people } = setup();
  await people.save("acme/web", GRACE);
  await people.addToTeam("acme/api", "aaaaaaa1");
  const edited = await people.save("acme/web", { ...GRACE, id: "aaaaaaa1", name: "Grace B. Hopper", level: "senior" });
  expect(edited).toEqual({ ok: true });
  for (const repository of ["acme/web", "acme/api"]) expect(people.view(repository).members.map((person) => [person.name, person.level])).toEqual([["Grace B. Hopper", "senior"]]);
  // A person that is not in the list any more is not born again by an edit.
  expect(await people.save("acme/web", { ...GRACE, handle: "other", id: "99999999" })).toEqual({ ok: false, error: saveFailure("that person is not in the list any more") });
});

test("Add from other projects, Remove from team and Delete person", async () => {
  const { people } = setup();
  await people.save("acme/web", GRACE);
  expect(people.view("acme/api")).toMatchObject({ members: [], others: [{ id: "aaaaaaa1" }] });
  await people.addToTeam("acme/api", "aaaaaaa1");
  await people.addToTeam("acme/api", "aaaaaaa1");
  expect(people.members("acme/api")).toMatchObject({ members: [{ name: "Grace Hopper" }] });
  await people.removeFromTeam("acme/web", "aaaaaaa1");
  expect(people.view("acme/web")).toMatchObject({ members: [], others: [{ id: "aaaaaaa1" }] });
  expect(people.view("acme/api").members).toHaveLength(1);
  expect(await people.addToTeam("acme/web", "99999999")).toEqual({ ok: false, error: saveFailure("that person is not in the list any more") });
  expect(await people.delete("aaaaaaa1")).toEqual({ ok: true });
  expect(people.view("acme/api")).toMatchObject({ members: [], others: [] });
  expect(await people.delete("aaaaaaa1")).toEqual({ ok: true });
});

test("what the agent reads of a member leaves out the identity and the other projects", async () => {
  const { people } = setup();
  await people.save("acme/web", { ...ADA, absences: [{ from: "2026-11-10", to: "2026-11-12" }] });
  expect(people.members("acme/web")).toEqual({ members: [{ name: "Ada Lovelace", handle: "Ada", level: "senior", skills: ["Rust", "Go"], capacity: 4.5, absences: [{ from: "2026-11-10", to: "2026-11-12" }] }] });
  expect(people.members("acme/api")).toEqual({ members: [] });
});

test("a person that cannot be read is kept as it is through every write, not shown, and counted", async () => {
  const broken = { id: "bbbbbbb2", name: "", surprise: true };
  const { people, store } = setup({ version: 1, people: [broken] });
  expect(people.view("acme/web")).toMatchObject({ members: [], others: [], unreadable: 1, error: null });
  await people.save("acme/web", GRACE);
  expect((written(store) as { people: unknown[] }).people).toEqual([broken, expect.objectContaining({ name: "Grace Hopper" })]);
  // Its identity is not drawn again for a new person.
  const draws = setup({ version: 1, people: [{ id: "aaaaaaa1", junk: 1 }] });
  await draws.people.save("acme/web", GRACE);
  expect((written(draws.store) as { people: { id: string }[] }).people.map((person) => person.id)).toEqual(["aaaaaaa1", "bbbbbbb2"]);
  await people.delete("bbbbbbb2");
  expect((written(store) as { people: unknown[] }).people).toEqual([broken, expect.objectContaining({ name: "Grace Hopper" })]);
});

test("a value of another version is not read and not overwritten, and every write says why it did not happen", async () => {
  const other = { version: 2, people: [{ id: "aaaaaaa1" }] };
  const { people, store } = setup(other);
  const view = people.view("acme/web");
  expect(view.members).toEqual([]);
  expect(view.error).toContain("another version of Trama");
  expect(people.members("acme/web")).toEqual({ error: expect.stringContaining("another version of Trama") });
  for (const outcome of [await people.save("acme/web", GRACE), await people.addToTeam("acme/web", "aaaaaaa1"), await people.removeFromTeam("acme/web", "aaaaaaa1"), await people.delete("aaaaaaa1")]) {
    expect(outcome).toMatchObject({ ok: false, error: expect.stringContaining("Trama could not save the team") });
  }
  expect(written(store)).toBe(other);
});

test("a store that fails to write tells the reason as the notice sentence", async () => {
  const { people, store } = setup();
  store.update = () => Promise.reject(new Error("Quota exceeded."));
  expect(await people.save("acme/web", GRACE)).toEqual({ ok: false, error: "Trama could not save the team: Quota exceeded." });
});

test("the next absence in the view is the first one that has not ended, today included", async () => {
  const { people } = setup();
  await people.save("acme/web", { ...GRACE, absences: [{ from: "2026-10-01", to: "2026-10-24" }, { from: "2026-10-25", to: "2026-10-25" }, { from: "2026-12-01", to: "2026-12-05" }] });
  expect(people.view("acme/web").members[0]?.nextAbsence).toEqual({ from: "2026-10-25", to: "2026-10-25" });
});
