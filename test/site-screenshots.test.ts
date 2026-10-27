import { afterAll, beforeAll, expect, test } from "bun:test";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkAnnotations, type Mark, loadScene, markPaths, renderScreenshot, scenePaths } from "../site/src/lib/screenshots";
import { remarkScreenshots } from "../site/src/plugins/remark-screenshots";
import { initShots, openEnlarged } from "../site/src/scripts/shots";

/** The first 24 bytes of a PNG: signature, the IHDR chunk's length and name, and its width and height. */
function png(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

const annotations = {
  marks: [
    { id: "menu", type: "ellipse", x: 10, y: 20, w: 20, h: 10 },
    { id: "pointer", type: "arrow", from: [60, 50], to: [35, 28] },
    { id: "line", type: "underline", from: [10, 80], to: [40, 80] },
    { id: "area", type: "rectangle", x: 50, y: 60, w: 30, h: 20 },
  ],
  notes: [
    { text: "Click the Trama icon", x: 62, y: 52, mark: "pointer" },
    { text: "The views", x: 20, y: 85, align: "center", mark: "line", busy: true },
  ],
};

let root: string;

function writeScene(name: string, options: { dark?: Buffer | null; light?: Buffer | null; json?: unknown } = {}): void {
  const paths = scenePaths(root, name);
  mkdirSync(join(root, "public", "screenshots"), { recursive: true });
  mkdirSync(join(root, "src", "content", "screenshots"), { recursive: true });
  if (options.light !== null) writeFileSync(paths.light, options.light ?? png(1440, 900));
  if (options.dark !== null) writeFileSync(paths.dark, options.dark ?? png(1440, 900));
  if (options.json !== null) writeFileSync(paths.annotations, JSON.stringify(options.json ?? annotations));
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "trama-shots-"));
  writeScene("menu");
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

test("a scene is read with the size of its images and its annotations", () => {
  const scene = loadScene(root, "menu");
  expect([scene.width, scene.height, scene.annotations.marks.length, scene.annotations.notes.length]).toEqual([1440, 900, 4, 2]);
});

test("the build fails, naming the scene, when an image or the file of annotations is missing", () => {
  writeScene("no-dark", { dark: null });
  writeScene("no-light", { light: null });
  writeScene("no-json", { json: null });
  expect(() => loadScene(root, "no-dark")).toThrow(/scene "no-dark": the dark image is missing/);
  expect(() => loadScene(root, "no-light")).toThrow(/scene "no-light": the light image is missing/);
  expect(() => loadScene(root, "no-json")).toThrow(/scene "no-json": the file of annotations is missing/);
  expect(() => loadScene(root, "never-made")).toThrow(/scene "never-made"/);
});

test("the two images of a scene must have the same size", () => {
  writeScene("sizes", { dark: png(1440, 800) });
  expect(() => loadScene(root, "sizes")).toThrow(/1440×900 and the dark one 1440×800/);
});

test("a point outside the image fails the build", () => {
  expect(() => checkAnnotations("x", { marks: [{ id: "a", type: "arrow", from: [10, 10], to: [101, 20] }], notes: [] })).toThrow(/outside the image/);
  expect(() => checkAnnotations("x", { marks: [{ id: "a", type: "arrow", from: [-1, 10], to: [10, 20] }], notes: [] })).toThrow(/outside the image/);
  expect(() => checkAnnotations("x", { marks: [{ id: "r", type: "rectangle", x: 80, y: 10, w: 30, h: 10 }], notes: [] })).toThrow(/the rectangle "r".*outside the image/);
  expect(() => checkAnnotations("x", { marks: [{ id: "a", type: "ellipse", x: 1, y: 1, w: 5, h: 5 }], notes: [{ text: "n", x: 50, y: 120, mark: "a" }] })).toThrow(/note 1.*outside the image/);
});

test("the annotations are checked: marks of a known kind, unique ids, notes on a mark, short notes", () => {
  expect(() => checkAnnotations("x", { marks: [{ id: "a", type: "star", x: 1, y: 1 }], notes: [] })).toThrow(/not valid/);
  expect(() => checkAnnotations("x", { marks: [{ id: "a", type: "ellipse", x: 1, y: 1, w: 2, h: 2 }, { id: "a", type: "ellipse", x: 1, y: 1, w: 2, h: 2 }], notes: [] })).toThrow(/two marks have the id "a"/);
  expect(() => checkAnnotations("x", { marks: [], notes: [{ text: "n", x: 1, y: 1, mark: "ghost" }] })).toThrow(/"ghost", which is not a mark/);
  expect(() => checkAnnotations("x", { marks: [{ id: "a", type: "ellipse", x: 1, y: 1, w: 2, h: 2 }], notes: [{ text: "word ".repeat(20), x: 1, y: 1, mark: "a" }] })).toThrow(/not valid/);
});

test("the strokes come from a fixed seed: the same marks always give the same paths, and the arrow bends", () => {
  const arrow: Mark = { id: "a", type: "arrow", from: [10, 10], to: [50, 40] };
  const first = markPaths(arrow, 5, 625);
  expect(markPaths(arrow, 5, 625)).toEqual(first);
  expect(markPaths(arrow, 6, 625)).not.toEqual(first);
  expect(first.length).toBeGreaterThanOrEqual(2);
  expect(renderScreenshot({ siteRoot: root, base: "/trama/", scene: "menu", alt: "x" })).toBe(renderScreenshot({ siteRoot: root, base: "/trama/", scene: "menu", alt: "x" }));
});

test("the markup has both images with their size, lazy loading, the marks as inline SVG and the notes in order", () => {
  const html = renderScreenshot({ siteRoot: root, base: "/trama/", scene: "menu", alt: "VS Code with the Trama menu <open>" });
  expect(html).toContain('src="/trama/screenshots/menu.light.png" width="1440" height="900" alt="VS Code with the Trama menu &lt;open&gt;" loading="lazy"');
  expect(html).toContain('src="/trama/screenshots/menu.dark.png"');
  expect(html.match(/<g class="shot-mark"/g)?.length).toBe(4);
  expect(html).toContain('viewBox="0 0 1000 625"');
  expect(html).not.toContain("rough");
  expect(html.indexOf("Click the Trama icon")).toBeLessThan(html.indexOf("The views"));
  expect(html.match(/class="shot-badge"/g)?.length).toBe(2);
  expect(html).toContain("shot-note-busy");
  expect(html.indexOf("<img")).toBeLessThan(html.indexOf("<ol"));
  expect(renderScreenshot({ siteRoot: root, base: "/trama/", scene: "menu", alt: "x", eager: true })).toContain('loading="eager"');
});

test("a screenshot without an alt text fails the build", () => {
  expect(() => renderScreenshot({ siteRoot: root, base: "/trama/", scene: "menu", alt: " " })).toThrow(/alt text/);
});

async function renderPage(markdown: string): Promise<string> {
  const processor = await createMarkdownProcessor({ syntaxHighlight: false, remarkPlugins: [[remarkScreenshots as never, { base: "/trama/", root }]] });
  return (await processor.render(markdown)).code;
}

test("a screenshot block and a step block of a Markdown page become the components' markup", async () => {
  const html = await renderPage(
    ["Intro.", "", "```step", "title: Open the menu", "text: |", "  Click the **Trama** icon.", "scene: menu", "alt: The menu", "eager: true", "```", "", "```screenshot", "scene: menu", "alt: Again", "```"].join("\n"),
  );
  expect(html).toContain('<section class="guide-step">');
  expect(html).toMatch(/<h3 class="guide-step-title" id="open-the-menu">Open the menu<\/h3>/);
  expect(html).toMatch(/<div class="guide-step-text">\s*<p>Click the <strong>Trama<\/strong> icon\.<\/p>\s*<\/div>/);
  expect(html.match(/<figure class="shot"/g)?.length).toBe(2);
  expect(html.match(/loading="eager"/g)?.length).toBe(2);
  expect(html).not.toContain("```");
});

test("a page that names a scene without its files, or leaves a field out, fails the build", async () => {
  await expect(renderPage("```screenshot\nscene: nowhere\nalt: x\n```")).rejects.toThrow(/scene "nowhere"/);
  await expect(renderPage("```screenshot\nscene: menu\n```")).rejects.toThrow(/alt/);
  await expect(renderPage("```step\ntitle: T\nscene: menu\nalt: x\n```")).rejects.toThrow(/text/);
});

function mount(): { figure: HTMLElement; button: HTMLButtonElement } {
  document.body.innerHTML = renderScreenshot({ siteRoot: root, base: "/trama/", scene: "menu", alt: "The menu" });
  return { figure: document.querySelector<HTMLElement>(".shot")!, button: document.querySelector<HTMLButtonElement>(".shot-open")! };
}

test("a screenshot opens enlarged in a dialog with its marks and notes, and the × closes it and gives the focus back", () => {
  const { button } = mount();
  button.focus();
  openEnlarged(button);
  const dialog = document.querySelector<HTMLDialogElement>("dialog.shot-dialog")!;
  expect(dialog.open).toBe(true);
  expect(dialog.querySelectorAll(".shot-marks g").length).toBe(4);
  expect(dialog.querySelectorAll(".shot-note").length).toBe(2);
  expect(dialog.querySelector(".shot-open")).toBeNull();
  expect(dialog.querySelector(".shot")?.classList.contains("shot-static")).toBe(true);
  expect(dialog.getAttribute("aria-label")).toBe("The menu");
  dialog.querySelector<HTMLButtonElement>(".shot-close")!.click();
  expect(dialog.open).toBe(false);
  expect(dialog.querySelector(".shot")).toBeNull();
  expect(document.activeElement).toBe(button);
});

test("a click on the dimmed page around the dialog closes it", () => {
  const { button } = mount();
  openEnlarged(button);
  const dialog = document.querySelector<HTMLDialogElement>("dialog.shot-dialog")!;
  dialog.querySelector<HTMLElement>(".shot-note")!.click();
  expect(dialog.open).toBe(true);
  dialog.click();
  expect(dialog.open).toBe(false);
});

test("a click on a screenshot opens it, once the page is started", () => {
  const { button } = mount();
  initShots();
  button.click();
  expect(document.querySelector<HTMLDialogElement>("dialog.shot-dialog")?.open).toBe(true);
  document.querySelector<HTMLDialogElement>("dialog.shot-dialog")!.close();
});
