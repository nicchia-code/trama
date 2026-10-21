import type { Change, MergedMachine, MergedState, MergedTransition } from "../../../../src/core/merge";
import type { AreaView, DriftView, ProposalView } from "../../../../src/core/snapshot";
import { type CardName, type CardNumbers, cardLabel, cardNameOf, noNumbers } from "../../../../src/core/card-names";
import { type UnresolvedRef, unresolvedRefs } from "./drifts";
import { type Element, refResolves, resolveElement } from "./elements";
import type { GEdge, GNode, GraphSpec, Level } from "./graph";
import { drillTarget } from "./levels";
import { flows, machineCount, stateCount } from "./overview";
import { type Scene, type SceneActor, findMergedState, pathTo } from "./scene";

export interface DetailItem {
  text: string;
  note: string;
  change: Change;
  /** Element the item can jump to. */
  ref: string | null;
  /** The note is a Markdown text rendered in full (paragraphs, lists, code blocks, quotes), not only inline. */
  block: boolean;
  /**
   * A card the item names, drawn as its number or identity tag after `label`: in place of the text, or of the note
   * when `inNote`. `text` and `note` keep the plain wording for tooltips.
   */
  card: { label: string; name: CardName; inNote: boolean } | null;
}

export interface DetailSection {
  heading: string;
  items: DetailItem[];
}

/** What the side panel shows, without any markup. */
export interface Detail {
  kind: string;
  title: string;
  change: Change;
  description: string;
  /** What the Proposal changes about this element. */
  changes: string[];
  sections: DetailSection[];
  /** Model file to open, relative to `.trama/model/`. */
  file: string | null;
  drill: Level | null;
  toggle: { state: string; expanded: boolean } | null;
  /** Shown with Approve and Reject: the selected element is a ghost of this Proposal, or none is selected. */
  proposal: ProposalView | null;
  /** Drawn by the panel as the comparison of what happens and what should happen, with a Keep this for each side. */
  drift: DriftView | null;
  /** The short numbers of the live cards, so the panel writes the cards it names the way the Board does. */
  numbers: CardNumbers;
}

const item = (text: string, extra: Partial<DetailItem> = {}): DetailItem => ({ text, note: "", change: "same", ref: null, block: false, card: null, ...extra });

function detail(init: Partial<Detail> & Pick<Detail, "kind" | "title">): Detail {
  return { change: "same", description: "", changes: [], sections: [], file: null, drill: null, toggle: null, proposal: null, drift: null, numbers: noNumbers, ...init };
}

const transitionItem = (t: MergedTransition): DetailItem => item(`${t.event.owner}.${t.event.name} → ${t.target}`, { note: t.prose, change: t.change, block: true });

/** Element references of the States that receive an Event, at any depth, each once. */
function receiverRefs(scene: Scene, event: string): string[] {
  return [...new Set(flows(scene).filter((f) => f.event === event).map((f) => {
    const machine = scene.machine.get(f.machine);
    return [f.machine, ...(machine ? pathTo(machine, f.state) : [f.state])].join("/");
  }))];
}

function receiversNote(scene: Scene, event: string): string {
  const who = receiverRefs(scene, event);
  return who.length > 0 ? `received by ${who.join(", ")}` : "nobody receives it";
}

/** At Machine level: each Event the Machine emits, then a link to each State that receives it. */
function emittedEventItems(scene: Scene, m: MergedMachine): DetailItem[] {
  return m.events.flatMap((e) => {
    const refs = receiverRefs(scene, `${m.id}.${e.name}`);
    const note = [e.description, refs.length > 0 ? "" : "nobody receives it"].filter(Boolean).join(" — ");
    return [item(e.name, { note, change: e.change }), ...refs.map((ref) => item(ref, { note: `receives ${e.name}`, ref }))];
  });
}

function eventItems(scene: Scene, owner: string, events: { name: string; description: string; change: Change }[]): DetailItem[] {
  return events.map((e) => item(e.name, { note: [e.description, receiversNote(scene, `${owner}.${e.name}`)].filter(Boolean).join(" — "), change: e.change }));
}

/** Lines the Proposal's file diff has about one Model file. */
function fileChanges(scene: Scene, path: string): string[] {
  return scene.proposal?.changes.find((c) => c.path === path)?.details ?? [];
}

const machineFile = (scene: Scene, m: MergedMachine) => scene.files.get(m.id) ?? `${m.feature}/${m.id}.md`;

function inherited(machine: MergedMachine, state: MergedState): DetailSection[] {
  const path = pathTo(machine, state.name).slice(0, -1);
  return path.flatMap((name): DetailSection[] => {
    const parent = findMergedState(machine, name);
    return parent && parent.transitions.length > 0 ? [{ heading: `Inherited from ${name}`, items: parent.transitions.map(transitionItem) }] : [];
  });
}

function actorDetail(scene: Scene, actor: SceneActor, change: Change): Detail {
  return detail({
    kind: "Actor",
    title: actor.name,
    change,
    description: actor.description,
    changes: fileChanges(scene, `actors/${actor.id}.md`),
    sections: [{ heading: "Events", items: eventItems(scene, actor.id, actor.events) }],
    file: change === "added" ? null : `actors/${actor.id}.md`,
  });
}

/** What the panel shows for an element; `node` says whether it can be drilled into where it is drawn, and `expandable` whether its States can be expanded in place (Machine level only). */
export function detailOfElement(scene: Scene, element: Element, node: GNode | null, expandable: boolean): Detail {
  switch (element.kind) {
    case "feature": {
      const f = element.feature;
      return detail({
        kind: "Feature",
        title: f.name,
        change: node?.change ?? f.change,
        description: f.description,
        sections: [{ heading: "Machines", items: f.machines.map((id) => item(id, { note: stateCount(scene.machine.get(id) as MergedMachine), change: (scene.machine.get(id) as MergedMachine).change, ref: id })) }],
        file: f.change === "added" ? null : `${f.id}/feature.md`,
        drill: { kind: "feature", feature: f.id },
      });
    }
    case "machine": {
      const m = element.machine;
      return detail({
        kind: "Machine",
        title: m.name,
        change: node?.change ?? m.change,
        description: m.description,
        changes: fileChanges(scene, machineFile(scene, m)),
        sections: [
          { heading: "States", items: m.states.map((s) => item(s.name, { note: [s.initial ? "initial" : "", s.final ? "final" : ""].filter(Boolean).join(", "), change: s.change, ref: `${m.id}/${s.name}` })) },
          { heading: "Events it emits", items: eventItems(scene, m.id, m.events) },
        ],
        file: scene.files.get(m.id) ?? null,
        drill: node?.external ? { kind: "feature", feature: m.feature } : { kind: "machine", machine: m.id },
      });
    }
    case "actor":
      return actorDetail(scene, element.actor, node?.change ?? element.actor.change);
    case "state": {
      const s = element.state;
      const m = element.machine;
      const marker = s.initial ? " (initial)" : s.final ? " (final)" : "";
      return detail({
        kind: `State${marker}`,
        title: s.name,
        change: node?.change ?? s.change,
        description: s.description,
        changes: s.changes.length > 0 ? [`changed: ${s.changes.join(", ")}`] : [],
        sections: [
          ...(s.transitions.length > 0 ? [{ heading: "Transitions", items: s.transitions.map(transitionItem) }] : []),
          ...inherited(m, s),
          ...(s.children.length > 0 ? [{ heading: "Sub-states", items: s.children.map((c) => item(c.name, { note: c.initial ? "initial" : c.final ? "final" : "", change: c.change, ref: `${m.id}/${c.name}` })) }] : []),
        ],
        file: scene.files.get(m.id) ?? null,
        drill: s.children.length > 0 && !node?.external ? { kind: "state", machine: m.id, state: s.name } : null,
        toggle: expandable && node && node.children > 0 && node.kind === "state" && !node.external ? { state: s.name, expanded: node.expanded } : null,
      });
    }
    case "transition":
      return detail({
        kind: "Transition",
        title: `${element.state.name} · ${element.owner}.${element.event}`,
        change: element.transitions.every((t) => t.change === element.transitions[0]?.change) ? (element.transitions[0]?.change ?? "same") : "changed",
        sections: [
          { heading: "Transitions", items: element.transitions.map(transitionItem) },
          ...inherited(element.machine, element.state),
        ],
        file: scene.files.get(element.machine.id) ?? null,
      });
    case "event": {
      const { owner } = element;
      return owner.kind === "actor" ? actorDetail(scene, owner.actor, owner.actor.change) : detailOfElement(scene, { kind: "machine", ref: owner.machine.id, machine: owner.machine }, node, expandable);
    }
  }
}

/** What the panel shows for an edge; `graph` supplies the labels of its ends. */
export function detailOfEdge(scene: Scene, graph: GraphSpec, edge: GEdge): Detail {
  const label = (id: string) => graph.nodes.find((n) => n.id === id)?.label ?? id;
  const flow = edge.kind === "flow";
  const machine = graph.level.kind === "machine" || graph.level.kind === "state" ? scene.machine.get(graph.level.machine) : undefined;
  return detail({
    kind: flow ? "Events" : "Transition",
    title: `${label(edge.source)} → ${label(edge.target)}${flow ? "" : ` · ${edge.label}`}`,
    change: edge.change,
    sections: [
      {
        heading: flow ? "Events" : "Transitions",
        items: edge.items.map((i) => (flow ? item(i.label, { note: i.text, change: i.change, block: true }) : item(`${i.label}: ${i.from} → ${i.to}`, { note: i.text, change: i.change, block: true }))),
      },
    ],
    file: machine ? (scene.files.get(machine.id) ?? null) : null,
  });
}

/** A Drift: the two sides it compares (drawn by the panel), what it points at (resolved or not) and its attached Proposal. */
export function detailOfDrift(scene: Scene, drift: DriftView): Detail {
  return detail({
    kind: `Drift ${cardLabel(scene.numbers, "drift", drift.id)}`,
    title: drift.title,
    description: "",
    sections: [
      {
        heading: "Points at",
        items: drift.refs.map((ref) => {
          const ok = refResolves(scene, ref);
          return item(ref, { note: ok ? "" : "no longer resolves", ref: ok ? ref : null });
        }),
      },
      ...(drift.notBlocking.length === 0 ? [] : [{ heading: "Not blocking", items: drift.notBlocking.map((f) => item(`${cardLabel(scene.numbers, "task", f.task)} ${f.title ?? "(no longer exists)"}`, { note: f.reason })) }]),
    ],
    drift,
  });
}

function actorEventSection(proposal: ProposalView): DetailSection[] {
  const items = proposal.actors.flatMap((a) => a.events.filter((e) => e.change !== "same").map((e) => item(`${a.id}.${e.name}`, { change: e.change })));
  return items.length > 0 ? [{ heading: "Actor Events changed by the Proposal", items }] : [];
}

function unresolvedSection(list: UnresolvedRef[], numbers: CardNumbers): DetailSection[] {
  return list.length > 0
    ? [{
        heading: "Unresolved Drift references",
        items: list.map((u) => item(u.ref, { note: `Drift ${cardLabel(numbers, "drift", u.drift)}`, card: { label: "Drift", name: cardNameOf(numbers, "drift", u.drift), inNote: true } })),
      }]
    : [];
}

/** What the panel shows when nothing is selected: the level itself, the drawn Proposal, stray Drift references. */
export function detailOfLevel(scene: Scene, level: Level): Detail {
  const unresolved = unresolvedSection(unresolvedRefs(scene), scene.numbers);
  const extra = [...(scene.proposal ? actorEventSection(scene.proposal) : []), ...unresolved];
  const proposal = scene.proposal;
  switch (level.kind) {
    case "system":
    case "whole":
      return detail({ kind: level.kind === "whole" ? "Whole System" : "System", title: scene.system.name, description: scene.system.description, sections: [{ heading: "Features", items: scene.features.map((f) => item(f.name, { note: machineCount(f.machines.length), change: f.change, ref: f.id })) }, ...extra], proposal });
    case "actor": {
      const a = scene.actor.get(level.actor);
      if (!a) return detail({ kind: "Actor", title: level.actor, sections: extra, proposal });
      const base = actorDetail(scene, a, a.change);
      return { ...base, sections: [...base.sections, ...extra], proposal };
    }
    case "feature": {
      const f = scene.feature.get(level.feature);
      return detail({ kind: "Feature", title: f?.name ?? level.feature, description: f?.description ?? "", sections: extra, proposal });
    }
    case "machine": {
      const m = scene.machine.get(level.machine);
      return detail({ kind: "Machine", title: m?.name ?? level.machine, description: m?.description ?? "", file: scene.files.get(level.machine) ?? null, sections: [...(m ? [{ heading: "Events it emits", items: emittedEventItems(scene, m) }] : []), ...extra], proposal });
    }
    case "state": {
      const m = scene.machine.get(level.machine);
      const s = m && findMergedState(m, level.state);
      return detail({
        kind: "State",
        title: s?.name ?? level.state,
        description: s?.description ?? "",
        file: scene.files.get(level.machine) ?? null,
        sections: [...(m && s ? [...(s.transitions.length > 0 ? [{ heading: "Transitions (apply to every sub-State)", items: s.transitions.map(transitionItem) }] : []), ...inherited(m, s)] : []), ...extra],
        proposal,
      });
    }
  }
}

/** The Requirement sections written for any of the Model references, in the order of the references, as items shown in full Markdown. */
export function requirementItems(areas: AreaView[], refs: string[]): DetailItem[] {
  return refs.flatMap((ref) =>
    areas.flatMap((a) =>
      a.fragments.flatMap((f) => f.sections)
        .filter((s) => s.ref !== null && s.text !== "" && s.ref.toLowerCase() === ref.toLowerCase())
        .map((s) => item(a.title, { note: s.text, ref: `requirements/${a.id}#${s.ref}`, block: true })),
    ),
  );
}

/** A Model container a State or a Transition takes its Requirements from, with the name its Requirements are headed by. */
export interface Container {
  ref: string;
  name: string;
}

/**
 * The containers a State or a Transition takes its Requirements from, besides its own: the States that contain it, its
 * Machine and its Feature, since a Requirement written for a container applies to everything it holds. A Transition's
 * source State counts too, as it contains the Transition.
 */
export function containersOf(scene: Scene, node: GNode | undefined, edge: GEdge | undefined): Container[] {
  const element = node?.ref ? resolveElement(scene, node.ref) : null;
  if (element?.kind === "state") return containersOfState(scene, element.machine, element.state.name, false);
  if (edge?.kind !== "transition") return [];
  const found = edge.refs.flatMap((ref) => {
    const [machineId, stateName] = ref.split("/");
    const machine = machineId ? scene.machine.get(machineId) : undefined;
    return machine && stateName ? containersOfState(scene, machine, stateName, true) : [];
  });
  return [...new Map(found.map((c) => [c.ref, c] as const)).values()];
}

function containersOfState(scene: Scene, machine: MergedMachine, state: string, withState: boolean): Container[] {
  const path = pathTo(machine, state);
  const states = (withState ? path : path.slice(0, -1)).reverse().map((name) => ({ ref: `${machine.id}/${name}`, name }));
  return [...states, { ref: machine.id, name: machine.name }, { ref: machine.feature, name: scene.feature.get(machine.feature)?.name ?? machine.feature }];
}

/**
 * What the panel shows for the selection: nothing selected gives the level, a Drift ghost its Drift, anything else its element or edge.
 * Elements the Proposal adds, removes or changes carry the Proposal for Approve and Reject.
 */
export function detailOfSelection(scene: Scene, graph: GraphSpec, selected: string | null): Detail {
  const n = graph.nodes.find((x) => x.id === selected);
  const edge = graph.edges.find((x) => x.id === selected);
  if (n?.drift) {
    const drift = scene.drifts.find((d) => d.id === n.drift);
    if (drift) return { ...detailOfDrift(scene, drift), numbers: scene.numbers };
  }
  const element = n?.ref ? resolveElement(scene, n.ref) : null;
  const found = n?.kind === "whole" ? detailOfLevel(scene, { kind: "whole" }) : element ? detailOfElement(scene, element, n ?? null, graph.level.kind === "machine") : edge ? detailOfEdge(scene, graph, edge) : null;
  if (!found) {
    const level = detailOfLevel(scene, graph.level);
    return { ...level, numbers: scene.numbers };
  }
  const proposal = scene.proposal && found.change !== "same" ? scene.proposal : null;
  return { ...found, drill: (n ? drillTarget(scene, graph, n.id) : null) ?? found.drill, proposal, numbers: scene.numbers };
}

/** Plain text for the tooltip of a node or an edge. */
export function tooltipOf(d: Detail): string {
  const lines = [d.title, ...(d.description ? [d.description] : [])];
  for (const s of d.sections) for (const i of s.items) lines.push(`• ${i.text}${i.note ? `: ${i.note}` : ""}`);
  return lines.slice(0, 12).join("\n");
}
