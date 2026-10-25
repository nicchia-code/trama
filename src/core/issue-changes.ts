import { relative } from "node:path";
import { textFingerprint } from "./compared";
import { referenceFingerprint, referenceText } from "./describe";
import { git, gitRun } from "./git";
import type { Issue } from "./issues";
import { normalizeLf } from "./line-endings";
import { buildProject, loadProject, resolves } from "./requirements";
import { SPECS_FILE } from "./specs";
import { type Project, REQUIREMENTS_PREFIX } from "./store";
import { changedReferences } from "./timeline";
import type { FileMap } from "./types";

/*
 * What changed under a published issue (`rules#developer.ASK_ISSUE_UPDATE`): the references whose text is not what it was when the issue was published or last commented, with
 * the text they had and the text they have, which is what the agent writes the comment from.
 */

/** A reference of an issue whose text changed. `earlier` is the text it had; `current` the text it has, null when the reference no longer exists. */
export interface ChangedReference {
  ref: string;
  /** The text at the moment of publication or of the last Comment update, when git has it (and it is the text the recorded fingerprint stands for); otherwise null. */
  earlier: string | null;
  current: string | null;
}

/**
 * The Model, Requirements and Specs files as the commit that was `HEAD` at `instant` (ISO 8601) had them, keyed like `readTracked`; null without git, without a commit before the
 * instant or when git does not answer. A project with Solo mode on keeps `.trama/` out of git: it has no such files, and the map is empty.
 */
export function trackedFilesAt(p: Project, instant: string): FileMap | null {
  const prefix = git(p.root, ["rev-parse", "--show-prefix"]);
  const commit = git(p.root, ["rev-list", "-1", `--before=${instant}`, "HEAD"])?.trim();
  if (prefix === null || commit === undefined || commit === "") return null;
  const base = `${prefix.trim()}${relative(p.root, p.dir).split("\\").join("/")}/`;
  const listed = git(p.root, ["ls-tree", "-r", "--name-only", "-z", commit, "--", `${base}model`, `${base}${REQUIREMENTS_PREFIX.replace(/\/$/, "")}`, `${base}${SPECS_FILE}`]);
  if (listed === null) return null;
  const files: FileMap = new Map();
  for (const path of listed.split("\0")) {
    if (path === "") continue;
    const inside = path.slice(base.length);
    if (inside.split("/").some((part) => part.startsWith("."))) continue;
    const shown = gitRun(p.root, ["show", `${commit}:${path}`]);
    if (!shown.ok) return null;
    files.set(inside.startsWith("model/") ? inside.slice("model/".length) : inside, normalizeLf(shown.stdout));
  }
  return files;
}

/**
 * The references of a published issue that changed since it was published or last commented, each with its earlier and its current text. Nothing for an issue that is not
 * published or has no changed reference. The earlier text is read from git only when it is the text the recorded fingerprint stands for: a different one would not be what the
 * person was told.
 */
export function changedSincePublishing(p: Project, issue: Issue): ChangedReference[] {
  const { data } = issue;
  if (data.state !== "published") return [];
  const now = loadProject(p);
  const current: Record<string, string> = {};
  for (const ref of data.refs) if (resolves(now, ref)) current[ref] = referenceFingerprint(now, ref);
  const changed = changedReferences(data.refs, data.texts, current);
  if (changed.length === 0) return [];
  const instant = data.updated ?? data.published;
  const files = instant === null ? null : trackedFilesAt(p, instant);
  const then = files === null ? null : buildProject(files);
  return changed.map((ref) => {
    const earlier = then !== null && resolves(then, ref) && textFingerprint(referenceText(then, ref)) === data.texts[ref] ? referenceText(then, ref) : null;
    return { ref, earlier, current: resolves(now, ref) ? referenceText(now, ref) : null };
  });
}
