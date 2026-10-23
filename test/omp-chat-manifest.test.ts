import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../extension");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const contributes = manifest.contributes;

test("omp Chat's view has its own container with the Trama logo, in the secondary sidebar only", () => {
  expect(contributes.viewsContainers.secondarySidebar).toEqual([{ id: "trama-omp-chat-sidebar", title: "omp Chat", icon: "media/trama-icon-dark.svg" }]);
  expect(contributes.viewsContainers.panel).toBeUndefined();
  expect(existsSync(join(root, "media/trama-icon-dark.svg"))).toBe(true);
});

test("the container holds one webview view, shown while the boolean context key is true", () => {
  expect(contributes.views["trama-omp-chat-sidebar"]).toEqual([{ id: "trama.ompChatSidebar", name: "omp Chat", type: "webview", when: "trama.ompChatVisible" }]);
  expect(contributes.views["trama-omp-chat"]).toBeUndefined();
});

test("the view's script is shipped in the package", () => {
  expect(readFileSync(join(root, ".vscodeignore"), "utf8")).toContain("!dist/omp-chat.js");
});
