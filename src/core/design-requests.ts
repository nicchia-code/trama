import { existsSync, rmSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { type Project, writeFileEnsuringDir } from "./store";

/**
 * A written design request: the developer's Markdown in `requests/<id>.md` under `.trama/`, created empty by
 * Design… and deleted when the Proposal bound to it is handed over. It is never versioned.
 */
export const requestsDir = (p: Project) => join(p.dir, "requests");

/** The local date and time of creation with seconds, `YYYY-MM-DDTHH-MM-SS`, with `-2`, `-3`, … when taken. */
export const REQUEST_ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(?:-(?:[2-9]|[1-9]\d+))?$/;

/** The request ID for `date` without a suffix, in local time. */
export function requestStamp(date: Date): string {
  const two = (n: number) => String(n).padStart(2, "0");
  const day = `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
  return `${day}T${two(date.getHours())}-${two(date.getMinutes())}-${two(date.getSeconds())}`;
}

/** The file of request `id`, or undefined when `id` is not a request ID. */
export function requestFile(p: Project, id: string): string | undefined {
  return REQUEST_ID_PATTERN.test(id) ? join(requestsDir(p), `${id}.md`) : undefined;
}

export function requestExists(p: Project, id: string): boolean {
  const file = requestFile(p, id);
  return file !== undefined && existsSync(file);
}

/** The ID of the request stored at `file`, or undefined when `file` is not a request of this project. */
export function requestIdAt(p: Project, file: string): string | undefined {
  const rel = relative(requestsDir(p), file);
  if (rel.includes(sep) || !rel.endsWith(".md")) return undefined;
  const id = rel.slice(0, -3);
  return REQUEST_ID_PATTERN.test(id) ? id : undefined;
}

/**
 * Creates a new empty request named after `now` and returns its ID. The folder is created with a `.gitignore` that
 * ignores everything in it, so requests are never versioned.
 */
export function createRequest(p: Project, now: Date = new Date()): { id: string; file: string } {
  const dir = requestsDir(p);
  const ignore = join(dir, ".gitignore");
  if (!existsSync(ignore)) writeFileEnsuringDir(ignore, "*\n");
  const stamp = requestStamp(now);
  for (let n = 1; ; n++) {
    const id = n === 1 ? stamp : `${stamp}-${n}`;
    const file = join(dir, `${id}.md`);
    if (existsSync(file)) continue;
    writeFileEnsuringDir(file, "");
    return { id, file };
  }
}

/** Deletes the file of request `id`; true when there was one to delete. A file already gone is not an error. */
export function consumeRequest(p: Project, id: string): boolean {
  const file = requestFile(p, id);
  if (file === undefined || !existsSync(file)) return false;
  rmSync(file, { force: true });
  return true;
}

/** Nothing is left once spaces and line breaks are removed. */
export function isEmptyRequest(text: string): boolean {
  return text.trim() === "";
}

/**
 * The first level-one `#` heading outside code blocks, without the `#`s and the spaces around it; without one, the
 * first non-empty line, trimmed. Empty for an empty text.
 */
export function requestTitle(text: string): string {
  const lines = text.split(/\r?\n/);
  let fence: { char: string; length: number } | null = null;
  for (const line of lines) {
    let content = line;
    while (/^ {0,3}>[ \t]?/.test(content) || /^ {0,3}(?:[-+*]|\d+[.)])[ \t]+/.test(content)) {
      content = content.replace(/^ {0,3}>[ \t]?/, "").replace(/^ {0,3}(?:[-+*]|\d+[.)])[ \t]+/, "");
    }
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(content)?.[1];
    if (fence) {
      if (marker && marker[0] === fence.char && marker.length >= fence.length && content.trim() === marker) fence = null;
      continue;
    }
    if (marker) {
      fence = { char: marker[0] as string, length: marker.length };
      continue;
    }
    const heading = /^ {0,3}#(?:[ \t]+(.*))?$/.exec(content);
    if (heading) {
      const title = (heading[1] ?? "").replace(/[ \t]+#+[ \t]*$/, "").replace(/^#+$/, "").trim();
      if (title) return title;
    }
  }
  return lines.find((l) => l.trim() !== "")?.trim() ?? "";
}
