import { ChevronLeft, ChevronRight, CircleCheck, Loader, TriangleAlert, X } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { SettingSchema } from "../../host/settings-schema";
import { cn } from "../lib/utils";
import type { OpenLink } from "../markdown";
import { InstallOmpButton } from "../install-omp";
import { SettingField } from "../settings/field";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import type { WizardController, WizardSnapshot } from "./controller";
import { agentCheckLine, confirmLabel, hasPrevious, ignoresInstructionFiles, nextBlock, ompMissing, STEP_KEYS, STEP_SENTENCES, stepsOf, summaryRows, type WizardChoice, type WizardState, type WizardStep } from "./logic";
import { FolderTree } from "./tree";

const WAYS: { choice: WizardChoice; title: string; sentence: string }[] = [
  { choice: "import", title: "Import from Code", sentence: "For a project that already has its code: an agent describes it as Proposals." },
  { choice: "scratch", title: "Start from Scratch", sentence: "For an application still to be built: you describe it, an agent designs it." },
];

const FILES_WARNING = "This folder already contains files. Start from Scratch ignores them unless your request mentions them; Import from Code describes them instead.";

interface BodyProps {
  controller: WizardController;
  snapshot: WizardSnapshot;
  state: WizardState;
  openLink: OpenLink;
}

/** The step indicator: the steps of the mode in order, the one on view marked, the ones already seen in the normal colour and the next ones dimmed. It is not clickable. */
function Steps({ steps, current }: { steps: WizardStep[]; current: number }) {
  return (
    <ol aria-label="Steps" className="m-0 mb-3 flex list-none flex-wrap items-center gap-x-1 gap-y-1 p-0 text-sm">
      {steps.map((step, index) => (
        <li key={step} aria-current={index === current ? "step" : undefined} className="flex items-center gap-1">
          {index > 0 ? <ChevronRight aria-hidden="true" className="size-3.5 text-muted-foreground" /> : null}
          <span className={cn("rounded-md px-1.5 py-0.5", index === current ? "bg-accent font-semibold text-accent-foreground" : index < current ? "text-foreground" : "text-muted-foreground")}>{step}</span>
        </li>
      ))}
    </ol>
  );
}

/** The two ways to start, which act as a radio group: the arrows move the choice. */
function PathBody({ controller, snapshot, state }: BodyProps) {
  const folder = snapshot.folders.find((f) => f.root === state.root);
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + WAYS.length) % WAYS.length;
    controller.chooseWay((WAYS[next] as (typeof WAYS)[number]).choice);
    refs.current[next]?.focus();
  };
  return (
    <div className="space-y-4">
      {snapshot.folders.length > 1 && state.root !== null ? (
        <div className="grid max-w-md gap-1.5">
          <label id={labelId} className="font-semibold">
            Folder to initialize as a Trama project
          </label>
          <Select value={state.root} onValueChange={(root) => controller.chooseFolder(root)}>
            <SelectTrigger aria-labelledby={labelId} className="max-w-full justify-self-start">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {snapshot.folders.map((f) => (
                <SelectItem key={f.root} value={f.root}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div role="radiogroup" aria-label="How Trama starts" className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-3">
        {WAYS.map((way, index) => {
          const checked = state.choice === way.choice;
          return (
            <button
              key={way.choice}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked || (state.choice === null && index === 0) ? 0 : -1}
              className="rounded-lg border p-4 text-left shadow-xs transition-colors duration-150 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-checked:border-primary aria-checked:bg-accent motion-reduce:transition-none"
              onClick={() => controller.chooseWay(way.choice)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              <span className="block font-semibold">{way.title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{way.sentence}</span>
            </button>
          );
        })}
      </div>
      {state.choice === "scratch" && folder?.hasFiles === true ? (
        <p className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{FILES_WARNING}</span>
        </p>
      ) : null}
    </div>
  );
}

/** The fields of a step, in the same grid as the Settings tab. */
function SettingsBody({ controller, snapshot, state, openLink, step }: BodyProps & { step: WizardStep }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const keys = STEP_KEYS[step] ?? [];
  const check = step === "omp" ? agentCheckLine(snapshot.check) : null;
  const fields = keys.flatMap((key) => snapshot.schema.find((s) => s.key === key) ?? []);
  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-4">
        {fields.map((setting: SettingSchema) => (
          <SettingField
            key={setting.key}
            setting={setting}
            values={{ user: state.values[setting.key], workspace: snapshot.current[setting.key]?.workspace }}
            generation={snapshot.generation}
            models={snapshot.models?.list ?? []}
            listError={snapshot.models?.error ?? null}
            openKey={openKey}
            setOpenKey={setOpenKey}
            send={(_key, value) => controller.setValue(setting, value)}
            openLink={openLink}
            onInvalid={(key, invalid) => controller.setInvalid(key, invalid)}
          />
        ))}
      </div>
      <div aria-live="polite" className="mt-4 text-sm text-muted-foreground">
        {check === null ? null : (
          <p className={cn("m-0 flex items-start gap-2", check.tone === "warning" && "text-amber-700 dark:text-amber-400")}>
            {check.tone === "checking" ? <Loader aria-hidden="true" className="mt-0.5 size-4 shrink-0 animate-spin motion-reduce:animate-none" /> : check.tone === "ok" ? <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
            <span>{check.text}</span>
          </p>
        )}
        {step === "omp" && ompMissing(snapshot.check) ? <InstallOmpButton className="mt-2" onInstall={() => controller.installOmp()} /> : null}
      </div>
      {step === "omp" && snapshot.instructionFiles !== null && snapshot.instructionFiles.length > 0 ? (
        <div className="mt-4 rounded-md border border-amber-600/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
          <p className="m-0 flex items-start gap-2">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>Agent instruction files found. The agent loads them in every Trama job: remove them from the repository, or check that they do not conflict with Trama.</span>
          </p>
          <ul className="m-0 mt-2 list-none space-y-1 p-0 font-mono text-xs">
            {snapshot.instructionFiles.map((file) => (
              <li key={file.path}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="cursor-pointer break-all border-0 bg-transparent p-0 text-left font-mono text-xs underline underline-offset-2" aria-label={`Open ${file.label}`} onClick={() => controller.openInstructionFile(file.path)}>
                      {file.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{`Open ${file.label}`}</TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ul>
          {ignoresInstructionFiles(snapshot.schema, state) ? <p className="m-0 mt-2 text-muted-foreground">Trama's omp jobs ignore these files.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

/** The summary: the rows by step, each a button back to its step. */
function SummaryBody({ controller, snapshot, state }: BodyProps) {
  const rows = summaryRows(snapshot.schema, state, snapshot.current, snapshot.folders, snapshot.models?.list ?? []);
  const steps = stepsOf(state).filter((step) => rows.some((row) => row.step === step));
  return (
    <div className="space-y-4">
      {steps.map((step) => (
        <section key={step}>
          <h3 className="mb-1 border-b pb-1 text-base font-semibold">{step}</h3>
          <ul className="m-0 list-none p-0">
            {rows
              .filter((row) => row.step === step)
              .map((row) => (
                <li key={row.title}>
                  <button
                    type="button"
                    aria-label={`Edit ${row.title}`}
                    disabled={snapshot.busy}
                    className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-md px-2 py-1.5 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => controller.openStep(row.step)}
                  >
                    <span className="w-48 shrink-0 font-medium">{row.title}</span>
                    <span className="min-w-0 flex-1 wrap-anywhere">
                      <span className={cn(row.mono && "font-mono")}>{row.value}</span>
                      {row.isDefault ? <span className="text-muted-foreground"> (default)</span> : null}
                      {row.changed ? (
                        <Badge variant="secondary" className="ml-2 align-middle">
                          changed
                        </Badge>
                      ) : null}
                      {row.was !== null ? <span className="block text-sm text-muted-foreground">was <span className="font-mono">{row.was}</span></span> : null}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function StepBody(props: BodyProps) {
  const { controller, state } = props;
  switch (state.step) {
    case "Path":
      return <PathBody {...props} />;
    case "Folders":
      return <FolderTree tree={state.tree} excluded={state.excluded} onOpen={(path) => controller.openFolder(path)} onToggle={(path) => controller.toggle(path)} />;
    case "Summary":
      return <SummaryBody {...props} />;
    default:
      return <SettingsBody {...props} step={state.step} />;
  }
}

/** The buttons of the wizard: Cancel, Back, Skip and Next, or the confirmation on the summary. Next that cannot be used says why in its tooltip. */
function Buttons({ controller, snapshot, state }: BodyProps) {
  const { busy } = snapshot;
  const block = nextBlock(snapshot.schema, state, snapshot.check);
  const summary = state.step === "Summary";
  const reasonId = useId();
  const next = summary ? (
    <Button disabled={busy} onClick={() => controller.confirm()}>
      {busy ? <Loader aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : null}
      {confirmLabel(state)}
    </Button>
  ) : (
    <Button disabled={busy || block !== null} aria-describedby={block === null ? undefined : reasonId} onClick={() => controller.next()}>
      Next
      <ChevronRight aria-hidden="true" />
    </Button>
  );
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      {state.mode !== "first" ? (
        <Button variant="outline" disabled={busy} onClick={() => controller.cancel()}>
          <X aria-hidden="true" />
          Cancel
        </Button>
      ) : null}
      {hasPrevious(state) ? (
        <Button variant="outline" disabled={busy} onClick={() => controller.back()}>
          <ChevronLeft aria-hidden="true" />
          Back
        </Button>
      ) : null}
      <span className="flex-1" />
      {state.step === "Advanced" ? (
        <Button variant="outline" disabled={busy} onClick={() => controller.skip()}>
          Skip
        </Button>
      ) : null}
      {block !== null && !summary ? (
        <>
          <span id={reasonId} hidden>
            {block}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {next}
              </span>
            </TooltipTrigger>
            <TooltipContent>{block}</TooltipContent>
          </Tooltip>
        </>
      ) : (
        next
      )}
    </div>
  );
}

export interface WizardProps {
  controller: WizardController;
  openLink: OpenLink;
  /** What shows above the title of every step (the notice of Get Started). */
  notice?: ReactNode;
}

/** The setup wizard of one view: the step indicator, the title and sentence of the step, the step, the failure of the last confirmation and the buttons. */
export function Wizard({ controller, openLink, notice }: WizardProps) {
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const state = snapshot.state;
  const heading = useRef<HTMLHeadingElement>(null);
  const seen = useRef<WizardStep | null>(null);
  const step = state?.step ?? null;
  // A change of step brings the focus to the new title, which announces it; the first step on view does not take the focus.
  useEffect(() => {
    if (step !== null && seen.current !== null && seen.current !== step) heading.current?.focus();
    seen.current = step;
  }, [step]);
  if (state === null) return null;
  const steps = stepsOf(state);
  const props: BodyProps = { controller, snapshot, state, openLink };
  return (
    <TooltipProvider>
      <div className="max-w-[1100px] min-w-0 overflow-x-hidden px-4 pt-3 pb-6">
        <Steps steps={steps} current={steps.indexOf(state.step)} />
        {notice}
        <h2 ref={heading} tabIndex={-1} className="mb-1 text-lg font-semibold outline-none">
          {state.step}
        </h2>
        <p className="mt-0 mb-4 text-muted-foreground">{STEP_SENTENCES[state.step]}</p>
        <StepBody {...props} />
        {snapshot.error !== null ? (
          <p role="alert" className="mt-4 mb-0 break-words text-destructive">
            {snapshot.error}
          </p>
        ) : null}
        <Buttons {...props} />
      </div>
    </TooltipProvider>
  );
}
