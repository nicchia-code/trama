import { Check, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, FolderCode, Loader, Pencil, Sparkles, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { Fragment, type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useSyncExternalStore } from "react";
import type { SettingSchema } from "../../host/settings-schema";
import { cn } from "../lib/utils";
import type { OpenLink } from "../markdown";
import { InstallOmpButton } from "../install-omp";
import { SettingField } from "../settings/field";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import type { WizardController, WizardSnapshot } from "./controller";
import {
  ADVANCED_GROUPS,
  agentCheckLine,
  confirmLabel,
  hasPrevious,
  ignoresInstructionFiles,
  nextBlock,
  ompMissing,
  previousSteps,
  ROLE_ADVICE,
  showsFolderNotice,
  STEP_KEYS,
  STEP_SENTENCES,
  type SummaryRow,
  stepPosition,
  stepsOf,
  summaryRows,
  valueParts,
  type WizardChoice,
  type WizardState,
  type WizardStep,
  wizardTitle,
} from "./logic";
import { FolderTree } from "./tree";

const WAYS: { choice: WizardChoice; title: string; sentence: string; icon: LucideIcon }[] = [
  { choice: "import", title: "Import from Code", sentence: "For a project that already has its code: an agent describes it as Proposals.", icon: FolderCode },
  { choice: "scratch", title: "Start from Scratch", sentence: "For an application still to be built: you describe it, an agent designs it.", icon: Sparkles },
];

const FILES_WARNING = "This folder already contains files. Start from Scratch ignores them unless your request mentions them; Import from Code describes them instead.";

/** Below this width of the panel the step indicator is «Step <n> of <N>» with a progress bar. */
const NARROW_QUERY = "(max-width: 479.98px)";

const subscribeNarrow = (notify: () => void): (() => void) => {
  const query = window.matchMedia?.(NARROW_QUERY);
  query?.addEventListener("change", notify);
  return () => query?.removeEventListener("change", notify);
};

/** Whether the panel is narrower than about 480 px. */
function useNarrow(): boolean {
  return useSyncExternalStore(subscribeNarrow, () => window.matchMedia?.(NARROW_QUERY).matches ?? false, () => false);
}

const noop = (): void => {};

interface BodyProps {
  controller: WizardController;
  snapshot: WizardSnapshot;
  state: WizardState;
  openLink: OpenLink;
}

/**
 * The step indicator: the steps of the mode in order, the ones before the one on view with a check and leading back to them, the one on view
 * filled, the next ones dimmed and not reachable. In a narrow panel «Step <n> of <N> · <step>» and a progress bar.
 */
function StepIndicator({ controller, snapshot, state }: BodyProps) {
  const narrow = useNarrow();
  const steps = stepsOf(state);
  const current = steps.indexOf(state.step);
  const before = previousSteps(state);
  if (narrow) {
    const position = stepPosition(state);
    return (
      <nav aria-label="Setup steps" className="mb-6">
        <p className="m-0 mb-2 text-sm font-medium">{`Step ${position.n} of ${position.total} · ${position.name}`}</p>
        <Progress value={position.percent} aria-label={`Step ${position.n} of ${position.total}`} className="h-1.5 rounded-full" />
      </nav>
    );
  }
  return (
    <nav aria-label="Setup steps" className="mb-6">
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-3 p-0 text-sm">
        {steps.map((step, index) => {
          const done = before.includes(step);
          const isCurrent = index === current;
          const circle = (
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                done && "border-primary text-primary",
                isCurrent && "border-primary bg-primary text-primary-foreground",
                !done && !isCurrent && "border-border text-muted-foreground",
              )}
            >
              {done ? <Check aria-hidden="true" className="size-3.5" /> : index + 1}
            </span>
          );
          return (
            <li key={step} aria-current={isCurrent ? "step" : undefined} className="flex items-center gap-2">
              {done ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" aria-label={`Go back to ${step}`} disabled={snapshot.busy} className="h-auto gap-2 px-1 py-0.5" onClick={() => controller.openStep(step)}>
                      {circle}
                      <span>{step}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{`Go back to ${step}`}</TooltipContent>
                </Tooltip>
              ) : (
                <span className="flex items-center gap-2 px-1 py-0.5">
                  {circle}
                  <span className={cn(isCurrent ? "font-semibold" : "text-muted-foreground")}>{step}</span>
                </span>
              )}
              {index < steps.length - 1 ? <span aria-hidden="true" className="h-px w-6 shrink-0 bg-border" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
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
    <div className="grid min-w-0 gap-4">
      {snapshot.folders.length > 1 && state.root !== null ? (
        <div className="grid min-w-0 gap-1.5">
          <label id={labelId} className="font-semibold">
            Folder to initialize as a Trama project
          </label>
          <Select value={state.root} onValueChange={(root) => controller.chooseFolder(root)} disabled={snapshot.busy}>
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectTrigger aria-labelledby={labelId} className="max-w-full justify-self-start">
                  <SelectValue className="min-w-0 truncate" />
                </SelectTrigger>
              </TooltipTrigger>
              <TooltipContent>{folder?.name ?? ""}</TooltipContent>
            </Tooltip>
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
      <div role="radiogroup" aria-label="How Trama starts" className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2">
        {WAYS.map((way, index) => {
          const checked = state.choice === way.choice;
          const Icon = way.icon;
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
              // Hovering changes the colour of the border and nothing else; the chosen card has the primary border and a light primary tint.
              className="relative flex min-w-0 flex-col gap-1.5 rounded-lg border-2 bg-card p-4 text-left shadow-xs transition-colors duration-150 outline-none hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring aria-checked:border-primary aria-checked:bg-primary/5 aria-checked:hover:border-primary motion-reduce:transition-none"
              onClick={() => controller.chooseWay(way.choice)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              <span aria-hidden="true" className={cn("absolute top-3 right-3 flex size-4 items-center justify-center rounded-full border", checked ? "border-primary bg-primary" : "border-muted-foreground")}>
                {checked ? <span className="size-1.5 rounded-full bg-primary-foreground" /> : null}
              </span>
              <span className="flex items-center gap-2 pr-7">
                <Icon aria-hidden="true" className="size-5 shrink-0 text-primary" />
                <span className="font-semibold wrap-anywhere">{way.title}</span>
              </span>
              <span className="text-sm text-muted-foreground">{way.sentence}</span>
            </button>
          );
        })}
      </div>
      {state.choice === "scratch" && folder?.hasFiles === true ? (
        <p className="m-0 flex items-start gap-2 text-amber-700 dark:text-amber-400">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{FILES_WARNING}</span>
        </p>
      ) : null}
    </div>
  );
}

/** The status of the check of omp: in a bordered box, a polite live region, with `Install omp` inside it when omp is missing. */
function OmpStatus({ controller, snapshot }: Pick<BodyProps, "controller" | "snapshot">) {
  const check = agentCheckLine(snapshot.check);
  const warning = check.tone === "warning";
  return (
    <div aria-live="polite" className={cn("mb-5 flex items-start gap-2.5 rounded-md border p-3 text-sm", warning ? "border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-300" : "bg-card")}>
      {check.tone === "checking" ? (
        <Loader aria-hidden="true" className="mt-0.5 size-4 shrink-0 animate-spin motion-reduce:animate-none" />
      ) : check.tone === "ok" ? (
        <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
      ) : (
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      )}
      <div className="grid min-w-0 gap-2">
        <p className="m-0 wrap-anywhere">{check.text}</p>
        {ompMissing(snapshot.check) ? <InstallOmpButton className="justify-self-start" onInstall={() => controller.installOmp()} /> : null}
      </div>
    </div>
  );
}

/** The warning about the agent instruction files the omp step found: the files one per line under the text, not under the icon. */
function InstructionFiles({ controller, snapshot, state }: BodyProps) {
  const files = snapshot.instructionFiles;
  if (files === null || files.length === 0) return null;
  return (
    <div className="mt-5 rounded-md border border-amber-600/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
      <p className="m-0 flex items-start gap-2">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>Agent instruction files found. The agent loads them in every Trama job: remove them from the repository, or check that they do not conflict with Trama.</span>
      </p>
      <ul className="m-0 mt-2 grid list-none gap-1 p-0 pl-6 font-mono text-xs">
        {files.map((file) => (
          <li key={file.path} className="min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-left font-mono text-xs wrap-anywhere underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Open ${file.label}`} onClick={() => controller.openInstructionFile(file.path)}>
                  {file.label}
                </button>
              </TooltipTrigger>
              <TooltipContent>{`Open ${file.label}`}</TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
      {ignoresInstructionFiles(snapshot.schema, state) ? <p className="m-0 mt-2 pl-6 text-muted-foreground">Trama's omp jobs ignore these files.</p> : null}
    </div>
  );
}

/** The settings of a step, one under the other in the width of the column, each with its explanation in the page. */
function SettingsBody({ controller, snapshot, state, openLink, step }: BodyProps & { step: WizardStep }) {
  const field = (key: string) => {
    const setting: SettingSchema | undefined = snapshot.schema.find((s) => s.key === key);
    if (setting === undefined) return null;
    return (
      <SettingField
        key={key}
        setting={setting}
        values={{ user: state.values[key], workspace: snapshot.current[key]?.workspace }}
        generation={snapshot.generation}
        models={snapshot.models?.list ?? []}
        listError={snapshot.models?.error ?? null}
        openKey={null}
        setOpenKey={noop}
        send={(_key, value) => controller.setValue(setting, value)}
        openLink={openLink}
        onInvalid={(invalidKey, invalid) => controller.setInvalid(invalidKey, invalid)}
        explain="page"
        lead={ROLE_ADVICE[key]}
      />
    );
  };
  return (
    <div className="min-w-0">
      {step === "omp" ? <OmpStatus controller={controller} snapshot={snapshot} /> : null}
      {step === "Advanced" ? (
        <div className="grid gap-8">
          {ADVANCED_GROUPS.map((group) => (
            <section key={group.title} aria-label={group.title} className="grid gap-5">
              <h3 className="m-0 border-b pb-1 text-base font-semibold">{group.title}</h3>
              {group.keys.map(field)}
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-5">{(STEP_KEYS[step] ?? []).map(field)}</div>
      )}
      {step === "omp" ? <InstructionFiles controller={controller} snapshot={snapshot} state={state} openLink={openLink} /> : null}
    </div>
  );
}

/** The value of a summary row: in the monospace font for texts and numbers, with «(default)», and «was <value>» for a row that changes the setting now. */
function SummaryValue({ row }: { row: SummaryRow }) {
  const shown = (text: string, mono: boolean) => (
    <span className={cn(mono && "font-mono")}>
      {valueParts(text).map((part, index) => (
        <Fragment key={index}>
          {part}
          <wbr />
        </Fragment>
      ))}
    </span>
  );
  return (
    <div className="min-w-0 wrap-anywhere">
      {row.empty ? <span className="text-muted-foreground">(empty)</span> : shown(row.value, row.mono)}
      {row.isDefault ? <span className="text-muted-foreground"> (default)</span> : null}
      {row.was !== null ? <span className="text-muted-foreground"> was {row.was === "(empty)" ? "(empty)" : shown(row.was, row.mono)}</span> : null}
    </div>
  );
}

/** One row of the summary: the title on the left and the value on the right, the value under the title in a narrow panel. */
function SummaryLine({ row }: { row: SummaryRow }) {
  return (
    <div className={cn("grid min-w-0 gap-0.5 rounded-md px-2 py-1.5 min-[480px]:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] min-[480px]:gap-x-4", row.changed && "bg-primary/10")}>
      <dt className="flex min-w-0 flex-wrap items-center gap-2 font-medium">
        <span className="wrap-anywhere">{row.title}</span>
        {row.changed ? <Badge variant="secondary">changed</Badge> : null}
      </dt>
      <dd className="m-0 min-w-0">
        <SummaryValue row={row} />
      </dd>
    </div>
  );
}

/** The summary: a card for each step, in the order of the steps, with its «Edit» that goes back to the step. */
function SummaryBody({ controller, snapshot, state }: BodyProps) {
  const rows = summaryRows(snapshot.schema, state, snapshot.current, snapshot.folders, snapshot.models?.list ?? []);
  const steps = stepsOf(state).filter((step) => rows.some((row) => row.step === step));
  return (
    <div className="grid min-w-0 gap-4">
      {steps.map((step) => {
        const own = rows.filter((row) => row.step === step);
        const groups = [...new Set(own.map((row) => row.group))];
        return (
          <Card key={step} className="min-w-0">
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle>
                <h3 className="m-0 text-base">{step}</h3>
              </CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="outline" size="sm" aria-label={`Edit ${step}`} disabled={snapshot.busy} onClick={() => controller.openStep(step)}>
                    <Pencil aria-hidden="true" />
                    Edit
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{`Go back to ${step}`}</TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent className="grid min-w-0 gap-2">
              {groups.map((group) => (
                <div key={group ?? ""} className="min-w-0">
                  {group === null ? null : <h4 className="m-0 mb-0.5 px-2 text-xs font-semibold text-muted-foreground">{group}</h4>}
                  <dl className="m-0 grid gap-0.5">
                    {own
                      .filter((row) => row.group === group)
                      .map((row) => (
                        <SummaryLine key={row.title} row={row} />
                      ))}
                  </dl>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
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

/**
 * The bar of buttons, fixed at the bottom of the panel: the reason of the last failure above the buttons, then Cancel, Back, Skip and Next, or the
 * confirmation on the summary. Next that cannot be used says why in its tooltip. In a narrow panel Next or the confirmation has its own full row.
 */
function ButtonBar({ controller, snapshot, state }: BodyProps) {
  const { busy } = snapshot;
  const block = nextBlock(snapshot.schema, state, snapshot.check);
  const summary = state.step === "Summary";
  const reasonId = useId();
  const wide = "max-[479px]:order-last max-[479px]:w-full";
  const next = summary ? (
    <Button className={wide} disabled={busy} onClick={() => controller.confirm()}>
      {busy ? <Loader aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : null}
      {confirmLabel(state)}
    </Button>
  ) : (
    <Button className={block === null ? wide : "max-[479px]:w-full"} disabled={busy || block !== null} aria-describedby={block === null ? undefined : reasonId} onClick={() => controller.next()}>
      Next
      <ChevronRight aria-hidden="true" />
    </Button>
  );
  return (
    <div className="sticky bottom-0 z-10 border-t bg-background">
      <div className="mx-auto grid w-full max-w-[720px] min-w-0 gap-3 px-4 py-3">
        {snapshot.error !== null ? (
          <div role="alert" className="flex items-start gap-2.5 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 wrap-anywhere">{snapshot.error}</span>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
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
                  <span tabIndex={0} className={cn("rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring", wide)}>
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
      </div>
    </div>
  );
}

export interface WizardProps {
  controller: WizardController;
  openLink: OpenLink;
  /** What shows under the sentence of the Path and Summary steps, before their content (the notice of Get Started). */
  notice?: ReactNode;
}

/** The setup wizard of one view: the title, the step indicator, the title and sentence of the step, the step and the bar of buttons. */
export function Wizard({ controller, openLink, notice }: WizardProps) {
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const state = snapshot.state;
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const seen = useRef<WizardStep | null>(null);
  const step = state?.step ?? null;
  // A change of step brings the focus to the new title, which announces it, and the scroll back to the top; the first step on view does not take the focus.
  useEffect(() => {
    if (step !== null && seen.current !== null && seen.current !== step) {
      heading.current?.focus({ preventScroll: true });
      for (let element = root.current?.parentElement; element; element = element.parentElement) element.scrollTop = 0;
    }
    seen.current = step;
  }, [step]);
  if (state === null) return null;
  const props: BodyProps = { controller, snapshot, state, openLink };
  return (
    <TooltipProvider>
      <div ref={root} className="flex min-h-full min-w-0 flex-col overflow-x-clip">
        <div className="mx-auto w-full max-w-[720px] min-w-0 flex-1 px-4 pt-5 pb-8">
          <h1 className="mt-0 mb-5 text-2xl font-semibold">{wizardTitle(state.mode)}</h1>
          <StepIndicator {...props} />
          <h2 ref={heading} tabIndex={-1} className="mt-0 mb-1 text-lg font-semibold outline-none">
            {state.step}
          </h2>
          <p className="mt-0 mb-5 text-muted-foreground">{STEP_SENTENCES[state.step]}</p>
          {showsFolderNotice(state.step) ? notice : null}
          <StepBody {...props} />
        </div>
        <ButtonBar {...props} />
      </div>
    </TooltipProvider>
  );
}
