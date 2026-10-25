/**
 * The Trama settings as the Settings tab shows them. The schema (types, enum values, descriptions, defaults, minimum,
 * scope, Markdown text) is read at run time from the manifest's `contributes.configuration.properties`; this file only
 * assigns each key to a group and turns a manifest entry into a control. Pure: the webview and the host both import it.
 */

/** The shape of one `contributes.configuration.properties` entry that the Settings tab reads. */
export interface ManifestProperty {
  type?: string;
  enum?: string[];
  enumDescriptions?: string[];
  default?: unknown;
  minimum?: number;
  scope?: string;
  markdownDescription?: string;
  description?: string;
}

/** The part of the extension's `package.json` the Settings tab reads. */
export interface ManifestPackage {
  contributes?: { configuration?: { properties?: Record<string, ManifestProperty> } };
}

export type SettingControl = "enum" | "boolean" | "integer" | "text";
export type SettingValue = string | number | boolean;

export interface SettingSchema {
  key: string;
  /** The group's title, as shown above it. */
  group: string;
  /** The subgroup's title inside the group (the subgroups of `Advanced`), when the group has them. */
  subgroup?: string;
  /** Readable title, from the key without `trama.` (`trama.maxParallelAgents` → `Max Parallel Agents`). */
  title: string;
  control: SettingControl;
  /** Enum values; present when `control` is `enum`. */
  values?: string[];
  /** Explanation of each enum value, same order as `values`. */
  descriptions?: string[];
  default: unknown;
  minimum?: number;
  scope?: string;
  /** The manifest's `markdownDescription` (or `description`), rendered as Markdown. */
  markdown: string;
}

/** What the host knows of one setting: the user value, and the workspace value when the setting is not application-scoped. */
export interface SettingsValues {
  user?: unknown;
  workspace?: unknown;
}

/** A run of keys under a subtitle inside a group. */
export interface SettingSubgroup {
  title: string;
  keys: readonly string[];
}

/** A group of settings: its own keys, in order, then its subgroups, each with its keys. */
export interface SettingGroup {
  title: string;
  keys: readonly string[];
  subgroups?: readonly SettingSubgroup[];
}

/**
 * The four groups, in order, the single list the Settings tab and the setup wizard both read: `omp`, `Models`, `Project` and
 * `Advanced`, which is cut into the subgroups `Appearance`, `Drifts`, `Agents` and `omp Chat`. Every key in the manifest must appear once.
 */
export const SETTING_GROUPS: readonly SettingGroup[] = [
  { title: "omp", keys: ["trama.ompPath", "trama.terminalLocation", "trama.ignoreInstructionFiles", "trama.autoExit", "trama.language", "trama.systemCertificates"] },
  { title: "Models", keys: ["trama.analysis", "trama.scan", "trama.execution", "trama.maxParallelAgents"] },
  { title: "Project", keys: ["trama.skillsDir"] },
  {
    title: "Advanced",
    keys: [],
    subgroups: [
      { title: "Appearance", keys: ["trama.theme"] },
      { title: "Drifts", keys: ["trama.advisorScanner", "trama.asyncDriftResolver"] },
      { title: "Agents", keys: ["trama.parallelExecution", "trama.subagentsContextSharing", "trama.autoUpdateStaleProposals"] },
      { title: "omp Chat", keys: ["trama.ompChat", "trama.ompChatApproval", "trama.ompChatIntentTracing"] },
    ],
  },
];

/** Every key of a group, in order: its own keys, then those of each subgroup. */
export const groupKeys = (group: SettingGroup): string[] => [...group.keys, ...(group.subgroups ?? []).flatMap((subgroup) => subgroup.keys)];

/** Titles that the key does not give: the Settings tab and the wizard show the same one. */
const EXPLICIT_TITLES: Readonly<Record<string, string>> = {
  "trama.subagentsContextSharing": "Sub-agents Context Sharing",
  "trama.autoUpdateStaleProposals": "Auto-update Stale Proposals",
  "trama.ompChat": "omp Chat",
  "trama.ompChatApproval": "omp Chat Approval",
  "trama.ompChatIntentTracing": "omp Chat Intent Tracing",
};

/** The three model roles: the Settings tab suggests omp's model names for them. */
export const MODEL_ROLE_KEYS: readonly string[] = ["trama.analysis", "trama.scan", "trama.execution"];

/** `trama.maxParallelAgents` → `Max Parallel Agents`; `trama.autoExit` → `Auto Exit`. */
export function settingTitle(key: string): string {
  const explicit = EXPLICIT_TITLES[key];
  if (explicit !== undefined) return explicit;
  return key
    .replace(/^trama\./, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** The settings in the manifest, grouped in `SETTING_GROUPS` order. A key of the manifest that no group lists is left out. */
export function settingsSchema(manifest: ManifestPackage | undefined): SettingSchema[] {
  const properties = manifest?.contributes?.configuration?.properties ?? {};
  const schema: SettingSchema[] = [];
  const add = (key: string, group: string, subgroup: string | undefined): void => {
    const property = properties[key];
    if (property === undefined) return;
    const control: SettingControl = Array.isArray(property.enum)
      ? "enum"
      : property.type === "boolean"
        ? "boolean"
        : property.type === "integer" || property.type === "number"
          ? "integer"
          : "text";
    schema.push({
      key,
      group,
      ...(subgroup === undefined ? {} : { subgroup }),
      title: settingTitle(key),
      control,
      ...(control === "enum" ? { values: property.enum, descriptions: property.enumDescriptions ?? [] } : {}),
      default: property.default,
      ...(property.minimum === undefined ? {} : { minimum: property.minimum }),
      ...(property.scope === undefined ? {} : { scope: property.scope }),
      markdown: property.markdownDescription ?? property.description ?? "",
    });
  };
  for (const group of SETTING_GROUPS) {
    for (const key of group.keys) add(key, group.title, undefined);
    for (const subgroup of group.subgroups ?? []) for (const key of subgroup.keys) add(key, group.title, subgroup.title);
  }
  return schema;
}

/** Why `value` cannot be saved for this setting, or null when it conforms to the schema. */
export function settingValueError(setting: SettingSchema, value: unknown): string | null {
  switch (setting.control) {
    case "enum":
      return typeof value === "string" && (setting.values ?? []).includes(value) ? null : "Choose one of the listed values.";
    case "boolean":
      return typeof value === "boolean" ? null : "Choose yes or no.";
    case "integer":
      if (typeof value !== "number" || !Number.isInteger(value)) return setting.minimum === undefined ? "Enter a whole number." : `Enter a whole number of at least ${setting.minimum}.`;
      return setting.minimum === undefined || value >= setting.minimum ? null : `Enter a whole number of at least ${setting.minimum}.`;
    case "text":
      return typeof value === "string" ? null : "Enter text.";
  }
}

/** The value to store in the user settings: `undefined` removes it, which is what the default and an empty text mean. */
export function storedValue(setting: SettingSchema, value: SettingValue): SettingValue | undefined {
  const text = typeof value === "string" ? value.trim() : value;
  if (text === "" || text === setting.default) return undefined;
  return text;
}

/** What the host does for one Settings change: refused, or the writes to make. */
export type SettingPlan =
  | { ok: false; reason: string }
  | { ok: true; writes: { key: string; value: SettingValue | undefined }[] };

/** Plans a change to one setting: refused only for an unknown key. */
export function planSettingChange(schema: readonly SettingSchema[], key: string, value: SettingValue): SettingPlan {
  const setting = schema.find((s) => s.key === key);
  if (setting === undefined) return { ok: false, reason: `Unknown Trama setting ${key}` };
  return { ok: true, writes: [{ key, value: storedValue(setting, value) }] };
}
