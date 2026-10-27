import { SETTING_GROUPS, settingsSchema, type ManifestPackage, type SettingSchema } from "../../../extension/src/host/settings-schema";

/** One setting of the extension as the guide shows it. */
export interface SettingDoc {
  /** The key as the user settings file spells it, for example `trama.ompChatApproval`. */
  key: string;
  /** The title the Settings tab of the panel shows: `omp Chat Approval`. */
  title: string;
  /** The description, in Markdown. */
  description: string;
  /** A short name of the type: `on / off`, `text`, `number` or `choice`. */
  kind: string;
  /** The default as the Settings tab shows it: `on`, `off`, a number, `empty` for an empty text, or the value. */
  defaultText: string;
  /** The values of a choice, each with what it does. */
  options: { value: string; description: string }[];
}

/** A run of settings, under a subtitle when the group has subgroups (`Advanced`). */
export interface SettingSectionDoc {
  title?: string;
  settings: SettingDoc[];
}

/** One group of the Settings tab: `omp`, `Models`, `Project` or `Advanced`. */
export interface SettingGroupDoc {
  title: string;
  sections: SettingSectionDoc[];
}

function kindOf(setting: SettingSchema): string {
  switch (setting.control) {
    case "enum":
      return "choice";
    case "boolean":
      return "on / off";
    case "integer":
      return setting.minimum === undefined ? "number" : `number, at least ${setting.minimum}`;
    case "text":
      return "text";
  }
}

function defaultTextOf(setting: SettingSchema): string {
  if (setting.control === "boolean") return setting.default === true ? "on" : "off";
  if (setting.default === undefined || setting.default === null || setting.default === "") return "empty";
  return String(setting.default);
}

function describe(setting: SettingSchema): SettingDoc {
  return {
    key: setting.key,
    title: setting.title,
    description: setting.markdown,
    kind: kindOf(setting),
    defaultText: defaultTextOf(setting),
    options: (setting.values ?? []).map((value, i) => ({ value, description: setting.descriptions?.[i] ?? "" })),
  };
}

/**
 * Every setting of the extension in the groups, order and titles of the editor's Settings tab, with the description,
 * type and default of its manifest entry (`contributes.configuration`). It reads the very schema the Settings tab reads,
 * so the guide never disagrees with the editor.
 */
export function describeSettings(manifest: ManifestPackage): SettingGroupDoc[] {
  const byKey = new Map(settingsSchema(manifest).map((setting) => [setting.key, describe(setting)]));
  const pick = (keys: readonly string[]) => keys.flatMap((key) => byKey.get(key) ?? []);
  return SETTING_GROUPS.map((group) => {
    const sections: SettingSectionDoc[] = [];
    if (group.keys.length > 0) sections.push({ settings: pick(group.keys) });
    for (const subgroup of group.subgroups ?? []) sections.push({ title: subgroup.title, settings: pick(subgroup.keys) });
    return { title: group.title, sections };
  });
}

/** The description of a setting as HTML: the text is escaped, then `code`, **bold** and [links](https://…) are turned into tags. */
export function renderInlineMarkdown(markdown: string): string {
  return markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

/** The `id` of a group or subgroup heading: `omp Chat` → `group-omp-chat`. The settings themselves use their key. */
export function settingAnchor(title: string): string {
  return `group-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

/** The headings of the generated list for the page's table of contents: groups, subgroups and the settings that sit right under a group. */
export function settingHeadings(groups: readonly SettingGroupDoc[]): { depth: number; slug: string; text: string }[] {
  return groups.flatMap((group) => [
    { depth: 2, slug: settingAnchor(group.title), text: group.title },
    ...group.sections.flatMap((section) =>
      section.title
        ? [{ depth: 3, slug: settingAnchor(section.title), text: section.title }]
        : section.settings.map((setting) => ({ depth: 3, slug: setting.key, text: setting.title })),
    ),
  ]);
}
