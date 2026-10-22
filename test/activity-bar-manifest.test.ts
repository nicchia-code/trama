import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../extension");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const contributes = manifest.contributes;

test("the Activity Bar has the Trama container with the logo, and one view shown when a folder is open", () => {
  expect(contributes.viewsContainers.activitybar).toEqual([{ id: "trama", title: "Trama", icon: "media/trama-icon-dark.svg" }]);
  expect(existsSync(join(root, "media/trama-icon-dark.svg"))).toBe(true);
  expect(contributes.views.trama).toEqual([{ id: "trama.home", name: "Trama", when: "workspaceFolderCount > 0" }]);
});

test("the view's welcome content is the sentence and the Open Trama button", () => {
  expect(contributes.viewsWelcome).toEqual([
    { view: "trama.home", contents: "Model, Board and Requirements of your project, in one panel.\n[Open Trama](command:trama.open)" },
  ]);
});

test("the trama-logo icon points to the committed one-glyph font", () => {
  const icon = contributes.icons["trama-logo"];
  expect(icon.description).toBe("Trama logo");
  expect(icon.default.fontCharacter).toBe("\\E000");
  const font = readFileSync(join(root, icon.default.fontPath));
  expect(font.subarray(0, 4).toString("latin1")).toBe("wOFF");
});

test("the editor title bar has no Open Trama icon, and Open Trama stays a command", () => {
  const titleCommands = contributes.menus["editor/title"].map((entry: { command: string }) => entry.command);
  expect(titleCommands).toEqual(["trama.sendDesignRequest"]);
  expect(contributes.commands.map((entry: { command: string }) => entry.command)).toContain("trama.open");
});
