import type { ElicitationSchema } from "@agentclientprotocol/sdk";
import type { FormAnswerMessage } from "../../omp-chat-protocol";

// A form of the agent is an elicitation request of ACP: a flat object schema of primitive fields. These helpers turn the schema into the fields the form draws
// and the values the developer gave into the answer; they are pure.

export type FieldValue = string | number | boolean | string[];

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  description?: string;
  required: boolean;
  /** `single`: one option of several; `multi`: any number of them; `text`: a free answer. */
  kind: "single" | "multi" | "text" | "boolean" | "number";
  options: FieldOption[];
}

const textOf = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);

/** The options a schema lists as `oneOf`/`anyOf` (`{ const, title }`) or as a plain `enum`; anything that is not a list of them gives none. */
function optionsOf(titled: unknown, plain: unknown): FieldOption[] {
  if (Array.isArray(titled) && titled.length > 0) {
    const options: FieldOption[] = [];
    for (const option of titled) {
      if (typeof option === "object" && option !== null && "const" in option && typeof option.const === "string") {
        options.push({ value: option.const, label: "title" in option && typeof option.title === "string" ? option.title : option.const });
      }
    }
    if (options.length > 0) return options;
  }
  return Array.isArray(plain) ? plain.filter((value): value is string => typeof value === "string").map((value) => ({ value, label: value })) : [];
}

/** The fields of a form, in the order the schema lists them. A field of a type this version does not know is left out. */
export function fieldsOf(schema: ElicitationSchema): FieldDef[] {
  const required = new Set(schema.required ?? []);
  const fields: FieldDef[] = [];
  for (const [key, property] of Object.entries(schema.properties ?? {})) {
    const description = "description" in property ? textOf(property.description) : undefined;
    const common = {
      key,
      label: ("title" in property ? textOf(property.title) : undefined) ?? key,
      required: required.has(key),
      ...(description === undefined ? {} : { description }),
    };
    if (property.type === "string") {
      const options = optionsOf("oneOf" in property ? property.oneOf : undefined, "enum" in property ? property.enum : undefined);
      fields.push(options.length > 0 ? { ...common, kind: "single", options } : { ...common, kind: "text", options: [] });
    } else if (property.type === "number" || property.type === "integer") {
      fields.push({ ...common, kind: "number", options: [] });
    } else if (property.type === "boolean") {
      fields.push({ ...common, kind: "boolean", options: [] });
    } else if (property.type === "array") {
      const items = "items" in property ? property.items : undefined;
      const options = typeof items === "object" && items !== null ? optionsOf("anyOf" in items ? items.anyOf : undefined, "enum" in items ? items.enum : undefined) : [];
      fields.push({ ...common, kind: "multi", options });
    }
  }
  return fields;
}

/** The starting values: nothing chosen, nothing typed, a box unchecked. */
export function initialValues(fields: readonly FieldDef[]): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};
  for (const field of fields) values[field.key] = field.kind === "multi" ? [] : field.kind === "boolean" ? false : "";
  return values;
}

const isEmpty = (field: FieldDef, value: FieldValue | undefined): boolean => {
  if (value === undefined) return true;
  if (field.kind === "boolean") return false;
  if (Array.isArray(value)) return value.length === 0;
  return typeof value === "string" && value.trim() === "";
};

/** Whether a required field is still empty: Submit waits. */
export const missingRequired = (fields: readonly FieldDef[], values: Record<string, FieldValue>): boolean => fields.some((field) => field.required && isEmpty(field, values[field.key]));

/** The answer Submit gives: what was filled in; an empty optional field is left out, and a number field gives a number. */
export function answerOf(fields: readonly FieldDef[], values: Record<string, FieldValue>): FormAnswerMessage {
  const content: Record<string, FieldValue> = {};
  for (const field of fields) {
    const value = values[field.key];
    if (value === undefined || isEmpty(field, value)) continue;
    if (field.kind === "number" && typeof value === "string") {
      const number = Number(value);
      if (!Number.isNaN(number)) content[field.key] = number;
      continue;
    }
    content[field.key] = typeof value === "string" ? value.trim() : value;
  }
  return { action: "accept", content };
}

/** How a given value reads in the form once it was sent. */
export function valueText(field: FieldDef, value: FieldValue | undefined): string {
  if (value === undefined) return "";
  const label = (each: string) => field.options.find((option) => option.value === each)?.label ?? each;
  if (Array.isArray(value)) return value.map(label).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return typeof value === "string" ? label(value) : String(value);
}
