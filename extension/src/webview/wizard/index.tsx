import { Check, ChevronLeft, ChevronRight, CircleAlert, FolderCode, Loader, Pencil, Sparkles, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { Fragment, type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useSyncExternalStore } from "react";
import type { SettingSchema } from "../../host/settings-schema";
import { cn } from "../lib/utils";
import type { OpenLink } from "../markdown";
import { Column, InstructionFiles, OmpStatusBox, ignoresInstructionFiles, Providers, ROLE_ADVICE, STEP_SENTENCES, Subgroups } from "../setup-shared";
import { SettingField } from "../settings/field";
import { SYSTEM_CERTIFICATES_KEY, SKILLS_DIR_KEY } from "../settings/logic";
import { SoloModeRow } from "../settings/solo-mode";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import type { WizardController, WizardSnapshot } from "./controller";
import {
  advancedSubgroups,
  agentCheckLine,
  chosenSolo,
  confirmLabel,
  hasPrevious,
  nextBlock,
  offersSolo,
  ompMissing,
  previousSteps,
  showsFolderNotice,
  soloAvailable,
  STEP_KEYS,
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

/** The status of the check of omp, from the answer of the host: the shared box, with `Install omp` inside it when omp is missing, and under it the Providers section when omp answers. */
function OmpStatus({ controller, snapshot }: Pick<BodyProps, "controller" | "snapshot">) {
  const check = agentCheckLine(snapshot.check);
  return (
    <>
      <OmpStatusBox tone={check.tone} text={check.text} missing={ompMissing(snapshot.check)} onInstall={() => controller.installOmp()} />
      {snapshot.providers === null ? null : <Providers connected={snapshot.providers.connected} onLogin={(provider) => controller.login(provider)} onLogout={(provider) => controller.logout(provider)} loggingOut={snapshot.loggingOut} apiKey={{ ...snapshot.cursorKey, onSet: () => controller.setCursorKey(), onRemove: () => controller.removeCursorKey() }} />}
    </>
  );
}

/** The `Solo Mode` row of the Project step, with the wizard's choice: the files git tracks are not listed here, and nothing is written before the confirmation. */
function WizardSoloRow({ controller, snapshot, state, openLink }: BodyProps) {
  return <SoloModeRow solo={chosenSolo(state, snapshot.folders, snapshot.projectSolo)} available={soloAvailable(state, snapshot.folders, snapshot.projectSolo)} openLink={openLink} onChange={(solo) => controller.setSolo(solo)} />;
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
        send={(_key, value) => controller.setValue(setting, value)}
        openLink={openLink}
        onInvalid={(invalidKey, invalid) => controller.setInvalid(invalidKey, invalid)}
        lead={ROLE_ADVICE[key]}
        {...(key === SYSTEM_CERTIFICATES_KEY ? { certificates: { state: snapshot.certificates, onRefresh: () => controller.refreshCertificates() } } : {})}
      />
    );
  };
  return (
    <div className="min-w-0">
      {step === "omp" ? <OmpStatus controller={controller} snapshot={snapshot} /> : null}
      {step === "Advanced" ? (
        <Subgroups groups={advancedSubgroups(snapshot.schema).map((group) => ({ title: group.title, items: group.keys }))} render={field} />
      ) : (
        <div className="grid gap-5">
          {(STEP_KEYS[step] ?? []).flatMap((key) => [field(key), ...(key === SKILLS_DIR_KEY && offersSolo(state.mode) ? [<WizardSoloRow key="solo-mode" controller={controller} snapshot={snapshot} state={state} openLink={openLink} />] : [])])}
        </div>
      )}
      {step === "omp" ? <InstructionFiles files={snapshot.instructionFiles} ignored={ignoresInstructionFiles(snapshot.schema, state.values)} onOpen={(path) => controller.openInstructionFile(path)} /> : null}
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
  const rows = summaryRows(snapshot.schema, state, snapshot.current, snapshot.folders, snapshot.models?.list ?? [], snapshot.projectSolo);
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
      <Column className="grid gap-3 py-3">
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
      </Column>
    </div>
  );
}

export interface WizardProps {
  controller: WizardController;
  openLink: OpenLink;
  /** What shows under the sentence of the Path and Summary steps, before their content (the notice of Get Started); it is told whether Solo mode is chosen in the Project step. */
  notice?: (solo: boolean) => ReactNode;
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
        <Column className="flex-1 pt-5 pb-8">
          <h1 className="mt-0 mb-5 text-2xl font-semibold">{wizardTitle(state.mode)}</h1>
          <StepIndicator {...props} />
          <h2 ref={heading} tabIndex={-1} className="mt-0 mb-1 text-lg font-semibold outline-none">
            {state.step}
          </h2>
          <p className="mt-0 mb-5 text-muted-foreground">{STEP_SENTENCES[state.step]}</p>
          {showsFolderNotice(state.step) ? notice?.(chosenSolo(state, snapshot.folders, snapshot.projectSolo) !== "off") : null}
          <StepBody {...props} />
        </Column>
        <ButtonBar {...props} />
      </div>
    </TooltipProvider>
  );
}
