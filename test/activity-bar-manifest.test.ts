import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SHOW_COMMANDS } from "../extension/src/menu-protocol";

const root = join(import.meta.dir, "../extension");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const contributes = manifest.contributes;

test("the Activity Bar has the Trama container with the logo, and its one view is a webview shown in every window", () => {
  expect(contributes.viewsContainers.activitybar).toEqual([{ id: "trama", title: "Trama", icon: "media/trama-icon-dark.svg" }]);
  expect(existsSync(join(root, "media/trama-icon-dark.svg"))).toBe(true);
  expect(contributes.views.trama).toEqual([{ id: "trama.home", name: "Trama", type: "webview" }]);
});

test("the view has no welcome content any more, and no context key beyond omp Chat's", () => {
  expect(contributes.viewsWelcome).toBeUndefined();
  expect(JSON.stringify(contributes)).not.toContain("Open Trama](command");
  const keys = [...JSON.stringify(contributes).matchAll(/trama\.[A-Za-z]+Visible/g)].map((match) => match[0]);
  expect(new Set(keys)).toEqual(new Set(["trama.ompChatVisible"]));
});

test("the extension still starts when the editor has started and in a project folder; opening the view starts it implicitly", () => {
  expect(manifest.activationEvents).toEqual(["onStartupFinished", "workspaceContains:.trama/model/system.md"]);
});

test("the icon is a one-colour glyph the editor paints with the Activity Bar's colour", () => {
  const svg = readFileSync(join(root, "media/trama-icon-dark.svg"), "utf8");
  expect(new Set([...svg.matchAll(/fill="([^"]+)"/g)].map((match) => match[1]))).toEqual(new Set(["#000000"]));
});

test("the menu's script is shipped in the package and built by the build script", () => {
  expect(readFileSync(join(root, ".vscodeignore"), "utf8")).toContain("!dist/menu.js");
  const build = readFileSync(join(import.meta.dir, "../scripts/build-extension.ts"), "utf8");
  expect(build).toContain("extension/src/webview/menu/main.tsx");
  expect(build).toContain('naming: "menu.js"');
  expect(build).toContain('format: "iife"');
});

test("the six Show commands are in the palette under the Trama category, each running the view it names", () => {
  const commands = contributes.commands as { command: string; title: string; category: string }[];
  const shows = commands.filter((entry) => entry.command.startsWith("trama.show") && entry.command !== "trama.showActivities");
  expect(shows).toEqual([
    { command: "trama.showBoard", title: "Show Board", category: "Trama" },
    { command: "trama.showDiagram", title: "Show Diagram", category: "Trama" },
    { command: "trama.showRequirements", title: "Show Requirements", category: "Trama" },
    { command: "trama.showSpecs", title: "Show Specs", category: "Trama" },
    { command: "trama.showHistory", title: "Show History", category: "Trama" },
    { command: "trama.showSettings", title: "Show Settings", category: "Trama" },
  ]);
  expect(Object.keys(SHOW_COMMANDS)).toEqual(shows.map((entry) => entry.command));
  const hidden = contributes.menus.commandPalette.map((entry: { command: string }) => entry.command);
  for (const entry of shows) expect(hidden).not.toContain(entry.command);
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

test("the extension never runs a command that opens, closes or moves the sidebar or its views, but omp Chat's own", () => {
  const sources = ["host/main.ts", "host/controller.ts", "host/menu/view.ts", "host/menu/model.ts"].map((file) => readFileSync(join(root, "src", file), "utf8")).join("\n");
  expect(sources).not.toMatch(/workbench\.view\./);
  expect(sources).not.toMatch(/workbench\.action\.(toggle|focus|close|move)[A-Za-z]*(Side|Sidebar|Panel|Bar)/);
  expect(sources).not.toContain("trama.home.focus");
  // The only command of the menu that touches the editor's windows is the picker of a folder.
  const menu = readFileSync(join(root, "src/host/menu/view.ts"), "utf8");
  expect([...menu.matchAll(/executeCommand\("([^"]+)"/g)].map((match) => match[1])).toEqual(["workbench.action.files.openFolder"]);
});
