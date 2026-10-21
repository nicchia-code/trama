import { z } from "zod";
import { type Command, COMMON_OPTIONS, commandName, type Registry, usageOf } from "./registry";

type Json = Record<string, unknown>;

/** The JSON Schema of the input and of the output of a command. */
export function schemasOf(command: Command): { input: Json; output: Json } {
  return {
    input: z.toJSONSchema(command.input, { io: "input", unrepresentable: "any" }) as Json,
    output: z.toJSONSchema(command.output, { io: "output", unrepresentable: "any" }) as Json,
  };
}

/** `trama <command> --help --json`: the JSON Schema of the input and of the output. */
export const schemaHelp = (command: Command): string => JSON.stringify({ command: commandName(command), ...schemasOf(command) }, null, 2);

const asJson = (value: unknown): Json => (typeof value === "object" && value !== null ? (value as Json) : {});

/** A short name for the type of a JSON Schema node: `string`, `integer ≥ 1`, `"a" | "b"`, `{ title: string, text: string }[]`. */
function typeName(node: Json): string {
  if (Array.isArray(node.enum)) return node.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (node.const !== undefined) return JSON.stringify(node.const);
  const variants = (node.anyOf ?? node.oneOf) as Json[] | undefined;
  if (Array.isArray(variants)) return [...new Set(variants.map(typeName))].join(" | ");
  if (node.type === "array") {
    const [min, max] = [node.minItems, node.maxItems];
    const size = typeof min === "number" && typeof max === "number" ? ` (${min} to ${max} items)` : typeof min === "number" && min > 0 ? ` (at least ${min})` : typeof max === "number" ? ` (at most ${max})` : "";
    return `${typeName(asJson(node.items))}[]${size}`;
  }
  if (node.type === "object") {
    const properties = asJson(node.properties);
    const required = new Set((node.required as string[] | undefined) ?? []);
    const names = Object.keys(properties);
    if (names.length === 0) return "object";
    return `{ ${names.map((name) => `${name}${required.has(name) ? "" : "?"}: ${typeName(asJson(properties[name]))}`).join(", ")} }`;
  }
  const type = Array.isArray(node.type) ? node.type.join(" | ") : typeof node.type === "string" ? node.type : "any";
  const bound = (value: unknown): value is number => typeof value === "number" && Math.abs(value) < Number.MAX_SAFE_INTEGER;
  const bounds = [bound(node.minimum) ? `≥ ${node.minimum}` : "", bound(node.maximum) ? `≤ ${node.maximum}` : "", typeof node.minLength === "number" && node.minLength > 0 ? "not empty" : ""].filter(Boolean);
  return bounds.length > 0 ? `${type} ${bounds.join(", ")}` : type;
}

interface Field {
  name: string;
  type: string;
  required: boolean;
  default?: unknown;
  description: string;
}

/** The top-level fields of the object described by a JSON Schema node; a union gives the fields of each of its objects, with its description. */
function fieldsOf(node: Json): { label: string; fields: Field[] }[] {
  const variants = ((node.anyOf ?? node.oneOf) as Json[] | undefined) ?? [node];
  return variants.map((variant) => {
    const properties = asJson(variant.properties);
    const required = new Set((variant.required as string[] | undefined) ?? []);
    const fields = Object.entries(properties).map(([name, value]) => {
      const property = asJson(value);
      return { name, type: typeName(property), required: required.has(name), default: property.default, description: typeof property.description === "string" ? property.description : "" };
    });
    return { label: typeof variant.description === "string" ? variant.description : "", fields };
  });
}

const describeField = (f: Field): string =>
  `${f.name}: ${f.type}, ${f.required ? "required" : f.default !== undefined ? `default ${JSON.stringify(f.default)}` : "optional"}${f.description ? `. ${f.description}` : ""}`;

/** The heredoc form of an example input: the form the skills teach, safe in every shell. */
function exampleOf(command: Command): string[] {
  if (command.example === undefined) return [];
  const positionals = command.positionals.map((p, i) => command.exampleArgs?.[i] ?? `<${p.name}>`).join(" ");
  return [`trama ${commandName(command)}${positionals ? ` ${positionals}` : ""} --input - <<'JSON'`, JSON.stringify(command.example), "JSON"];
}

/** The fields of the output of `--json`: one block for each shape the command can print, with the shape's description as its label. */
function outputBlocks(command: Command): { label: string; lines: string[] }[] {
  const node = asJson(z.toJSONSchema(command.output, { io: "output", unrepresentable: "any" }));
  return fieldsOf(node).map(({ label, fields }) => ({ label, lines: fields.map(describeField) })).filter((block) => block.lines.length > 0);
}

/** `trama <command> --help`: the usage, the description, each field of the input, an example of `--input` and the fields of the output of `--json`. */
export function commandHelp(command: Command): string {
  const { input } = schemasOf(command);
  const fields = fieldsOf(input)[0]?.fields ?? [];
  const lines: string[] = [`Usage: ${usageOf(command)} ${COMMON_OPTIONS}`, "", command.description ?? command.summary];
  if (command.positionals.length > 0) {
    lines.push("", "Arguments:");
    for (const p of command.positionals) lines.push(`  <${p.name}>${p.optional ? " (optional)" : ""}: ${p.description}${p.choices ? ` One of ${p.choices.join(", ")}.` : ""}`);
  }
  lines.push("", command.stdin !== undefined ? `Input: none. ${command.stdin}` : fields.length === 0 ? "Input: none (it takes no --input, or only {})." : "Input (--input, a JSON object; - reads standard input):");
  if (command.stdin === undefined) for (const f of fields) lines.push(`  ${describeField(f)}`);
  const example = exampleOf(command);
  if (example.length > 0) lines.push("", "Example:", ...example.map((l) => `  ${l}`));
  const blocks = outputBlocks(command);
  if (blocks.length > 0) {
    lines.push("", "Output (--json):");
    blocks.forEach((block, i) => lines.push(...(blocks.length > 1 ? [`  ${block.label || (i === 0 ? "Either" : "Or")}:`] : []), ...block.lines.map((l) => `  ${blocks.length > 1 ? "  " : ""}${l}`)));
  }
  lines.push("", "Options for every command: --root <dir> (the project), --json, --input <json>, --help. Exit codes: 0 ok, 1 failed, 2 wrong use.");
  return lines.join("\n");
}

/** `trama <object> --help`: the commands of the object. */
export function objectHelp(registry: Registry, object: string): string {
  const commands = registry.ofObject(object).filter((c) => !c.hidden);
  const rows = commands.map((c) => ({ usage: usageOf(c).slice("trama ".length), summary: c.summary }));
  const width = Math.max(...rows.map((r) => r.usage.length));
  return [`Usage: trama ${object} <verb> [<id>] [<state>] [--input <json>]`, "", ...rows.map((r) => `  ${r.usage.padEnd(width)}  ${r.summary}`.trimEnd()), "", `Run "trama ${object} <verb> --help" for the input and the output of a command.`].join("\n");
}

/** `trama --help`: the objects with their verbs, then what the commands share. Hooks are left out. */
export function rootHelp(registry: Registry): string {
  const rows = registry.objects().flatMap((object) => {
    const verbs = registry.ofObject(object).filter((c) => !c.hidden).map((c) => c.verb);
    return verbs.length === 0 ? [] : [[object, verbs.join(", ")]] as const;
  });
  const width = Math.max(...rows.map(([name]) => name.length));
  return [
    "trama <object> <verb> [<id>] [<state>] [--input <json>] [--root <dir>] [--json]",
    "",
    "Explore the Model and manage Proposals, Tasks and Drifts. Never reads your code.",
    "",
    "Objects and verbs:",
    ...rows.map(([object, verbs]) => `  ${object.padEnd(width)}  ${verbs}`),
    "",
    "Verbs: show reads one thing; list reads several; new creates and prints its identity; edit changes the content; move takes a card to another state; check reports errors and warnings.",
    "Every field other than the identity of a card, the reference of a Model element and the state of arrival of `move` goes in --input, a JSON object: `--input -` reads it from standard input, any other value is the JSON text.",
    "Options for every command: --root <dir> uses <dir>/.trama; --json prints JSON instead of Markdown; --input <json>; --help or -h prints the usage of the command, `--help --json` its JSON Schemas.",
    'Run "trama <object> --help" for the commands of an object and "trama <object> <verb> --help" for one command.',
    "Exit codes: 0 ok, 1 failure (validation errors, unknown element, stale Proposal), 2 usage.",
  ].join("\n");
}

/** The command reference of `docs/cli.md`: every declared command, derived from the registry. */
export function commandReference(registry: Registry): string {
  const lines: string[] = [];
  for (const object of registry.objects()) {
    const commands = registry.ofObject(object);
    lines.push(`### \`${object}\``, "");
    for (const command of commands) {
      const { input } = schemasOf(command);
      const fields = fieldsOf(input)[0]?.fields ?? [];
      lines.push(`#### \`${usageOf(command)}\``, "", command.description ?? command.summary, "");
      if (command.positionals.length > 0) lines.push(...command.positionals.map((p) => `- \`<${p.name}>\`${p.optional ? " (optional)" : ""}: ${p.description}${p.choices ? ` One of ${p.choices.map((c) => `\`${c}\``).join(", ")}.` : ""}`), "");
      if (command.stdin !== undefined) lines.push(`Input: none. ${command.stdin}`, "");
      else if (fields.length > 0) lines.push("Input (`--input`):", "", ...fields.map((f) => `- \`${f.name}\`: \`${f.type}\`, ${f.required ? "required" : f.default !== undefined ? `default \`${JSON.stringify(f.default)}\`` : "optional"}${f.description ? `. ${f.description}` : ""}`), "");
      const example = exampleOf(command);
      if (example.length > 0) lines.push("```sh", ...example, "```", "");
      const blocks = outputBlocks(command);
      if (blocks.length > 0) lines.push("Output (`--json`):", "", ...blocks.flatMap((block, i) => [...(blocks.length > 1 ? [`${block.label || (i === 0 ? "Either" : "Or")}:`, ""] : []), ...block.lines.map((l) => `- ${l}`), ""]));
      const effects = [command.effects.writes ? "writes in `.trama/`" : "", command.effects.activity ? "counts as the agent's activity" : "", command.effects.editor ? "sends messages to the editor" : ""].filter(Boolean);
      lines.push(`Runs ${command.mode === "immediate" ? "at once" : command.mode === "blocking" ? "and waits for the editor" : "as an agent hook"}${effects.length > 0 ? `; ${effects.join(", ")}` : "; read-only"}.`, "");
    }
  }
  return lines.join("\n").trimEnd();
}
