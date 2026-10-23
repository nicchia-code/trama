import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../extension");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const contributes = manifest.contributes;

// Cursor refuses every extension container in the secondary sidebar ("reserved for Cursor's agent UI") and VS Code accepts it from 1.106: each editor
// gets its own container and view, both on one provider, and `trama.ompChatVisible` says which one is shown (`tech#omp-chat`).
test("each editor's omp Chat view has its own container with the Trama logo: the secondary sidebar, and the panel for Cursor", () => {
  expect(contributes.viewsContainers.secondarySidebar).toEqual([{ id: "trama-omp-chat-sidebar", title: "omp Chat", icon: "media/trama-icon-dark.svg" }]);
  expect(contributes.viewsContainers.panel).toEqual([{ id: "trama-omp-chat", title: "omp Chat", icon: "media/trama-icon-dark.svg" }]);
  expect(existsSync(join(root, "media/trama-icon-dark.svg"))).toBe(true);
});

test("each container holds one webview view, shown only while the context key names its editor", () => {
  expect(contributes.views["trama-omp-chat-sidebar"]).toEqual([{ id: "trama.ompChatSidebar", name: "omp Chat", type: "webview", when: "trama.ompChatVisible == 'sidebar'" }]);
  expect(contributes.views["trama-omp-chat"]).toEqual([{ id: "trama.ompChat", name: "omp Chat", type: "webview", when: "trama.ompChatVisible == 'panel'" }]);
});

test("the view's script is shipped in the package", () => {
  expect(readFileSync(join(root, ".vscodeignore"), "utf8")).toContain("!dist/omp-chat.js");
});
