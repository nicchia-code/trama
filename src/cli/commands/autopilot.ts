import { z } from "zod";
import { TramaError } from "../../core/errors";
import { requestCoordinatorMessage } from "../../core/question-channel";
import { jobFromEnv } from "../context";
import { defineCommand } from "../registry";

const create = defineCommand({
  object: "autopilot",
  verb: "show",
  mode: "blocking",
  summary: "The editor coordinator's autopilot status.",
  description:
    "Asks the project's coordinator in the editor and reads the answer: the delegation's mode, the phase of the coordination, the reason it waits or failed, the collection and its Proposal when there are any, and the permanent IDs of the Drifts and Tasks authorized. `status` tells an unavailable coordinator (`unavailable`) from a delegation that is off (`disabled`); neither shows an authorization. With `job` (or `TRAMA_JOB` in the terminal Trama started) it returns the scope currently authorized for that job and no other; without a job it shows the state for the developer, with no `drifts` or `tasks` an agent could use. Read-only. Reread it before each choice: the delegation can change while the agent works.",
  input: z.strictObject({ job: z.string().refine((value) => value.trim() !== "", "must not be blank").optional().describe("The job whose authorized scope is wanted. Default: `TRAMA_JOB`.") }),
  output: z.object({
    status: z.enum(["unavailable", "disabled", "available"]),
    mode: z.string().optional().describe("`disabled`, `enabled` or `yolo`."),
    phase: z.string().optional(),
    reason: z.string().optional().describe("Why the coordination waits or failed."),
    collection: z.string().optional().describe("The collection being resolved."),
    proposal: z.string().optional().describe("The resolution Proposal of the collection."),
    remoteWindow: z.boolean().optional().describe("Work is active in another editor window."),
    lastFailedScan: z.string().optional(),
    failures: z.array(z.string()).optional(),
    drifts: z.array(z.string()).describe("Permanent IDs of the Drifts authorized for the job."),
    tasks: z.array(z.string()).describe("Permanent IDs of the Tasks authorized for the job."),
  }),
  example: { job: "job-1" },
  async run(ctx, input, _args, runtime) {
    const job = input.job ?? jobFromEnv(runtime.env);
    const responses = await requestCoordinatorMessage(ctx.project(), { type: "autopilot-status-request", ...(job === undefined ? {} : { job }) }, { runtimeDir: runtime.runtimeDir });
    const response = responses.find((item) => item.coordinator === true);
    const unavailable = response === undefined;
    const disabled = response?.mode === "disabled";
    const authorized = job !== undefined && response !== undefined && !disabled && response.authorized === true;
    const drifts = authorized && response !== undefined && Array.isArray(response.drifts) ? response.drifts.filter((id): id is string => typeof id === "string") : [];
    const tasks = authorized && response !== undefined && Array.isArray(response.tasks) ? response.tasks.filter((id): id is string => typeof id === "string") : [];
    const status = {
      status: unavailable ? "unavailable" : disabled ? "disabled" : "available",
      ...(response
        ? {
            ...(response.mode === undefined ? {} : { mode: response.mode }),
            ...(response.phase === undefined ? {} : { phase: response.phase }),
            ...(response.reason === undefined ? {} : { reason: response.reason }),
            ...(response.collection === undefined ? {} : { collection: response.collection }),
            ...(response.proposal === undefined ? {} : { proposal: response.proposal }),
            ...(response.remoteWindow === true ? { remoteWindow: true } : {}),
            ...(typeof response.lastFailedScan === "string" ? { lastFailedScan: response.lastFailedScan } : {}),
            ...(Array.isArray(response.failures) ? { failures: response.failures.filter((item): item is string => typeof item === "string") } : {}),
          }
        : { reason: "No project coordinator is available." }),
      drifts,
      tasks,
    };
    const md = [
      `Autopilot: ${status.status}`,
      ...(status.mode === undefined ? [] : [`Mode: ${String(status.mode)}`]),
      ...(status.phase === undefined ? [] : [`Phase: ${String(status.phase)}`]),
      ...(status.reason === undefined ? [] : [`Reason: ${String(status.reason)}`]),
      ...(status.remoteWindow === true ? ["Work is active in another editor window."] : []),
      ...(status.collection === undefined ? [] : [`Collection: ${String(status.collection)}`]),
      ...(status.proposal === undefined ? [] : [`Proposal: ${String(status.proposal)}`]),
      ...(drifts.length ? [`Drifts: ${drifts.map(String).join(", ")}`] : []),
      ...(tasks.length ? [`Tasks: ${tasks.map(String).join(", ")}`] : []),
      ...(status.lastFailedScan === undefined ? [] : [`Last failed scan: ${String(status.lastFailedScan)}`]),
      ...(status.failures ?? []).map((failure) => `Autopilot failed: ${failure}`),
    ].join("\n");
    return { md, json: status };
  },
});

const notBlank = z.string().refine((value) => value.trim() !== "", "must not be blank");

const move = defineCommand({
  object: "autopilot",
  verb: "move",
  mode: "blocking",
  summary: "Report to the coordinator that an automatic case failed.",
  description:
    "Tells the project's coordinator that a Drift or a Task of the job could not be resolved or implemented, or that its check failed: it excludes the case from the next automatic steps and shows `reason`. Give exactly one of `task` and `drift`, by permanent ID; the coordinator checks that the case belongs to the job. It changes no Drift or Task on disk and retries nothing. Fails, with no success assumed, when no coordinator accepts it.",
  positionals: [
    { name: "job", description: "The autopilot job the case belongs to." },
    { name: "state", description: "What happened to the case.", choices: ["failed"] },
  ],
  input: z
    .strictObject({
      task: notBlank.optional().describe("The Task that failed. Not with `drift`."),
      drift: notBlank.optional().describe("The Drift that could not be resolved. Not with `task`."),
      reason: notBlank.describe("Why, in one line."),
    })
    .superRefine((input, ctx) => {
      if ((input.task === undefined) === (input.drift === undefined)) ctx.addIssue({ code: "custom", path: [input.task === undefined ? "task" : "drift"], message: "give exactly one of task and drift" });
    }),
  output: z.object({ message: z.string() }),
  example: { task: "a1b2c3d4", reason: "The final check failed after this Task." },
  exampleArgs: ["job-1", "failed"],
  effects: { coordinator: true },
  async run(ctx, input, [job], runtime) {
    const responses = await requestCoordinatorMessage(ctx.project(), { type: "autopilot-failed", job: job as string, ...(input.drift === undefined ? { task: input.task as string } : { drift: input.drift }), reason: input.reason }, { runtimeDir: runtime.runtimeDir });
    if (!responses.some((response) => response.coordinator === true && response.received === true)) throw new TramaError("No project autopilot coordinator accepted the failure event.");
    return { md: "", json: { message: "" } };
  },
});

export const AUTOPILOT_COMMANDS = [create, move];
