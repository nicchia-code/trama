import { TramaError } from "../core/errors";
import { analyze, findPaths, lineage } from "../core/graph";
import { flattenStates, formatDiagnostic } from "../core/model";
import { receivers, resolveRef } from "../core/refs";
import type { Diagnostic, Machine, Model, State } from "../core/types";
import { bullets, dash, eventKey, firstLine, marker, modelNote, prose, type Result } from "./result";

function machineOf(model: Model, id: string): Machine {
  const machine = model.machines.get(id);
  if (!machine) throw new TramaError(`Unknown Machine "${id}"`);
  return machine;
}

export function systemView(model: Model): Result {
  const actors = [...model.actors.values()].sort((a, b) => a.id.localeCompare(b.id));
  const features = [...model.features.values()].sort((a, b) => a.id.localeCompare(b.id));
  const md = [
    `# ${model.system.name || "(unnamed System)"}`,
    "",
    model.system.description,
    "",
    "## Actors",
    bullets(actors.map((a) => `- **${a.id}**${dash(firstLine(a.description))}\n  - Events: ${a.events.map((e) => e.name).join(", ") || "_none_"}`)),
    "",
    "## Features",
    bullets(features.map((f) => `- **${f.id}**${dash(firstLine(f.description))}\n  - Machines: ${f.machines.join(", ") || "_none_"}`)),
    modelNote(model),
  ].join("\n");
  return {
    md,
    json: {
      name: model.system.name,
      description: model.system.description,
      actors: actors.map((a) => ({ id: a.id, description: a.description, events: a.events.map((e) => e.name) })),
      features: features.map((f) => ({ id: f.id, name: f.name, description: f.description, machines: f.machines })),
    },
  };
}

export function featureView(model: Model, id: string): Result {
  const feature = model.features.get(id);
  if (!feature) throw new TramaError(`Unknown Feature "${id}"`);
  const machines = feature.machines.map((m) => machineOf(model, m));
  const flows = new Map<string, { event: string; machine: string }>();
  for (const machine of machines)
    for (const state of flattenStates(machine.states))
      for (const t of state.transitions) flows.set(`${eventKey(t)}>${machine.id}`, { event: eventKey(t), machine: machine.id });
  const sorted = [...flows.values()].sort((a, b) => a.event.localeCompare(b.event) || a.machine.localeCompare(b.machine));
  const md = [
    `# ${feature.name} (feature \`${feature.id}\`)`,
    "",
    feature.description,
    "",
    "## Machines",
    bullets(machines.map((m) => `- **${m.id}**${dash(firstLine(m.description))}`)),
    "",
    "## Events reaching these Machines",
    bullets(sorted.map((f) => `- \`${f.event}\` → ${f.machine}`)),
    modelNote(model),
  ].join("\n");
  return { md, json: { id, name: feature.name, description: feature.description, machines: machines.map((m) => ({ id: m.id, description: m.description })), flows: sorted } };
}

function renderStates(states: State[], depth: number): string[] {
  const pad = "  ".repeat(depth);
  return states.flatMap((s) => [
    `${pad}- **${s.name}**${marker(s)}${dash(firstLine(s.description))}`,
    ...s.transitions.map((t) => `${pad}  - \`${eventKey(t)}\` → ${t.target}${prose(t)}`),
    ...renderStates(s.children, depth + 1),
  ]);
}

export function machineView(model: Model, id: string): Result {
  const machine = machineOf(model, id);
  const events = machine.events.map((e) => ({
    name: e.name,
    description: e.description,
    receivers: receivers(model, machine.id, e.name).map((r) => ({ machine: r.machine.id, state: r.state.name, target: r.transition.target, prose: r.transition.prose })),
  }));
  const md = [
    `# ${machine.name} (machine \`${machine.id}\`, feature \`${machine.feature}\`)`,
    "",
    machine.description,
    "",
    "## States",
    bullets(renderStates(machine.states, 0)),
    "",
    "## Events",
    bullets(
      events.map(
        (e) =>
          `- \`${machine.id}.${e.name}\`${dash(firstLine(e.description))}\n  - Received by: ${e.receivers.map((r) => `${r.machine}/${r.state} → ${r.target}`).join("; ") || "_nobody_"}`,
      ),
    ),
    modelNote(model),
  ].join("\n");
  return { md, json: { id, feature: machine.feature, name: machine.name, description: machine.description, states: machine.states, events } };
}

export function stateView(model: Model, ref: string): Result {
  const el = resolveRef(model, ref);
  if (el.kind !== "state") throw new TramaError(`"${ref}" is not a State reference (expected machine/State)`);
  const { machine, state } = el;
  // Show what leaves this State itself: its own Transitions plus those inherited from its parents.
  const own = lineage(machine, state).flatMap((source) => source.transitions.map((t) => ({ from: source.name, t })));
  const incoming: { from: string; t: (typeof own)[number]["t"]; viaInitial: boolean }[] = [];
  for (const other of flattenStates(machine.states))
    for (const t of other.transitions) {
      const target = flattenStates(machine.states).find((s) => s.name.toLowerCase() === t.target.toLowerCase());
      if (!target) continue;
      const chain: State[] = [target];
      for (let s = target; s.children.length > 0; ) {
        s = s.children.find((c) => c.initial) ?? (s.children[0] as State);
        chain.push(s);
      }
      if (chain.includes(state)) incoming.push({ from: other.name, t, viaInitial: target !== state });
    }
  const fmtOut = (o: (typeof own)[number]) => `- \`${eventKey(o.t)}\` → ${o.t.target}${prose(o.t)}${o.from === state.name ? "" : ` _(inherited from ${o.from})_`}`;
  const md = [
    `# ${machine.id}/${state.name}${marker(state)}`,
    "",
    state.description,
    "",
    `Parent: ${state.parent ?? "_top level_"}`,
    `Sub-States: ${state.children.map((c) => c.name).join(", ") || "_none_"}`,
    "",
    "## Outgoing Transitions",
    bullets(own.map(fmtOut)),
    "",
    "## Incoming Transitions",
    bullets(incoming.map((i) => `- ${machine.id}/${i.from}: \`${eventKey(i.t)}\`${i.viaInitial ? ` → ${i.t.target} _(enters this initial sub-State)_` : ""}${prose(i.t)}`)),
    modelNote(model),
  ].join("\n");
  return {
    md,
    json: {
      machine: machine.id,
      name: state.name,
      description: state.description,
      initial: state.initial,
      final: state.final,
      parent: state.parent,
      children: state.children.map((c) => c.name),
      outgoing: own.map((o) => ({ from: o.from, event: eventKey(o.t), target: o.t.target, prose: o.t.prose })),
      incoming: incoming.map((i) => ({ from: i.from, event: eventKey(i.t), target: i.t.target, prose: i.t.prose, entersInitialSubState: i.viaInitial })),
    },
  };
}

export function eventView(model: Model, ref: string): Result {
  const el = resolveRef(model, ref);
  if (el.kind !== "event") throw new TramaError(`"${ref}" is not an Event reference (expected owner.EVENT)`);
  const rec = receivers(model, el.owner.id, el.event.name);
  const kind = model.machines.has(el.owner.id) ? "Machine" : "Actor";
  const md = [
    `# \`${ref}\` (emitted by ${kind} \`${el.owner.id}\`)`,
    "",
    el.event.description,
    "",
    "## Transitions that react to it",
    bullets(rec.map((r) => `- ${r.machine.id}/${r.state.name} → ${r.transition.target}${prose(r.transition)}`)),
    modelNote(model),
  ].join("\n");
  return {
    md,
    json: {
      ref,
      owner: el.owner.id,
      ownerKind: kind.toLowerCase(),
      description: el.event.description,
      receivers: rec.map((r) => ({ machine: r.machine.id, state: r.state.name, target: r.transition.target, prose: r.transition.prose })),
    },
  };
}

export function pathsView(model: Model, machineId: string, from: string, to: string, max: number): Result {
  const machine = machineOf(model, machineId);
  const { paths, limited } = findPaths(machine, from, to, max);
  const body = paths.map((steps, i) => {
    const route = steps.map((s) => s.state).join(" → ");
    const detail = steps.flatMap((s, j) => (s.via ? [`   - ${steps[j - 1]?.state} —\`${s.via.event}\`→ ${s.state}${s.via.prose ? `: ${s.via.prose}` : ""}${s.via.source !== steps[j - 1]?.state ? ` _(declared on ${s.via.source})_` : ""}`] : []));
    return [`${i + 1}. ${route} (${steps.length - 1} step${steps.length === 2 ? "" : "s"})`, ...detail].join("\n");
  });
  const md = [
    `# Paths in \`${machineId}\`: ${from} → ${to}`,
    "",
    bullets(body, `_No path from "${from}" to "${to}"._`),
    limited ? `\n_Stopped after ${max} path(s); raise --max to see more._` : "",
  ].join("\n");
  return { md, json: { machine: machineId, from, to, limited, paths } };
}

export function analyzeView(model: Model, machineId?: string): Result {
  const warnings = analyze(model, machineId);
  const md = [
    `# Analysis${machineId ? ` of \`${machineId}\`` : ""}`,
    "",
    bullets(warnings.map((w) => `- [${w.kind}] ${w.message}`), "_No warnings._"),
    modelNote(model),
  ].join("\n");
  return { md, json: { warnings } };
}

export function searchView(model: Model, query: string): Result {
  const q = query.toLowerCase();
  const hits: { ref: string; kind: string; text: string }[] = [];
  const check = (ref: string, kind: string, ...texts: string[]) => {
    const hit = texts.find((t) => t.toLowerCase().includes(q));
    if (hit !== undefined) hits.push({ ref, kind, text: firstMatchingLine(hit, q) });
  };
  check("system", "system", model.system.name, model.system.description);
  for (const f of model.features.values()) check(f.id, "feature", f.id, f.name, f.description);
  for (const a of model.actors.values()) {
    check(a.id, "actor", a.id, a.name, a.description);
    for (const e of a.events) check(`${a.id}.${e.name}`, "event", e.name, e.description);
  }
  for (const m of model.machines.values()) {
    check(m.id, "machine", m.id, m.name, m.description);
    for (const e of m.events) check(`${m.id}.${e.name}`, "event", e.name, e.description);
    for (const s of flattenStates(m.states)) {
      check(`${m.id}/${s.name}`, "state", s.name, s.description);
      for (const t of s.transitions) check(`${m.id}/${s.name}/${eventKey(t)}`, "transition", t.prose, t.target);
    }
  }
  const md = [`# Search: ${query}`, "", bullets(hits.map((h) => `- \`${h.ref}\` (${h.kind})${dash(h.text)}`), "_No matches._")].join("\n");
  return { md, json: { query, hits } };
}

function firstMatchingLine(text: string, q: string): string {
  return text.split("\n").find((l) => l.toLowerCase().includes(q))?.trim() ?? text.trim();
}

export function validateView(diagnostics: Diagnostic[], subject: string): Result {
  const ok = diagnostics.length === 0;
  const md = ok ? `${subject} is valid.` : [`${subject} has ${diagnostics.length} error(s):`, "", ...diagnostics.map((d) => `- ${formatDiagnostic(d)}`)].join("\n");
  return { md, json: { valid: ok, errors: diagnostics }, exit: ok ? 0 : 1 };
}
