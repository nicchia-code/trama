import type { ModelSuggestion } from "../../host/model-lists";
import type { ComboboxOption } from "../ui/combobox";
import type { ThemeSetting } from "../theme";
import type { SettingSchema, SettingsValues } from "../../host/settings-schema";
import type { ToWebview } from "../../protocol";

/** The settings grouped under their titles, in schema order. */
export function groupSettings(schema: readonly SettingSchema[]): { title: string; settings: SettingSchema[] }[] {
  const groups: { title: string; settings: SettingSchema[] }[] = [];
  for (const setting of schema) {
    let group = groups.find((g) => g.title === setting.group);
    if (group === undefined) groups.push((group = { title: setting.group, settings: [] }));
    group.settings.push(setting);
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

/** The host's `ompStatus` message without its type; null while nothing has arrived, which reads as checking. */
export type OmpStatus = Omit<Extract<ToWebview, { type: "ompStatus" }>, "type">;

/** The line of the omp group: being checked, the version that answers, or the reason it does not (and `missing` for `Install omp`). */
export function ompStatusLine(status: OmpStatus | null): { tone: "checking" | "ok" | "warning"; text: string; missing: boolean } {
  if (status === null || status.state === "checking") return { tone: "checking", text: "Checking omp…", missing: false };
  if (status.error !== undefined || status.version === undefined) return { tone: "warning", text: `${status.error ?? "omp did not answer"}. Trama cannot work without omp.`, missing: status.missing === true };
  return { tone: "ok", text: `omp ${status.version}`, missing: false };
}
