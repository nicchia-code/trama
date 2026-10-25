import type { ArchiveResult, Briefing } from "../core/compare";
import { extent } from "../core/blocking";
import { codeFingerprint, splitCompared } from "../core/compared";
import { describeRef, referenceFingerprint, requirementsBlock } from "../core/describe";
import { loadProject } from "../core/requirements";
import { syncShortNumbers } from "../core/short-numbers";
import type { Project } from "../core/store";
import type { Drift, Task } from "../core/work";
import { analyzeView } from "./explore";
import type { Result } from "./result";

const quoteLines = (text: string) => text.split("\n").map((l) => `  > ${l}`).join("\n");

/** The text fingerprint of every reference a briefing covers, by the element each is recorded under. */
export function briefedTexts(b: Briefing): Record<string, string> {
  return Object.fromEntries(b.scope.map((ref) => [extent(b.project, ref).self, referenceFingerprint(b.project, ref)]));
}

/** The references of a pre-flight that a comparison on this code still has to check, and those already compared. */
export function preflightCompared(p: Project, refs: string[]): { remaining: string[]; already: string[] } {
  const project = loadProject(p);
  return splitCompared(p, project, refs, codeFingerprint(p.root), (key) => {
    try {
      return referenceFingerprint(project, key);
    } catch {
      return "unresolved";
    }
  });
}

/** The briefing of a comparison: references, what concerns them, and the analysis. */
export function briefingView(p: Project, b: Briefing, announcement: string): Result {
  const n = syncShortNumbers(p);
  const cardLine = (kind: "task" | "drift", card: Task | Drift) => ({ id: card.id, number: n.label(kind, card.id), title: card.title });
  const refs = b.scope.map((ref) => `- \`${ref}\`\n${quoteLines(describeRef(b.project, ref, true))}`);
  const requirements = requirementsBlock(b.project, b.scope, "none");
  const analysis = analyzeView(b.project.model, b.machine.id);
  const tasks = b.openTasks.map((t) => `- Task ${n.name("task", t.id)} (${t.data.column}): ${t.title}`);
  const drifts = b.openDrifts.map((d) => `- Drift ${n.name("drift", d.id)}: ${d.title}`);
  const closed = b.closedDrifts.map((d) => `- Drift ${n.name("drift", d.id)} (${d.data.resolution ?? "resolved"}): ${d.title}${d.data.note ? `\n${quoteLines(d.data.note)}` : ""}`);
  const md = [
    announcement,
    `## Machine \`${b.machine.id}\` (${b.machine.name})`,
    "### References",
    refs.join("\n"),
    ...(requirements === "" ? [] : ["### Requirements", requirements]),
    "### Analysis",
    analysis.md,
    "### Open Tasks on the same thing",
    tasks.join("\n") || "_None._",
    "### Open Drifts on the same thing",
    drifts.join("\n") || "_None._",
    "### Resolved or dismissed Drifts on the same references",
    closed.join("\n") || "_None._",
  ].join("\n\n");
  return {
    md,
    json: {
      announcement,
      machine: b.machine.id,
      scope: b.scope,
      warnings: analysis.json,
      openTasks: b.openTasks.map((t) => ({ ...cardLine("task", t), column: t.data.column })),
      openDrifts: b.openDrifts.map((d) => ({ ...cardLine("drift", d), refs: d.data.refs })),
      closedDrifts: b.closedDrifts.map((d) => ({ ...cardLine("drift", d), resolution: d.data.resolution, note: d.data.note })),
    },
  };
}

/** The cards `trama comparison move` wrote, with their identity, short number and title. */
export function archiveView(p: Project, comparisonId: string, result: ArchiveResult): Result {
  const n = syncShortNumbers(p);
  const tasks = result.tasks.map((t) => ({ id: t.id, number: n.label("task", t.id), title: t.title }));
  const drifts = result.drifts.map((d) => ({ id: d.id, number: n.label("drift", d.id), title: d.title, previous: d.data.previous[0] ?? null }));
  const lines = [
    ...tasks.map((t) => `- Task ${t.id}${t.number ? ` (${t.number})` : ""}: ${t.title}`),
    ...drifts.map((d) => `- Drift ${d.id}${d.number ? ` (${d.number})` : ""}: ${d.title}${d.previous === null ? "" : `; recurring, it follows Drift ${n.name("drift", d.previous)}`}`),
  ];
  const note = result.delivered ? "" : `\nNo comparison is waiting for ${comparisonId}: the cards are filed all the same.`;
  return { md: `Filed ${tasks.length} Task(s) and ${drifts.length} Drift(s)\n${lines.join("\n")}${note}`, json: { comparison: comparisonId, delivered: result.delivered, tasks, drifts } };
}
