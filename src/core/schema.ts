import { TramaError } from "./errors";

/** Validators for hand-editable YAML front matter. Every failure names the file and the field. */
export type Raw = Record<string, unknown>;

const describe = (v: unknown): string => (Array.isArray(v) ? "a list" : v === null ? "null" : `a ${typeof v}`);

/** The front matter object; an empty block counts as `{}`. */
export function asObject(value: unknown, where: string): Raw {
  if (value === null || value === undefined) return {};
  if (typeof value !== "object" || Array.isArray(value)) throw new TramaError(`${where}: front matter must be a mapping, not ${describe(value)}`);
  return value as Raw;
}

export function enumField<T extends string>(raw: Raw, key: string, allowed: readonly T[], fallback: T, where: string): T {
  const v = raw[key];
  if (v === undefined || v === null) return fallback;
  if (typeof v === "string" && (allowed as readonly string[]).includes(v)) return v as T;
  throw new TramaError(`${where}: "${key}" must be one of ${allowed.join(", ")}, found ${JSON.stringify(v)}`);
}

export function enumOrNull<T extends string>(raw: Raw, key: string, allowed: readonly T[], where: string): T | null {
  return raw[key] === undefined || raw[key] === null ? null : enumField(raw, key, allowed, allowed[0] as T, where);
}

export function boolField(raw: Raw, key: string, fallback: boolean, where: string): boolean {
  const v = raw[key];
  if (v === undefined || v === null) return fallback;
  if (typeof v === "boolean") return v;
  throw new TramaError(`${where}: "${key}" must be true or false, found ${JSON.stringify(v)}`);
}

/** A list of strings; absent or null is an empty list. A bare string is an error, not a one-item list. */
export function stringList(raw: Raw, key: string, where: string): string[] {
  const v = raw[key];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string"))
    throw new TramaError(`${where}: "${key}" must be a list of strings, found ${Array.isArray(v) ? "a list with non-string items" : describe(v)}`);
  return v as string[];
}

/** Eight lowercase letters and digits: the identity of a Proposal, Task or Drift that is not numbered. */
const RANDOM_ID = /^[a-z0-9]{8}$/;

/**
 * The identity as it is stored. An eight-character identity stays as written, even when it is all digits.
 * A shorter number is padded to four digits, so `12` and `0012` are the same numbered card.
 */
export function canonicalCardId(raw: string): string {
  if (RANDOM_ID.test(raw)) return raw;
  if (/^\d+$/.test(raw)) return String(Number(raw)).padStart(4, "0");
  return raw;
}

/** A card identity: a number such as "0003", or eight lowercase letters and digits. YAML reads an unquoted 0003 as the number 3. */
export function idField(raw: Raw, key: string, where: string): string | null {
  const v = raw[key];
  if (v === undefined || v === null) return null;
  if (typeof v === "number" && Number.isInteger(v) && v >= 0) return String(v).padStart(4, "0");
  if (typeof v === "string" && (RANDOM_ID.test(v) || /^\d+$/.test(v))) return canonicalCardId(v);
  throw new TramaError(`${where}: "${key}" must be a card ID (a number such as "0003", or eight lowercase letters and digits), found ${JSON.stringify(v)}`);
}

const CREATED_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** When the card was created, as a UTC ISO 8601 date and time. Absent on numbered cards written before the field existed. */
export function createdField(raw: Raw, where: string): string | null {
  const v = raw["created"];
  if (v === undefined || v === null) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  if (typeof v === "string" && CREATED_AT.test(v) && !Number.isNaN(Date.parse(v))) return v;
  throw new TramaError(`${where}: "created" must be a UTC date and time in ISO 8601, found ${JSON.stringify(v)}`);
}

export function stringMap(raw: Raw, key: string, where: string): Record<string, string> {
  const v = raw[key];
  if (v === undefined || v === null) return {};
  if (typeof v !== "object" || Array.isArray(v) || Object.values(v).some((x) => typeof x !== "string"))
    throw new TramaError(`${where}: "${key}" must map file paths to hashes (or "new"), found ${describe(v)}`);
  return v as Record<string, string>;
}

/** A whole number from 1 up (an option's number); absent or null is none. */
export function positiveIntOrNull(raw: Raw, key: string, where: string): number | null {
  const v = raw[key];
  if (v === undefined || v === null) return null;
  if (typeof v === "number" && Number.isInteger(v) && v >= 1) return v;
  throw new TramaError(`${where}: "${key}" must be a whole number from 1, found ${JSON.stringify(v)}`);
}

/** Free text; absent or null is none. */
export function textOrNull(raw: Raw, key: string, where: string): string | null {
  const v = raw[key];
  if (v === undefined || v === null) return null;
  if (typeof v === "string") return v;
  throw new TramaError(`${where}: "${key}" must be text, found ${describe(v)}`);
}
