import { z } from "zod";

/*
 * The people of the Manager's team (`data#person`, `rules#person`): the validation of one person and of the value the editor stores, and the pure helpers the Team
 * view and `trama team show` share. Nothing here touches `globalState`: the only module that reads or writes the key is `extension/src/host/team/people.ts`.
 */

export const LEVELS = ["junior", "mid", "senior"] as const;
export type Level = (typeof LEVELS)[number];

/** The text of each level, as the Team view shows it. */
export const LEVEL_LABELS: Record<Level, string> = { junior: "Junior", mid: "Mid", senior: "Senior" };

export const MAX_NAME = 80;
export const MAX_HANDLE = 39;
export const MAX_SKILLS = 20;
export const MAX_SKILL = 30;
export const MAX_ABSENCES = 50;
export const MIN_CAPACITY = 0.5;
export const MAX_CAPACITY = 5;
export const DEFAULT_CAPACITY = 5;
/** The days an absence that has ended stays in the list before it is dropped, when the person is saved. */
export const ABSENCE_KEEP_DAYS = 90;

/** The messages of `rules#person`. */
export const PERSON_MESSAGES = {
  name: "Enter a name of 1 to 80 characters.",
  handleSpace: "A GitHub handle can't contain spaces.",
  handle: "Use 1 to 39 letters, digits or single hyphens.",
  capacity: "Enter 0.5 to 5 days, in steps of 0.5.",
  skills: "At most 20 skills.",
  skill: "Each skill takes 1 to 30 characters.",
  absences: "At most 50 absences.",
  absenceOrder: "The end of an absence can't be before its start.",
  absenceDates: "Enter both dates.",
  level: "Choose Junior, Mid or Senior.",
} as const;

/** The message of a handle another person already has. */
export const handleTaken = (handle: string): string => `@${handle} is already in your list: add them from other projects.`;

export interface Absence {
  /** `YYYY-MM-DD`. */
  from: string;
  /** `YYYY-MM-DD`, not before `from`. */
  to: string;
}

/** A person as the editor stores it (`data#person`). */
export interface Person {
  id: string;
  name: string;
  handle: string;
  level: Level;
  skills: string[];
  capacity: number;
  absences: Absence[];
  repositories: string[];
}

/** What the Manager writes in the person dialog: the stored fields but the projects. `id` is absent for a new person. `capacity` may be anything the field held. */
export interface PersonInput {
  id?: string;
  name: string;
  handle: string;
  level: Level;
  skills: string[];
  capacity: number;
  absences: Absence[];
}

export const PERSON_ID = /^[a-z0-9]{8}$/;
const HANDLE = /^[A-Za-z0-9](?:-?[A-Za-z0-9])*$/;
const REPOSITORY = /^[a-z0-9._-]+\/[a-z0-9._-]+$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whether `text` is a real calendar date written `YYYY-MM-DD`. */
export function isDate(text: string): boolean {
  const match = DATE.exec(text);
  if (match === null) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** The local date of `date` as `YYYY-MM-DD`: today is the local date of the editor. */
export function localDate(date: Date): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${String(date.getFullYear()).padStart(4, "0")}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

/** `date` moved by `days` days, both `YYYY-MM-DD`. */
export function addDays(date: string, days: number): string {
  const match = DATE.exec(date);
  if (match === null) return date;
  const moved = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return moved.toISOString().slice(0, 10);
}

const absenceOrder = (a: Absence, b: Absence): number => (a.from < b.from ? -1 : a.from > b.from ? 1 : a.to < b.to ? -1 : a.to > b.to ? 1 : 0);

/** The absences in date order, without changing the list given. */
export const sortAbsences = (absences: readonly Absence[]): Absence[] => [...absences].sort(absenceOrder);

/** The first absence whose `To` is `today` or later (`rules#person`); null when there is none. The list may be in any order. */
export function nextAbsence(absences: readonly Absence[], today: string): Absence | null {
  return sortAbsences(absences).find((absence) => absence.to >= today) ?? null;
}

/** The absences that end `today` or later, in date order: what `trama team show` prints. */
export const upcomingAbsences = (absences: readonly Absence[], today: string): Absence[] => sortAbsences(absences).filter((absence) => absence.to >= today);

/** The absences without those that ended more than 90 days before `today`. */
export const dropOldAbsences = (absences: readonly Absence[], today: string): Absence[] => absences.filter((absence) => absence.to >= addDays(today, -ABSENCE_KEEP_DAYS));

/** The first letter of each of the first two words of the name, upper case. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter((word) => word !== "")
    .slice(0, 2)
    .map((word) => (Array.from(word)[0] ?? "").toUpperCase())
    .join("");
}

/** The first word of the name: how the Timeline and the signals name a person. */
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? "";

/** The order the people are listed in: by name without case, then by handle. */
export function byName(a: { name: string; handle: string }, b: { name: string; handle: string }): number {
  const x = a.name.toLowerCase();
  const y = b.name.toLowerCase();
  return x < y ? -1 : x > y ? 1 : a.handle.toLowerCase() < b.handle.toLowerCase() ? -1 : a.handle.toLowerCase() > b.handle.toLowerCase() ? 1 : 0;
}

/** The person put in the team of `repository` (lower case `<owner>/<repo>`). */
export const addRepository = (person: Person, repository: string): Person => (person.repositories.includes(repository) ? person : { ...person, repositories: [...person.repositories, repository] });

/** The person taken out of the team of `repository`. */
export const removeRepository = (person: Person, repository: string): Person => ({ ...person, repositories: person.repositories.filter((r) => r !== repository) });

export const inTeam = (person: Person, repository: string): boolean => person.repositories.includes(repository);

/** The text of a handle as written by the Manager: spaces around and a leading `@` removed. */
export const cleanHandle = (text: string): string => text.trim().replace(/^@/, "");

/** Why `handle` (already cleaned) is not a GitHub handle, or null. */
export function handleError(handle: string): string | null {
  if (/\s/.test(handle)) return PERSON_MESSAGES.handleSpace;
  return handle.length >= 1 && handle.length <= MAX_HANDLE && HANDLE.test(handle) ? null : PERSON_MESSAGES.handle;
}

/** The skills trimmed, with the ones equal to an earlier one without case left out. */
export function uniqueSkills(skills: readonly string[]): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const skill of skills) {
    const text = skill.trim();
    if (text === "" || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    kept.push(text);
  }
  return kept;
}

const isCapacity = (value: number): boolean => Number.isFinite(value) && value >= MIN_CAPACITY && value <= MAX_CAPACITY && Number.isInteger(value * 2);

const skillsAreUnique = (skills: readonly string[]): boolean => new Set(skills.map((s) => s.toLowerCase())).size === skills.length;

const absencesAreOrdered = (absences: readonly Absence[]): boolean => absences.every((absence, at) => at === 0 || absenceOrder(absences[at - 1] as Absence, absence) <= 0);

const dateSchema = z.string().refine(isDate);
const absenceSchema = z.strictObject({ from: dateSchema, to: dateSchema }).refine((a) => a.from <= a.to);

/** A stored person: the shape of `data#person` and the values of `rules#person`. Anything else is kept in the value as it is and never shown. */
export const personSchema = z.strictObject({
  id: z.string().regex(PERSON_ID),
  name: z
    .string()
    .refine((s) => s === s.trim() && s.length >= 1 && s.length <= MAX_NAME),
  handle: z.string().refine((s) => handleError(s) === null),
  level: z.enum(LEVELS),
  skills: z
    .array(z.string().refine((s) => s === s.trim() && s.length >= 1 && s.length <= MAX_SKILL))
    .max(MAX_SKILLS)
    .refine(skillsAreUnique),
  capacity: z.number().refine(isCapacity),
  absences: z.array(absenceSchema).max(MAX_ABSENCES).refine(absencesAreOrdered),
  repositories: z
    .array(z.string().regex(REPOSITORY))
    .refine((list) => new Set(list).size === list.length),
});

/** The stored value: its `version` and the list of people, each still unchecked. */
export const storedTeamSchema = z.strictObject({ version: z.literal(1), people: z.array(z.unknown()) });

export interface StoredTeam {
  version: 1;
  people: unknown[];
}

/** What reading the stored value gives: the readable people (`ok`), or `unreadable` when the value is not one this version reads and so must be neither shown nor overwritten. */
export type TeamRead = { readable: true; stored: StoredTeam; people: Person[]; invalid: number } | { readable: false };

/** Reads the value stored under the key: absent is an empty team; a `version` other than 1, or a value of another shape, is not read. A person that does not fit stays in `stored.people`. */
export function readTeam(value: unknown): TeamRead {
  if (value === undefined || value === null) return { readable: true, stored: { version: 1, people: [] }, people: [], invalid: 0 };
  const parsed = storedTeamSchema.safeParse(value);
  if (!parsed.success) return { readable: false };
  const people: Person[] = [];
  let invalid = 0;
  for (const raw of parsed.data.people) {
    const person = personSchema.safeParse(raw);
    if (person.success) people.push(person.data);
    else invalid++;
  }
  return { readable: true, stored: parsed.data, people, invalid };
}

/** The field-by-field messages of a person that is refused; each field present is invalid. `absences.rows` are the rows to mark. */
export interface PersonErrors {
  name?: string;
  handle?: string;
  level?: string;
  capacity?: string;
  skills?: string;
  absences?: { message: string; rows: number[] };
}

/** The fields in the order the dialog shows them: the focus goes to the first one that is invalid. */
export const PERSON_FIELDS = ["name", "handle", "level", "capacity", "skills", "absences"] as const satisfies readonly (keyof PersonErrors)[];

/** The fields of a person as the Manager wrote them, cleaned (`valid`) or the messages of what is wrong. */
export type PersonCheck = { ok: true; person: Omit<Person, "id" | "repositories"> } | { ok: false; errors: PersonErrors };

/**
 * Checks what the Manager wrote against `rules#person`. `others` are the other people of the list (the person being edited is left out by the caller), against which a
 * handle must be new; `today` is the local date, for dropping the absences that ended more than 90 days ago. Whatever is wrong gets its message; nothing is changed.
 */
export function checkPerson(input: PersonInput, others: readonly Pick<Person, "id" | "handle">[], today: string): PersonCheck {
  const errors: PersonErrors = {};
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 1 || name.length > MAX_NAME) errors.name = PERSON_MESSAGES.name;
  const handle = cleanHandle(typeof input.handle === "string" ? input.handle : "");
  const problem = handleError(handle);
  if (problem !== null) errors.handle = problem;
  else if (others.some((other) => other.id !== input.id && other.handle.toLowerCase() === handle.toLowerCase())) errors.handle = handleTaken(handle);
  if (!LEVELS.includes(input.level)) errors.level = PERSON_MESSAGES.level;
  if (typeof input.capacity !== "number" || !isCapacity(input.capacity)) errors.capacity = PERSON_MESSAGES.capacity;
  const skillList = Array.isArray(input.skills) ? input.skills.filter((s): s is string => typeof s === "string") : [];
  const skills = uniqueSkills(skillList);
  if (skills.length > MAX_SKILLS) errors.skills = PERSON_MESSAGES.skills;
  else if (skills.some((skill) => skill.length > MAX_SKILL)) errors.skills = PERSON_MESSAGES.skill;
  const absenceList = Array.isArray(input.absences) ? input.absences : [];
  if (absenceList.length > MAX_ABSENCES) errors.absences = { message: PERSON_MESSAGES.absences, rows: [] };
  else {
    const rows: number[] = [];
    let message: string | undefined;
    absenceList.forEach((absence, at) => {
      const from = typeof absence?.from === "string" ? absence.from : "";
      const to = typeof absence?.to === "string" ? absence.to : "";
      if (!isDate(from) || !isDate(to)) {
        rows.push(at);
        message ??= PERSON_MESSAGES.absenceDates;
      } else if (to < from) {
        rows.push(at);
        message ??= PERSON_MESSAGES.absenceOrder;
      }
    });
    if (message !== undefined) errors.absences = { message, rows };
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const absences = dropOldAbsences(sortAbsences(absenceList), today).map(({ from, to }) => ({ from, to }));
  return { ok: true, person: { name, handle, level: input.level, skills, capacity: input.capacity, absences } };
}

/** The first field with a message, in the order of the dialog. */
export const firstInvalid = (errors: PersonErrors): (typeof PERSON_FIELDS)[number] | undefined => PERSON_FIELDS.find((field) => errors[field] !== undefined);

/** A person as the Team view receives it: the stored fields plus the initials and the next absence. */
export interface PersonView extends Person {
  initials: string;
  nextAbsence: Absence | null;
}

export const personView = (person: Person, today: string): PersonView => ({ ...person, initials: initials(person.name), nextAbsence: nextAbsence(person.absences, today) });

/** The members of the team of `repository`, by name. */
export const membersOf = (people: readonly Person[], repository: string): Person[] => people.filter((p) => inTeam(p, repository)).sort(byName);

/** The people outside the team of `repository`, by name. */
export const othersOf = (people: readonly Person[], repository: string): Person[] => people.filter((p) => !inTeam(p, repository)).sort(byName);
