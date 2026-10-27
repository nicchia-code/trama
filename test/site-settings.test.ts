import { expect, test } from "bun:test";
import manifest from "../extension/package.json";
import { SETTING_GROUPS, groupKeys } from "../extension/src/host/settings-schema";
import { describeSettings, renderInlineMarkdown, settingAnchor, settingHeadings } from "../site/src/lib/settings";

const groups = describeSettings(manifest);
const settings = groups.flatMap((g) => g.sections.flatMap((s) => s.settings));

test("the groups are the ones of the Settings tab, in its order, with Advanced cut into its subgroups", () => {
  expect(groups.map((g) => g.title)).toEqual(["omp", "Models", "Project", "Advanced"]);
  expect(groups.find((g) => g.title === "Advanced")?.sections.map((s) => s.title)).toEqual(["Appearance", "Drifts", "Agents", "omp Chat", "Notifications"]);
  expect(groups.find((g) => g.title === "Models")?.sections.map((s) => s.title)).toEqual([undefined]);
});

test("every setting of the extension's manifest is described once, in the order of the Settings tab, with its description", () => {
  const manifestKeys = Object.keys(manifest.contributes.configuration.properties).sort();
  expect(settings.map((s) => s.key).sort()).toEqual(manifestKeys);
  expect(settings.map((s) => s.key)).toEqual(SETTING_GROUPS.flatMap(groupKeys));
  for (const setting of settings) expect(setting.description).not.toBe("");
});

test("titles, types and defaults are shown as the Settings tab does", () => {
  const byKey = new Map(settings.map((s) => [s.key, s]));
  expect(byKey.get("trama.ompChatApproval")?.title).toBe("omp Chat Approval");
  expect(byKey.get("trama.maxParallelAgents")).toMatchObject({ title: "Max Parallel Agents", kind: "number, at least 1", defaultText: "20" });
  expect(byKey.get("trama.autoExit")).toMatchObject({ kind: "on / off", defaultText: "on" });
  expect(byKey.get("trama.ignoreInstructionFiles")).toMatchObject({ kind: "on / off", defaultText: "off" });
  expect(byKey.get("trama.ompPath")).toMatchObject({ kind: "text", defaultText: "empty" });
  expect(byKey.get("trama.skillsDir")).toMatchObject({ kind: "text", defaultText: ".agents/skills" });
  const approval = byKey.get("trama.ompChatApproval");
  expect(approval).toMatchObject({ kind: "choice", defaultText: "yolo" });
  expect(approval?.options.map((o) => o.value)).toEqual(["ask", "yolo"]);
  expect(approval?.options.every((o) => o.description !== "")).toBe(true);
});

test("the table of contents lists the groups, the subgroups and the settings right under a group", () => {
  const headings = settingHeadings(groups);
  expect(headings.filter((h) => h.depth === 2).map((h) => h.text)).toEqual(["omp", "Models", "Project", "Advanced"]);
  expect(headings.find((h) => h.slug === "group-omp-chat")).toEqual({ depth: 3, slug: "group-omp-chat", text: "omp Chat" });
  expect(headings.find((h) => h.slug === "trama.language")).toEqual({ depth: 3, slug: "trama.language", text: "Language" });
  expect(headings.find((h) => h.slug === "trama.theme")).toBeUndefined();
  expect(settingAnchor("omp Chat")).toBe("group-omp-chat");
});

test("the description's Markdown is escaped, then code, bold and links become tags", () => {
  expect(renderInlineMarkdown("Use `a<b` and **bold** text")).toBe("Use <code>a&lt;b</code> and <strong>bold</strong> text");
  expect(renderInlineMarkdown("See [ntfy](https://ntfy.sh) now")).toBe('See <a href="https://ntfy.sh">ntfy</a> now');
  expect(renderInlineMarkdown("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  expect(renderInlineMarkdown("[x](javascript:alert(1))")).toBe("[x](javascript:alert(1))");
});
