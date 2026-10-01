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

/** A numbered ID such as "0003". YAML reads an unquoted 0003 as the number 3, so numbers are accepted. */
export function idField(raw: Raw, key: string, where: string): string | null {
  const v = raw[key];
  if (v === undefined || v === null) return null;
  if (typeof v === "number" && Number.isInteger(v) && v >= 0) return String(v).padStart(4, "0");
  if (typeof v === "string" && /^\d+$/.test(v)) return v.padStart(4, "0");
  throw new TramaError(`${where}: "${key}" must be a numeric ID such as "0003", found ${JSON.stringify(v)}`);
}

export function stringMap(raw: Raw, key: string, where: string): Record<string, string> {
  const v = raw[key];
  if (v === undefined || v === null) return {};
  if (typeof v !== "object" || Array.isArray(v) || Object.values(v).some((x) => typeof x !== "string"))
    throw new TramaError(`${where}: "${key}" must map file paths to hashes (or "new"), found ${describe(v)}`);
  return v as Record<string, string>;
}
