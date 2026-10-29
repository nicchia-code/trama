import {
  addRepository,
  type Absence,
  checkPerson,
  type Level,
  membersOf,
  othersOf,
  type Person,
  type PersonErrors,
  type PersonInput,
  personSchema,
  personView,
  localDate,
  readTeam,
  removeRepository,
} from "../../../../src/core/people";
import { MANAGER_NEEDS_GITHUB, managerStatus, teamUnavailableReason } from "../../../../src/core/manager-mode";
import { type Project, randomCardId } from "../../../../src/core/store";
import type { ToWebview } from "../../protocol";

/*
 * The people of the Manager's team (`data#person`, `tech#team`): the only module that reads or writes the key `trama.team` of the editor's global state. Every person is
 * checked again here, with `src/core/people.ts`, whatever the webview sent. The key is never synchronised by Settings Sync (`setKeysForSync` is never called for it).
 */

/** The key of the people in the window's global state: never in the project, nor in the settings. */
export const TEAM_KEY = "trama.team";

/** Where the people are kept: `ExtensionContext.globalState` in the extension, a plain map in the tests. */
export interface PeopleStore {
  get(key: string): unknown;
  update(key: string, value: unknown): PromiseLike<void>;
}

/** The store of the tests: a plain map, with the values it holds in sight. */
export type MemoryPeopleStore = PeopleStore & { values: Map<string, unknown> };

/** A store kept in memory, for the tests. */
export function memoryPeopleStore(initial?: unknown): MemoryPeopleStore {
  const values = new Map<string, unknown>(initial === undefined ? [] : [[TEAM_KEY, initial]]);
  return {
    values,
    get: (key) => values.get(key),
    update: (key, value) => {
      if (value === undefined) values.delete(key);
      else values.set(key, value);
      return Promise.resolve();
    },
  };
}

export type TeamMessage = Extract<ToWebview, { type: "team" }>;

/** Why the saved value is left alone: it was written by a version of Trama this one does not read. */
const UNREADABLE = "the saved team was written by another version of Trama and is left as it is";
const GONE = "that person is not in the list any more";

/** The sentence of the notice at the top of the People tab for a write that failed (`ui#person`). */
export const saveFailure = (reason: string): string => `Trama could not save the team: ${reason.trim().replace(/\.$/, "")}.`;

const unreadableNotice = "Trama cannot read the saved team: it was written by another version of Trama and is left as it is.";

export type WriteOutcome = { ok: true } | { ok: false; error: string };
/** What `savePerson` came to: saved, refused with the message of each field (nothing was written), or failed to write. */
export type SaveOutcome = { ok: true } | { ok: false; errors: PersonErrors } | { ok: false; error: string };

/** A member of the team as `trama team show` gets it from the editor: nothing of the person's other projects, nor the identity. */
export interface AgentMember {
  name: string;
  handle: string;
  level: Level;
  skills: string[];
  capacity: number;
  absences: Absence[];
}

export type TeamAnswer = { members: AgentMember[] } | { error: string };

const asValid = (raw: unknown): Person | null => {
  const parsed = personSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

/** The `id` a stored value carries, whatever else it holds; empty when it has none. */
function storedId(raw: unknown): string {
  if (typeof raw !== "object" || raw === null || !("id" in raw)) return "";
  return typeof raw.id === "string" ? raw.id : "";
}

/** The Manager's people, behind the store. Reads are never cached: the value is read again at every call. */
export class People {
  constructor(
    private readonly store: PeopleStore,
    /** The local date of the editor: today. */
    private readonly today: () => string = () => localDate(new Date()),
    private readonly draw: () => string = randomCardId,
  ) {}

  /** What the Team view is sent for the team of `repository` (`<owner>/<repo>`, lower case); `error` is the notice of a write that failed. */
  view(repository: string, error: string | null = null): TeamMessage {
    const read = readTeam(this.store.get(TEAM_KEY));
    if (!read.readable) return { type: "team", members: [], others: [], unreadable: 0, error: error ?? unreadableNotice };
    const today = this.today();
    return {
      type: "team",
      members: membersOf(read.people, repository).map((person) => personView(person, today)),
      others: othersOf(read.people, repository).map((person) => personView(person, today)),
      unreadable: read.invalid,
      error,
    };
  }

  /** The members of the team of `repository` as the agent reads them, or why they cannot be read. */
  members(repository: string): TeamAnswer {
    const read = readTeam(this.store.get(TEAM_KEY));
    if (!read.readable) return { error: unreadableNotice };
    return {
      members: membersOf(read.people, repository).map(({ name, handle, level, skills, capacity, absences }) => ({ name, handle, level, skills: [...skills], capacity, absences: absences.map(({ from, to }) => ({ from, to })) })),
    };
  }

  /**
   * `Save` of the person's dialog: a person without `id` is born in the team of `repository`; one with `id` is changed wherever they are. A person that breaks `rules#person`
   * is refused with the message of each field and nothing is written.
   */
  async save(repository: string, input: PersonInput): Promise<SaveOutcome> {
    const read = readTeam(this.store.get(TEAM_KEY));
    if (!read.readable) return { ok: false, error: saveFailure(UNREADABLE) };
    const checked = checkPerson(input, read.people, this.today());
    if (!checked.ok) return { ok: false, errors: checked.errors };
    const existing = input.id === undefined ? undefined : read.people.find((person) => person.id === input.id);
    if (input.id !== undefined && existing === undefined) return { ok: false, error: saveFailure(GONE) };
    const person: Person = { ...checked.person, id: existing?.id ?? this.freshId(read.stored.people), repositories: existing?.repositories ?? [repository] };
    const next = existing === undefined ? [...read.stored.people, person] : read.stored.people.map((raw) => (asValid(raw)?.id === existing.id ? person : raw));
    return this.write(next);
  }

  /** `Add from other projects`, and the `Undo` of `Remove from team`: the person joins the team of `repository`. */
  addToTeam(repository: string, id: string): Promise<WriteOutcome> {
    return this.change(id, (person) => addRepository(person, repository));
  }

  /** `Remove from team`: the person leaves the team of `repository` and stays in the list and in the other teams. */
  removeFromTeam(repository: string, id: string): Promise<WriteOutcome> {
    return this.change(id, (person) => removeRepository(person, repository));
  }

  /** `Delete person`, after the Manager confirmed: the person leaves the list and the team of every project. A person already gone is not an error. */
  async delete(id: string): Promise<WriteOutcome> {
    const read = readTeam(this.store.get(TEAM_KEY));
    if (!read.readable) return { ok: false, error: saveFailure(UNREADABLE) };
    return this.write(read.stored.people.filter((raw) => asValid(raw)?.id !== id));
  }

  /** The person with `id`, when the list has them and they are readable. */
  find(id: string): Person | undefined {
    const read = readTeam(this.store.get(TEAM_KEY));
    return read.readable ? read.people.find((person) => person.id === id) : undefined;
  }

  private async change(id: string, change: (person: Person) => Person): Promise<WriteOutcome> {
    const read = readTeam(this.store.get(TEAM_KEY));
    if (!read.readable) return { ok: false, error: saveFailure(UNREADABLE) };
    if (!read.people.some((person) => person.id === id)) return { ok: false, error: saveFailure(GONE) };
    return this.write(read.stored.people.map((raw) => {
      const person = asValid(raw);
      return person?.id === id ? change(person) : raw;
    }));
  }

  private async write(people: unknown[]): Promise<WriteOutcome> {
    try {
      await this.store.update(TEAM_KEY, { version: 1, people });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: saveFailure(error instanceof Error ? error.message : String(error)) };
    }
  }

  /** An identity no person of the list has, whether the person can be read or not. */
  private freshId(stored: readonly unknown[]): string {
    const used = new Set(stored.map(storedId));
    for (let attempt = 0; attempt < 64; attempt++) {
      const id = this.draw();
      if (/^[a-z0-9]{8}$/.test(id) && !used.has(id)) return id;
    }
    throw new Error("Could not draw a free identity for a new person");
  }
}

/**
 * What the editor answers to `trama team show` (`cli#team`): the members of the team of `project`, or the reason Team is not available. Only the fields the command
 * prints leave the editor, and only the members of this project's team.
 */
export function teamAnswer(project: Project, people: People): TeamAnswer {
  const reason = teamUnavailableReason(project);
  if (reason !== null) return { error: reason };
  // Origin is the window's value (`ProjectOrigin`), read once and again when git's configuration changes: `trama team show` starts no process.
  const { repository } = managerStatus(project);
  if (repository === null) return { error: MANAGER_NEEDS_GITHUB };
  return people.members(repository);
}
