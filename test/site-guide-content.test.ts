import { expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parse } from "yaml";
import { GUIDE_SECTIONS } from "../site/src/lib/guide";
import { scenePaths } from "../site/src/lib/screenshots";
import { normalizeLf } from "../src/core/line-endings";

const root = join(import.meta.dir, "..");
const guideDir = join(root, "site", "src", "content", "guide");

interface Page {
  id: string;
  data: Record<string, unknown>;
  body: string;
}

function readPages(dir: string): Page[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return readPages(path);
    if (!entry.name.endsWith(".md")) return [];
    const text = normalizeLf(readFileSync(path, "utf8"));
    const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
    if (!match) throw new Error(`${path} has no front matter`);
    return [{ id: relative(guideDir, path).split(sep).join("/").replace(/\.md$/, ""), data: parse(match[1] ?? "") as Record<string, unknown>, body: match[2] ?? "" }];
  });
}

const pages = readPages(guideDir);
const ids = new Set(pages.map((p) => p.id));

/** The prose of a page: no fenced code blocks, no inline code. */
function prose(body: string): string {
  return body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

interface Block {
  kind: "step" | "screenshot";
  title?: string;
  text?: string;
  scene: string;
  alt: string;
}

/** The `step` and `screenshot` blocks of a page, in order. */
function blocks(body: string): Block[] {
  return [...body.matchAll(/```(step|screenshot)\n([\s\S]*?)\n```/g)].map((m) => ({ kind: m[1] as Block["kind"], ...(parse(m[2] ?? "") as Omit<Block, "kind">) }));
}

/** The sentences of a step's text, without inline code and link targets. */
function sentences(text: string): string[] {
  return text
    .replace(/`[^`\n]*`/g, "x")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim() !== "");
}

const sceneNames = new Set([...readFileSync(join(root, "scripts", "screenshots", "scenes.ts"), "utf8").matchAll(/name: "([a-z0-9-]+)",?\s*(?:shows|\n)/g)].map((m) => m[1] as string));
const siteRoot = join(root, "site");
const stepSections = ["getting-started", "workflows"];

test("every page has a title, a description and an order, in one of the four section folders", () => {
  expect(pages.length).toBeGreaterThan(0);
  for (const page of pages) {
    expect(typeof page.data.title, page.id).toBe("string");
    expect(typeof page.data.description, page.id).toBe("string");
    expect(typeof page.data.order, page.id).toBe("number");
    expect(GUIDE_SECTIONS.map((s) => s.id), page.id).toContain(page.id.split("/")[0] as never);
  }
});

test("each section has its pages in a distinct order", () => {
  for (const section of GUIDE_SECTIONS) {
    const orders = pages.filter((p) => p.id.startsWith(`${section.id}/`)).map((p) => p.data.order);
    expect(orders.length, section.id).toBeGreaterThan(0);
    expect(new Set(orders).size, section.id).toBe(orders.length);
  }
});

test("the guide covers what the Requirements list", () => {
  const expected = [
    "getting-started/requirements",
    "getting-started/install",
    "getting-started/first-run",
    "getting-started/get-started",
    "concepts/model",
    "concepts/requirements-and-skills",
    "concepts/specs",
    "concepts/proposals-tasks-drifts",
    "concepts/board-and-history",
    "workflows/design",
    "workflows/review-proposals",
    "workflows/rework",
    "workflows/run-tasks",
    "workflows/scan",
    "workflows/drifts",
    "workflows/unify-drifts",
    "workflows/import",
    "workflows/start-from-scratch",
    "workflows/refine",
    "workflows/solo-mode",
    "workflows/manager-mode",
    "panel-and-settings/panel",
    "panel-and-settings/diagram",
    "panel-and-settings/omp-chat",
    "panel-and-settings/notifications",
    "panel-and-settings/settings",
  ];
  for (const id of expected) expect(ids.has(id), id).toBe(true);
});

test("the settings page is the one generated from the manifest, and the only one", () => {
  expect(pages.filter((p) => p.data.generated === "settings").map((p) => p.id)).toEqual(["panel-and-settings/settings"]);
});

test("internal links point at pages that exist, and images at files that exist, each with an alt text", () => {
  for (const page of pages) {
    for (const [, target] of page.body.matchAll(/\]\((\/[^)\s]*)\)/g)) {
      const path = target as string;
      if (path.startsWith("/guide/")) expect(ids.has(path.replace(/^\/guide\/|\/$/g, "")), `${page.id} → ${path}`).toBe(true);
      else if (path.startsWith("/docs-images/")) expect(existsSync(join(root, "docs", "images", path.slice("/docs-images/".length))), `${page.id} → ${path}`).toBe(true);
      else if (path.startsWith("/images/")) expect(existsSync(join(root, "site", "public", path.slice(1))), `${page.id} → ${path}`).toBe(true);
      else throw new Error(`${page.id} → ${path}: not a guide page, docs image or site image`);
    }
    for (const [, alt] of page.body.matchAll(/!\[([^\]]*)\]\(/g)) expect((alt as string).trim(), `${page.id} has an image without alt`).not.toBe("");
  }
});

test("links to files of the repository on GitHub point at files that exist", () => {
  for (const page of pages) {
    for (const [, path] of page.body.matchAll(/https:\/\/github\.com\/nicchia-code\/trama\/blob\/main\/([^)\s]+)/g)) {
      expect(existsSync(join(root, path as string)), `${page.id} → ${path}`).toBe(true);
    }
  }
});

test("the guide links the reference instead of copying it", () => {
  const all = pages.map((p) => p.body).join("\n");
  expect(all).toContain("github.com/nicchia-code/trama/blob/main/docs/cli.md");
  expect(all).toContain("github.com/nicchia-code/trama/blob/main/docs/model-format.md");
  expect(all).not.toMatch(/trama (model|proposal|task|drift|history) (show|list|new|edit|check) /);
});

test("pages never speak in the first person", () => {
  for (const page of pages) {
    expect(prose(page.body), page.id).not.toMatch(/\b(I|me|my|we|us|our|ours|let's)\b/);
  }
});

test("the pages of Getting started and Workflows are numbered steps, every step with its screenshot", () => {
  for (const page of pages.filter((p) => stepSections.includes(p.id.split("/")[0] ?? ""))) {
    const steps = blocks(page.body).filter((b) => b.kind === "step");
    expect(steps.length, `${page.id} has no steps`).toBeGreaterThan(0);
    // A step is one `step` block, which cannot be written without its scene and alt; a plain image would be a step without annotations.
    expect(page.body, `${page.id} has an image that is not an annotated screenshot`).not.toMatch(/!\[[^\]]*\]\(/);
    // No heading may stand in for a step.
    expect(page.body, `${page.id} writes its steps by hand`).not.toMatch(/^#{2,4} (Step \d|\d+[.)])/m);
    for (const step of steps) {
      expect(typeof step.title, `${page.id} has a step without a title`).toBe("string");
      expect((step.title ?? "").length, `${page.id}: the title of a step is short: "${step.title}"`).toBeLessThanOrEqual(48);
      expect(sentences(step.text ?? "").length, `${page.id}, step "${step.title}": one or two sentences`).toBeLessThanOrEqual(2);
    }
  }
});

test("every screenshot of the guide names a scene of the screenshots script, has an alt and has its images and annotations", () => {
  let used = 0;
  for (const page of pages) {
    for (const block of blocks(page.body)) {
      used++;
      expect(sceneNames.has(block.scene), `${page.id}: scene "${block.scene}" is not in scripts/screenshots/scenes.ts`).toBe(true);
      expect((block.alt ?? "").trim().length, `${page.id}: scene "${block.scene}" needs an alt that says what it shows`).toBeGreaterThan(20);
      const files = scenePaths(siteRoot, block.scene);
      for (const file of [files.light, files.dark, files.annotations]) expect(existsSync(file), `${page.id}: ${file} is missing`).toBe(true);
    }
  }
  expect(used).toBeGreaterThan(40);
});

test("no page of the guide mentions the demo or links it", () => {
  for (const page of pages) expect(page.body, page.id).not.toMatch(/demo/i);
});

test("the sentences of the steps never speak in the first person", () => {
  for (const page of pages) {
    for (const block of blocks(page.body)) {
      const text = `${block.title ?? ""} ${block.text ?? ""} ${block.alt}`.replace(/`[^`\n]*`/g, "");
      expect(text, `${page.id}: ${block.title ?? block.scene}`).not.toMatch(/\b(I|me|my|we|us|our|ours|let's)\b/);
    }
  }
});

test("the READMEs have the link to the guide right after the GIF, and no link to the demo", () => {
  for (const file of ["README.md", join("extension", "README.md")]) {
    const lines = normalizeLf(readFileSync(join(root, file), "utf8")).split("\n");
    const gif = lines.findIndex((l) => l.includes("demo.gif"));
    expect(gif, file).toBeGreaterThan(-1);
    expect(lines.slice(gif + 1).find((l) => l.trim() !== ""), file).toBe("**[Read the guide](https://nicchia-code.github.io/trama/)**");
    expect(lines.join("\n"), file).not.toMatch(/github\.io\/trama\/demo|try the demo/i);
  }
});
