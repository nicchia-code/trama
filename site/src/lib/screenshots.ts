import rough from "roughjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

/*
 * Annotated screenshots of the guide. A scene is named by its files: `public/screenshots/<scene>.light.png`,
 * `public/screenshots/<scene>.dark.png` and `src/content/screenshots/<scene>.json`. The marks of the JSON are drawn here, at
 * build time, with Rough.js into an inline SVG; the page loads no Rough.js. Everything in this file runs on the server
 * (the build), and throws when a scene is not whole, so the build fails instead of publishing a broken guide.
 */

/** The width of the SVG's own coordinate system; its height follows the image. A mark scales with the image it is on. */
const VIEW_WIDTH = 1000;
/** The time the marks of one screenshot take to draw, in milliseconds, whatever their number. */
const DRAW_TOTAL_MS = 1000;
/** A note is a few words: the most characters it may have, so it stays within a line and a half. */
const NOTE_MAX_CHARS = 60;

const percent = z.number();
const point = z.tuple([percent, percent]);
const box = { x: percent, y: percent, w: z.number().positive(), h: z.number().positive() };

const markSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string().min(1), type: z.literal("arrow"), from: point, to: point, bend: z.number().min(-0.6).max(0.6).optional() }).strict(),
  z.object({ id: z.string().min(1), type: z.literal("underline"), from: point, to: point }).strict(),
  z.object({ id: z.string().min(1), type: z.literal("ellipse"), ...box }).strict(),
  z.object({ id: z.string().min(1), type: z.literal("rectangle"), ...box }).strict(),
]);

const noteSchema = z
  .object({
    text: z.string().min(1).max(NOTE_MAX_CHARS),
    /** Where the note sits, in percent of the image: its left edge, centre or right edge (`align`) at `x`, its middle at `y`. */
    x: percent,
    y: percent,
    align: z.enum(["left", "center", "right"]).optional(),
    /** The mark the note belongs to: the note appears right after that mark is drawn. */
    mark: z.string().min(1),
    /** The screenshot behind the note is busy: the note gets a soft background of the page's colour. */
    busy: z.boolean().optional(),
  })
  .strict();

const annotationsSchema = z
  .object({
    /** The seed of the strokes; the scene's name when absent, so a scene's strokes never change between builds. */
    seed: z.number().int().optional(),
    marks: z.array(markSchema),
    notes: z.array(noteSchema),
  })
  .strict();

export type Mark = z.infer<typeof markSchema>;
export type Note = z.infer<typeof noteSchema>;
export type Annotations = z.infer<typeof annotationsSchema>;

export interface Scene {
  name: string;
  /** The size of both images, in pixels. */
  width: number;
  height: number;
  annotations: Annotations;
}

/** Where the files of the scenes live, for a site folder. */
export function scenePaths(siteRoot: string, scene: string) {
  return {
    light: join(siteRoot, "public", "screenshots", `${scene}.light.png`),
    dark: join(siteRoot, "public", "screenshots", `${scene}.dark.png`),
    annotations: join(siteRoot, "src", "content", "screenshots", `${scene}.json`),
  };
}

/** The size of a PNG file from its header. */
export function pngSize(bytes: Uint8Array, label: string): { width: number; height: number } {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || signature.some((b, i) => bytes[i] !== b)) throw new Error(`${label} is not a PNG image`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function readFileOrFail(path: string, scene: string, what: string): Buffer {
  try {
    return readFileSync(path);
  } catch {
    throw new Error(`Screenshot scene "${scene}": the ${what} is missing (${path})`);
  }
}

const SCENE_NAME = /^[a-z0-9][a-z0-9-]*$/;

/** Throws when a point or a box of a mark or note falls outside the image (0 to 100 percent in both directions). */
function checkInside(scene: string, label: string, points: readonly (readonly [number, number])[]): void {
  for (const [x, y] of points) {
    if (!(x >= 0 && x <= 100 && y >= 0 && y <= 100)) {
      throw new Error(`Screenshot scene "${scene}": ${label} has the point (${x}, ${y}) outside the image; points are percentages from 0 to 100`);
    }
  }
}

/** The annotations of a scene, checked: known mark ids, every note on a mark, every point inside the image. */
export function checkAnnotations(scene: string, value: unknown): Annotations {
  const parsed = annotationsSchema.safeParse(value);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    throw new Error(`Screenshot scene "${scene}": the annotations are not valid: ${problems}`);
  }
  const annotations = parsed.data;
  const ids = new Set<string>();
  for (const mark of annotations.marks) {
    if (ids.has(mark.id)) throw new Error(`Screenshot scene "${scene}": two marks have the id "${mark.id}"`);
    ids.add(mark.id);
    const label = `the ${mark.type} "${mark.id}"`;
    if (mark.type === "arrow" || mark.type === "underline") checkInside(scene, label, [mark.from, mark.to]);
    else checkInside(scene, label, [[mark.x, mark.y], [mark.x + mark.w, mark.y + mark.h]]);
  }
  annotations.notes.forEach((note, i) => {
    if (!ids.has(note.mark)) throw new Error(`Screenshot scene "${scene}": note ${i + 1} ("${note.text}") belongs to "${note.mark}", which is not a mark of the scene`);
    checkInside(scene, `note ${i + 1} ("${note.text}")`, [[note.x, note.y]]);
  });
  return annotations;
}

const cache = new Map<string, Scene>();

/** Reads and checks a scene: both images (same size, PNG) and the annotations. Throws, naming the scene, when anything is wrong. */
export function loadScene(siteRoot: string, name: string): Scene {
  if (!SCENE_NAME.test(name)) throw new Error(`Screenshot scene "${name}": a scene's name is lowercase letters, digits and hyphens`);
  const key = `${siteRoot}\0${name}`;
  const known = cache.get(key);
  if (known) return known;
  const paths = scenePaths(siteRoot, name);
  const light = pngSize(readFileOrFail(paths.light, name, "light image"), paths.light);
  const dark = pngSize(readFileOrFail(paths.dark, name, "dark image"), paths.dark);
  if (light.width !== dark.width || light.height !== dark.height) {
    throw new Error(`Screenshot scene "${name}": the light image is ${light.width}×${light.height} and the dark one ${dark.width}×${dark.height}; both must show the same layout`);
  }
  const text = readFileOrFail(paths.annotations, name, "file of annotations").toString("utf8");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new Error(`Screenshot scene "${name}": the file of annotations is not JSON (${(error as Error).message})`);
  }
  const scene: Scene = { name, width: light.width, height: light.height, annotations: checkAnnotations(name, raw) };
  cache.set(key, scene);
  return scene;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** A small stable hash of a text, for the seed of a scene that gives none. */
function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The strokes of one mark, as the `d` of SVG paths, in the coordinates of a `VIEW_WIDTH` wide drawing that is `height` tall. */
export function markPaths(mark: Mark, seed: number, height: number): string[] {
  const generator = rough.generator();
  const options = { seed, roughness: 1.4, bowing: 1.6, strokeWidth: 3, fixedDecimalPlaceDigits: 1 };
  const X = (x: number) => round1((x * VIEW_WIDTH) / 100);
  const Y = (y: number) => round1((y * height) / 100);
  const drawables = [];
  switch (mark.type) {
    case "ellipse":
      drawables.push(generator.ellipse(X(mark.x + mark.w / 2), Y(mark.y + mark.h / 2), X(mark.w), Y(mark.h), options));
      break;
    case "rectangle":
      drawables.push(generator.rectangle(X(mark.x), Y(mark.y), X(mark.w), Y(mark.h), options));
      break;
    case "underline":
      drawables.push(generator.line(X(mark.from[0]), Y(mark.from[1]), X(mark.to[0]), Y(mark.to[1]), options));
      break;
    case "arrow": {
      const fx = X(mark.from[0]);
      const fy = Y(mark.from[1]);
      const tx = X(mark.to[0]);
      const ty = Y(mark.to[1]);
      const dx = tx - fx;
      const dy = ty - fy;
      const length = Math.hypot(dx, dy) || 1;
      // The shaft bends a little: it goes through a middle point pushed to one side of the straight line.
      const bend = mark.bend ?? 0.12;
      const mx = fx + dx / 2 - (dy / length) * bend * length;
      const my = fy + dy / 2 + (dx / length) * bend * length;
      drawables.push(generator.curve([[fx, fy], [mx, my], [tx, ty]], options));
      // The head: two short strokes back from the tip, along the direction the shaft arrives with.
      const heading = Math.atan2(ty - my, tx - mx);
      const size = Math.min(26, length * 0.4);
      const wing = (side: number): [number, number] => [tx - size * Math.cos(heading + side * 0.5), ty - size * Math.sin(heading + side * 0.5)];
      drawables.push(generator.linearPath([wing(-1), [tx, ty], wing(1)], { ...options, seed: seed + 1 }));
      break;
    }
  }
  return drawables.flatMap((drawable) => generator.toPaths(drawable).map((path) => path.d));
}

export interface ScreenshotOptions {
  siteRoot: string;
  /** The site's base path, `/trama/`. */
  base: string;
  scene: string;
  alt: string;
  /** The first screenshot of a page that shows on the first screen loads at once; every other one loads lazily. */
  eager?: boolean;
}

/** The inline SVG of a scene's marks: one group per mark, in the order they draw. */
function marksSvg(scene: Scene): string {
  const height = round1((VIEW_WIDTH * scene.height) / scene.width);
  const { marks } = scene.annotations;
  const seed = scene.annotations.seed ?? hashSeed(scene.name);
  const slot = DRAW_TOTAL_MS / Math.max(1, marks.length);
  const groups = marks.map((mark, i) => {
    const paths = markPaths(mark, seed + i * 7, height)
      .map((d) => `<path d="${d}" pathLength="1"/>`)
      .join("");
    return `<g class="shot-mark" style="--start:${Math.round(i * slot)}ms;--dur:${Math.round(slot * 0.85)}ms">${paths}</g>`;
  });
  return `<svg class="shot-marks" viewBox="0 0 ${VIEW_WIDTH} ${height}" aria-hidden="true" focusable="false">${groups.join("")}</svg>`;
}

const TRANSLATE_X = { left: "0%", center: "-50%", right: "-100%" } as const;

/**
 * The markup of an annotated screenshot: the two images (the stylesheet shows the one of the site's theme), the marks, the
 * notes as an ordered list that follows the image in reading order, and the numbers the marks show when the notes move
 * under the image. `styles/shots.css` and `scripts/shots.ts` give it its look and behaviour.
 */
export function renderScreenshot(options: ScreenshotOptions): string {
  const { base, scene: name, alt, eager = false } = options;
  if (!alt.trim()) throw new Error(`Screenshot scene "${name}": every screenshot needs an alt text that says what it shows`);
  const scene = loadScene(options.siteRoot, name);
  const root = base.endsWith("/") ? base : `${base}/`;
  const slot = DRAW_TOTAL_MS / Math.max(1, scene.annotations.marks.length);
  const loading = eager ? "eager" : "lazy";
  const image = (theme: "light" | "dark") =>
    `<img class="shot-image shot-${theme}" src="${root}screenshots/${name}.${theme}.png" width="${scene.width}" height="${scene.height}" alt="${escapeHtml(alt)}" loading="${loading}" decoding="async"/>`;
  const notes = scene.annotations.notes.map((note) => {
    const index = scene.annotations.marks.findIndex((m) => m.id === note.mark);
    const at = Math.round(index * slot) + Math.round(slot * 0.85);
    const chars = Math.max(8, Math.ceil(note.text.length / 1.5));
    const style = `--x:${note.x};--y:${note.y};--tx:${TRANSLATE_X[note.align ?? "left"]};--at:${at}ms;--chars:${chars}`;
    return `<li class="shot-note${note.busy ? " shot-note-busy" : ""}" style="${style}">${escapeHtml(note.text)}</li>`;
  });
  const badges = scene.annotations.notes.map((note, i) => `<li class="shot-badge" style="--x:${note.x};--y:${note.y}">${i + 1}</li>`);
  return [
    `<figure class="shot" data-scene="${name}" style="--ratio:${scene.width}/${scene.height}">`,
    `<div class="shot-frame">`,
    `<button type="button" class="shot-open" aria-haspopup="dialog"><span class="sr-only">Enlarge screenshot: </span>${image("light")}${image("dark")}</button>`,
    marksSvg(scene),
    badges.length ? `<ol class="shot-badges" aria-hidden="true">${badges.join("")}</ol>` : "",
    `</div>`,
    notes.length ? `<ol class="shot-notes" aria-label="Notes on the screenshot">${notes.join("")}</ol>` : "",
    `</figure>`,
  ].join("");
}

/** The opening and closing markup of a step; the title is the step's heading (written by the caller, as it needs an id there). */
export const STEP_OPEN = `<section class="guide-step">`;
export const STEP_TEXT_OPEN = `<div class="guide-step-text">`;
export const STEP_TEXT_CLOSE = `</div>`;
export const STEP_CLOSE = `</section>`;
export const STEP_TITLE_CLASS = "guide-step-title";
