import { z } from "zod";
import { TramaError, UsageError } from "../../core/errors";
import { resolveRef } from "../../core/refs";
import { REQUIREMENTS_PREFIX, readTrackedFiles, type Project } from "../../core/store";
import { largeFragmentMessage, largeFragments, loadProject } from "../../core/requirements";
import type { Warning } from "../../core/graph";
import { actorView, checkView, eventView, featureView, machineView, modelWarnings, pathsView, searchView, stateView, systemView, transitionView } from "../explore";
import { requirementsView, withRequirements } from "../requirements";
import type { Result } from "../result";
import { defineCommand } from "../registry";

const text = z.string();
const receivers = z.array(z.object({ machine: text, state: text, target: text, prose: text })).describe("The Transitions that react to the Event.");
const event = z.object({ name: text, description: text, receivers });
const transitionLine = z.object({ target: text, prose: text });
const diagnostic = z.object({ file: text, line: z.number().int().describe("1-based; 0 means the whole file."), message: text });
const warning = z.object({ machine: text.nullable(), kind: text, subject: text, message: text });

/** Everything `model show` can print with `--json`, one object per kind of reference. */
const shown = z.union([
  z.object({ name: text, description: text, actors: z.array(z.object({ id: text, description: text, events: z.array(text) })), features: z.array(z.object({ id: text, name: text, description: text, machines: z.array(text) })) }).describe("The System (no reference)"),
  z.object({ id: text, name: text, description: text, machines: z.array(z.object({ id: text, description: text })), flows: z.array(z.object({ event: text, machine: text })) }).describe("A Feature"),
  z.object({ id: text, feature: text, name: text, description: text, states: z.array(z.looseObject({})).describe("The State tree."), events: z.array(event) }).describe("A Machine"),
  z.object({ id: text, name: text, description: text, events: z.array(event) }).describe("An Actor"),
  z.object({ machine: text, name: text, description: text, initial: z.boolean(), final: z.boolean(), parent: text.nullable(), children: z.array(text), outgoing: z.array(z.looseObject({})), incoming: z.array(z.looseObject({})) }).describe("A State"),
  z.object({ ref: text, machine: text, state: text, event: text, transitions: z.array(transitionLine) }).describe("A Transition"),
  z.object({ ref: text, owner: text, ownerKind: z.enum(["machine", "actor"]), description: text, receivers }).describe("An Event"),
  z.object({ machine: text, from: text, to: text, limited: z.boolean(), paths: z.array(z.array(z.looseObject({}))) }).describe("A State with `to`: the simple paths to another State"),
  z.object({ areas: z.array(z.looseObject({})) }).describe("`requirements`: the Areas"),
  z.looseObject({ id: text, title: text, description: text, sections: z.array(z.looseObject({})) }).describe("`requirements/<area>`: an Area in full"),
  z.object({ area: text, section: z.looseObject({}) }).describe("`requirements/<area>#<section>`: one section"),
]);

const isRequirementsRef = (ref: string): boolean => ref === "requirements" || ref.startsWith(REQUIREMENTS_PREFIX);

const show = defineCommand({
  object: "model",
  verb: "show",
  mode: "immediate",
  summary: "The System, or one element of the Model or its Requirements, with the Requirements that apply to it.",
  description:
    "Without a reference, the System: description, Actors and Features. With a Feature, a Machine, an Actor, a State (`machine/State`), a Transition (`machine/State/owner.EVENT`) or an Event (`owner.EVENT`), its view followed by the Requirements that apply to it. `requirements` lists the Areas and `requirements/<area>` shows a whole Area. On a State, `to` gives the simple paths from it to another State of the same Machine, the shortest first. Read-only; it never reads the code.",
  positionals: [{ name: "ref", optional: true, description: "A reference: `order`, `order/Paid`, `order/Paid/user.CANCEL`, `user.CANCEL`, `requirements` or `requirements/<area>`." }],
  input: z
    .strictObject({
      to: z.string().min(1).optional().describe("Only on a State: the name of another State of the same Machine; prints the simple paths from the State to it."),
      max: z.number().int().min(1).optional().describe("Only with `to`: the most paths to print (default 20)."),
    })
    .refine((input) => input.max === undefined || input.to !== undefined, { path: ["max"], message: "max applies only with to" }),
  output: shown,
  example: { to: "Shipped", max: 5 },
  exampleArgs: ["order/Paid"],
  run(ctx, input, [ref]): Result {
    const project = loadProject(ctx.project());
    const model = project.model;
    if (ref === undefined || isRequirementsRef(ref)) {
      if (input.to !== undefined) throw new UsageError("to applies only to a State: give a reference like machine/State");
      if (ref === undefined) return systemView(model);
      return requirementsView(project, ref === "requirements" ? undefined : ref);
    }
    const element = resolveRef(model, ref);
    if (input.to !== undefined && element.kind !== "state") throw new UsageError(`to applies only to a State: "${ref}" is not a State reference (machine/State)`);
    switch (element.kind) {
      case "feature":
        return withRequirements(featureView(model, element.ref), project, ref);
      case "machine":
        return withRequirements(machineView(model, element.ref), project, ref);
      case "actor":
        return withRequirements(actorView(model, element.ref), project, ref);
      case "state":
        if (input.to !== undefined) return withRequirements(pathsView(model, element.machine.id, element.state.name, input.to, input.max ?? 20), project, ref);
        return withRequirements(stateView(model, ref), project, ref);
      case "transition":
        return withRequirements(transitionView(element, model), project, ref);
      case "event":
        return withRequirements(eventView(model, ref), project, ref);
    }
  },
});

const list = defineCommand({
  object: "model",
  verb: "list",
  mode: "immediate",
  summary: "Search the names and the prose of the Model and of its Requirements.",
  description: "Case-insensitive match over the names and the prose of the whole Model and its Requirements; each hit with its reference. Read-only.",
  input: z.strictObject({ text: z.string().min(1).describe("The text to look for.") }),
  output: z.object({ query: text, hits: z.array(z.object({ ref: text, kind: text, text })) }),
  example: { text: "cancel" },
  run: (ctx, input) => searchView(loadProject(ctx.project()), input.text),
});

/** The warnings the Model gives besides errors: States that cannot be reached, dead ends, Events nobody receives, fragments larger than 12 KB. */
function warningsOf(project: Project, machine: string | undefined, loaded = loadProject(project)): Warning[] {
  const large = largeFragments(readTrackedFiles(project)).map((f): Warning => ({ machine: null, kind: "large-fragment", subject: f.file, message: `${f.file}: ${largeFragmentMessage(f)}` }));
  return modelWarnings(loaded.model, machine, large);
}

const check = defineCommand({
  object: "model",
  verb: "check",
  mode: "immediate",
  summary: "Errors and warnings of the Model and its Requirements.",
  description:
    "Reports the consistency errors of the Model and of the Requirements and, apart, the warnings: States that cannot be reached, dead ends, Events nobody receives and fragments larger than 12 KB. With a Machine, the warnings of the Model are only its own. Only errors change the exit code (1). It never checks the code.",
  positionals: [{ name: "machine", optional: true, description: "Limit the warnings of the Model to this Machine." }],
  input: z.strictObject({}),
  output: z.object({ valid: z.boolean().describe("False when there is any error."), errors: z.array(diagnostic), warnings: z.array(warning) }),
  run(ctx, _input, [machine]) {
    const project = ctx.project();
    const loaded = loadProject(project);
    if (machine !== undefined && !loaded.model.machines.has(machine)) throw new TramaError(`Unknown Machine "${machine}"`);
    return checkView(loaded.diagnostics, warningsOf(project, machine, loaded), machine);
  },
});

export const MODEL_COMMANDS = [show, list, check];
