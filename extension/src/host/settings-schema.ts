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

/** The five groups, in order; each lists its keys in order. Every key in the manifest must appear once. */
export const SETTING_GROUPS: readonly { title: string; keys: readonly string[] }[] = [
  { title: "Agent", keys: ["trama.agent", "trama.terminalLocation", "trama.autoExit", "trama.language"] },
  { title: "Models", keys: ["trama.analysis", "trama.scan", "trama.execution", "trama.maxParallelAgents"] },
  { title: "Drift autopilot", keys: ["trama.autoFixDrifts", "trama.autoFixCriticalDrifts"] },
  { title: "Runs", keys: ["trama.submitWhileRunning"] },
  { title: "Project", keys: ["trama.skillsDir"] },
];

/** The two settings the Drift autopilot menu writes: the delegation of non-critical Drifts, and the one of critical Drifts. */
export const DRIFT_KEY = "trama.autoFixDrifts";
export const CRITICAL_DRIFT_KEY = "trama.autoFixCriticalDrifts";

/** The three model roles: the Settings tab suggests the agent's model names for them. */
export const MODEL_ROLE_KEYS: readonly string[] = ["trama.analysis", "trama.scan", "trama.execution"];

/** The delegation the two checkboxes give, lowest to highest. */
export type DelegationMode = "disabled" | "enabled" | "yolo";
export const DELEGATION_ORDER: readonly string[] = ["disabled", "enabled", "yolo"];

/** The modal question that raising the delegation asks, by the mode it raises to. */
export const DELEGATION_QUESTIONS: Record<string, string> = {
  enabled: "Let the agent approve and fix non-critical Drifts on its own?",
  yolo: "Let the agent approve and fix every Drift on its own, critical ones included?",
};

/** What each level of the Drift autopilot menu grants: its explanation, and the detail of the confirmation when it is raised. */
export const DELEGATION_DESCRIPTIONS: Record<string, string> = {
  disabled: "Off: you decide on every Drift.",
  enabled: "The agent approves and fixes non-critical Drifts on its own; critical ones stay with you.",
  yolo: "The agent approves and fixes every Drift on its own, critical ones included.",
};

/** The delegation from the user values of the two checkboxes: only `true` counts, and critical Drifts alone grant nothing. */
export function delegationOf(autoFixDrifts: unknown, autoFixCriticalDrifts: unknown): DelegationMode {
  if (autoFixDrifts !== true) return "disabled";
  return autoFixCriticalDrifts === true ? "yolo" : "enabled";
}

/** Whether moving the delegation from `from` to `to` gives the agent more. */
export function raisesDelegation(from: string, to: string): boolean {
  return DELEGATION_ORDER.indexOf(to) > DELEGATION_ORDER.indexOf(from);
}

/** `trama.maxParallelAgents` → `Max Parallel Agents`; `trama.autoExit` → `Auto Exit`. */
export function settingTitle(key: string): string {
  return key
    .replace(/^trama\./, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** The settings in the manifest, grouped in `SETTING_GROUPS` order. A key of the manifest that no group lists is left out. */
export function settingsSchema(manifest: ManifestPackage | undefined): SettingSchema[] {
  const properties = manifest?.contributes?.configuration?.properties ?? {};
  const schema: SettingSchema[] = [];
  for (const group of SETTING_GROUPS) {
    for (const key of group.keys) {
      const property = properties[key];
      if (property === undefined) continue;
      const control: SettingControl = Array.isArray(property.enum)
        ? "enum"
        : property.type === "boolean"
          ? "boolean"
          : property.type === "integer" || property.type === "number"
            ? "integer"
            : "text";
      schema.push({
        key,
        group: group.title,
        title: settingTitle(key),
        control,
        ...(control === "enum" ? { values: property.enum, descriptions: property.enumDescriptions ?? [] } : {}),
        default: property.default,
        ...(property.minimum === undefined ? {} : { minimum: property.minimum }),
        ...(property.scope === undefined ? {} : { scope: property.scope }),
        markdown: property.markdownDescription ?? property.description ?? "",
      });
    }
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

/** What the host does for one Settings change: refused, or the writes to make after the developer confirms a raised delegation (`ask`). */
export type SettingPlan =
  | { ok: false; reason: string }
  | { ok: true; ask?: { question: string; detail: string }; writes: { key: string; value: SettingValue | undefined }[] };

/** The keys the Drift autopilot menu writes together: no other change may set them, so every raise goes through the menu's confirmation. */
const DELEGATION_KEYS: readonly string[] = [DRIFT_KEY, CRITICAL_DRIFT_KEY];

/** Plans a change to one setting. The delegation keys are refused: only the Drift autopilot menu changes them. */
export function planSettingChange(schema: readonly SettingSchema[], key: string, value: SettingValue): SettingPlan {
  const setting = schema.find((s) => s.key === key);
  if (setting === undefined) return { ok: false, reason: `Unknown Trama setting ${key}` };
  if (DELEGATION_KEYS.includes(key)) return { ok: false, reason: "Drift delegation is set with the Drift autopilot menu" };
  return { ok: true, writes: [{ key, value: storedValue(setting, value) }] };
}

/**
 * Plans the Drift autopilot menu's level from the user values (`user`). `enabled` sets Auto Fix Drifts alone, `yolo` sets both,
 * `disabled` clears both. Only the keys that change are written, in an order where the delegation never exceeds the level chosen.
 * Raising the delegation asks first; the detail is the explanation of the level chosen.
 */
export function planDelegationChange(user: (key: string) => unknown, mode: DelegationMode): SettingPlan {
  const drift = { key: DRIFT_KEY, value: mode === "disabled" ? undefined : true };
  const critical = { key: CRITICAL_DRIFT_KEY, value: mode === "yolo" ? true : undefined };
  const ordered = mode === "yolo" ? [drift, critical] : [critical, drift];
  const writes = ordered.filter((write) => (write.value === true) !== (user(write.key) === true));
  const before = delegationOf(user(DRIFT_KEY), user(CRITICAL_DRIFT_KEY));
  if (!raisesDelegation(before, mode)) return { ok: true, writes };
  return { ok: true, ask: { question: DELEGATION_QUESTIONS[mode] ?? "", detail: DELEGATION_DESCRIPTIONS[mode] ?? "" }, writes };
}
