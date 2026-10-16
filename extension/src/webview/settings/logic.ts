import { CRITICAL_DRIFT_KEY, DRIFT_KEY, type SettingSchema, type SettingsValues } from "../../host/settings-schema";

/** Whether another setting disables this control: Auto Fix Critical Drifts stays disabled while Auto Fix Drifts is not on. */
export const disabledBy = (setting: SettingSchema, values: Record<string, SettingsValues | undefined>): boolean =>
  setting.key === CRITICAL_DRIFT_KEY && values[DRIFT_KEY]?.user !== true;

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
