import type { ModelSuggestion } from "../../host/model-lists";
import type { ComboboxOption } from "../ui/combobox";
import type { ThemeSetting } from "../theme";
import type { SettingSchema, SettingsValues } from "../../host/settings-schema";
import type { ToWebview } from "../../protocol";
import { ompTooOldText } from "../../../../src/core/omp-version";

export interface SettingsGroup {
  title: string;
  /** The settings of the group that belong to no subgroup, in schema order. */
  settings: SettingSchema[];
  /** The subgroups (the ones of Advanced), in schema order, each with its settings. */
  subgroups: { title: string; settings: SettingSchema[] }[];
}

/** The settings grouped under their titles, in schema order: the group, then its subgroup when the setting has one. */
export function groupSettings(schema: readonly SettingSchema[]): SettingsGroup[] {
  const groups: SettingsGroup[] = [];
  for (const setting of schema) {
    let group = groups.find((g) => g.title === setting.group);
    if (group === undefined) groups.push((group = { title: setting.group, settings: [], subgroups: [] }));
    if (setting.subgroup === undefined) {
      group.settings.push(setting);
      continue;
    }
    let subgroup = group.subgroups.find((s) => s.title === setting.subgroup);
    if (subgroup === undefined) group.subgroups.push((subgroup = { title: setting.subgroup, settings: [] }));
    subgroup.settings.push(setting);
  }
  return groups;
}

/** What a field shows for the value the developer has in the user settings: the default when none is set. */
export const effectiveValue = (setting: SettingSchema, values: SettingsValues | undefined): unknown => values?.user ?? setting.default;

/** A whole-number field's text as a number; anything that is not a number (including empty) is NaN, which is never valid. */
export function numberFromText(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? NaN : Number(trimmed);
}

/** The text of the workspace-override notice, when the workspace value wins over the user's; null when nothing overrides it. */
export function workspaceOverride(setting: SettingSchema, values: SettingsValues | undefined): string | null {
  const workspace = values?.workspace;
  if (workspace === undefined || workspace === effectiveValue(setting, values)) return null;
  return workspace === "" ? "(empty)" : String(workspace);
}

/** The setting `trama.theme`: the key of the only setting of the Appearance group. */
export const THEME_KEY = "trama.theme";

/** The panel's theme setting from the user value: a value outside `auto`, `light` and `dark` counts as `auto`. */
export function themeSetting(value: unknown): ThemeSetting {
  return value === "light" || value === "dark" ? value : "auto";
}

/** The entries of a model field's list: the name typed in the field, and its readable name when it differs. */
export function modelOptions(models: readonly ModelSuggestion[]): ComboboxOption[] {
  return models.map((model) => (model.label !== undefined && model.label !== model.value ? { value: model.value, label: model.label } : { value: model.value }));
}

/** The Select entry of a model role that has no level: the model alone, which lets omp choose the level. */
export const DEFAULT_LEVEL = "Default";

/** The thinking levels omp declares for `model`, in omp's order; none when omp lists no such model or declares no level for it. */
export function thinkingLevels(models: readonly ModelSuggestion[], model: string): string[] {
  return models.find((entry) => entry.value === model)?.thinking ?? [];
}

/** A model role's value split into its model and its thinking level: the level is the text after the last `:`, and only when the model declares it. */
export function splitRoleValue(value: string, models: readonly ModelSuggestion[]): { model: string; level?: string } {
  const colon = value.lastIndexOf(":");
  if (colon > 0) {
    const model = value.slice(0, colon);
    const level = value.slice(colon + 1);
    if (thinkingLevels(models, model).includes(level)) return { model, level };
  }
  return { model: value };
}

/** A model role's value: the model, then `:` and the level when there is one. */
export function composeRoleValue(model: string, level?: string): string {
  return level === undefined ? model : `${model}:${level}`;
}

/** A model role's value as it reads: `<model> · <level>`, or the model alone when it has no level (Default). */
export function roleLabel(value: string, models: readonly ModelSuggestion[]): string {
  const { model, level } = splitRoleValue(value, models);
  return level === undefined ? model : `${model} · ${level}`;
}

/** The value a role takes when its model becomes `model`: the level stays only when the new model declares it too. */
export function withModel(value: string, model: string, models: readonly ModelSuggestion[]): string {
  const { level } = splitRoleValue(value, models);
  return composeRoleValue(model, level !== undefined && thinkingLevels(models, model).includes(level) ? level : undefined);
}

/** The host's `ompStatus` message without its type; null while nothing has arrived, which reads as checking. */
export type OmpStatus = Omit<Extract<ToWebview, { type: "ompStatus" }>, "type">;

/** Why omp does not answer, as the omp step of the wizard and the omp group of the Settings tab say it: the reason with one full stop, then what it means. */
export const ompFailureText = (error: string | undefined): string => `${(error ?? "omp did not answer").trimEnd().replace(/\.$/, "")}. Trama cannot work without omp.`;

/** What omp answered, in the wizard and in the Settings tab: its version and how many models it lists. */
export const ompAnsweredText = (version: string | undefined, models: number): string => `omp${version === undefined ? "" : ` ${version}`} answered with ${models} models.`;

/** The status box of the omp group: being checked, what omp answered (the version and the number of models), or the reason it does not (and `missing` for `Install omp`). */
export function ompStatusLine(status: OmpStatus | null): { tone: "checking" | "ok" | "warning"; text: string; missing: boolean } {
  if (status === null || status.state === "checking") return { tone: "checking", text: "Checking omp…", missing: false };
  // An omp older than the minimum says so in place of its version, and offers Install omp, which brings the current one.
  if (status.tooOld === true) return { tone: "warning", text: ompTooOldText(status.version), missing: true };
  if (status.error !== undefined || status.version === undefined) return { tone: "warning", text: ompFailureText(status.error), missing: status.missing === true };
  return { tone: "ok", text: ompAnsweredText(status.version, status.models ?? 0), missing: false };
}
