import { cardLabel, noNumbers } from "../../../../src/core/card-names";
import type { SpecEntry } from "../../../../src/core/specs";
import type { ProposalView, Snapshot } from "../../../../src/core/snapshot";
import type { NavigateOptions } from "../../protocol";
import { useEffect, useMemo, useRef } from "react";
import { FocusBar } from "../focus/bar";
import { type PageFocus, goTo, openPageFocus, scrollToStep, settle } from "../focus/page";
import { focusSpec, neighbour, stepIndex } from "../focus/spec";
import { specsSteps } from "../focus/specs";
import { cn } from "../lib/utils";
import { Markdown } from "../markdown";
import { CHANGE_BORDER, CHANGE_TEXT, CHANGE_TINT, FOCUS_MARK, ProposalSelect } from "../proposal-select";
import type { MountView } from "../types";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { SpecIcon } from "./icons";
import { type SpecFieldView, type SpecRow, SPECS_FILE, specsView } from "./logic";

function AgentBadge({ entry }: { entry: SpecEntry }) {
  const reason = entry.chosenByAgent ?? "";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="text-muted-foreground" role="note" aria-label={`chosen by agent: ${reason}`} tabIndex={0}>
          chosen by agent
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}

function Entry({ row, openLink }: { row: SpecRow; openLink: (url: string) => void }) {
  const removed = row.change === "removed";
  return (
    <li className={cn("min-w-0 border-l-[3px] py-0.5 pl-2.5", row.change === "same" ? "border-l-transparent" : CHANGE_BORDER[row.change])}>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <SpecIcon name={row.entry.name} />
        <span className={cn("font-semibold break-words", removed && "line-through opacity-70")}>{row.entry.name}</span>
        {row.entry.version ? <span className="text-sm break-words text-muted-foreground">{row.entry.version}</span> : null}
        {row.change !== "same" ? (
          <Badge variant="outline" className={CHANGE_TEXT[row.change]}>
            {row.change}
          </Badge>
        ) : null}
        {row.entry.chosenByAgent !== null ? <AgentBadge entry={row.entry} /> : null}
      </div>
      {row.before?.note && row.before.note !== row.entry.note ? (
        <div className="mt-0.5 line-through opacity-60">
          <Markdown source={row.before.note} openLink={openLink} />
        </div>
      ) : null}
      {row.entry.note ? (
        <div className={cn("mt-0.5", removed && "line-through opacity-70")}>
          <Markdown source={row.entry.note} openLink={openLink} />
        </div>
      ) : null}
    </li>
  );
}

/** The colour of a field's change: its one kind of change, `changed` when they are mixed, none when the Proposal leaves it as it is. */
function fieldChange(view: SpecFieldView): "added" | "removed" | "changed" | "same" {
  const kinds = new Set(view.rows.map((r) => r.change).filter((c) => c !== "same"));
  if (view.notesBefore !== null) kinds.add("changed");
  const only = kinds.size === 1 ? [...kinds][0] : undefined;
  return only ?? (kinds.size > 1 ? "changed" : "same");
}

function Field({ view, openLink, focus }: { view: SpecFieldView; openLink: (url: string) => void; focus: { marked: boolean; current: boolean } }) {
  const change = fieldChange(view);
  const mark = focus.marked ? cn(change === "same" ? FOCUS_MARK : cn(CHANGE_BORDER[change], CHANGE_TINT[change]), focus.current && "ring-2 ring-ring") : "border-l-transparent";
  return (
    <section data-step={view.field} data-focus={focus.marked ? "true" : undefined} aria-current={focus.current ? "step" : undefined} className={cn("border-t border-l-[3px] pt-2 pl-2.5", mark)}>
      <h3 className="mb-1.5 font-semibold">{view.title}</h3>
      {view.notes !== null ? (
        <>
          {view.notesBefore ? (
            <div className="line-through opacity-60">
              <Markdown source={view.notesBefore} openLink={openLink} />
            </div>
          ) : null}
          {view.notes ? <Markdown source={view.notes} openLink={openLink} /> : <p className="text-muted-foreground">Empty.</p>}
        </>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] items-start gap-x-4 gap-y-2">
          {view.rows.map((row) => (
            <Entry key={row.entry.name} row={row} openLink={openLink} />
          ))}
        </ul>
      )}
    </section>
  );
}

export interface SpecsProps {
  snapshot: Snapshot | null;
  proposalId: string | null;
  /** The focus of this tab, or null without one; the tab never keeps it itself. */
  focus: PageFocus | null;
  onProposal(id: string | null): void;
  onFocus(focus: PageFocus | null): void;
  openLink(url: string): void;
}

/** Read-only Specs, field by field; a Proposal is drawn over them with what it adds, removes or changes, and a focus marks its fields. */
export function SpecsTab({ snapshot, proposalId, focus, onProposal, onFocus, openLink }: SpecsProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const found = useMemo(() => {
    const spec = snapshot && focus ? focusSpec(snapshot, focus.request) : null;
    return snapshot && spec ? { spec, ...specsSteps(snapshot, spec) } : null;
  }, [snapshot, focus?.request]);
  const nonce = focus?.nonce;
  const step = focus?.step ?? null;
  useEffect(() => {
    if (scroller.current && step !== null) scrollToStep(scroller.current, step);
  }, [nonce]);

  if (!snapshot) return null;
  const proposal: ProposalView | undefined = snapshot.proposals.find((p) => p.id === proposalId);
  const numbers = snapshot.numbers ?? noNumbers;
  const options = snapshot.proposals.map((p) => ({ id: p.id, label: `${cardLabel(numbers, "proposal", p.id)} ${p.title}` }));
  const problems = snapshot.diagnostics.filter((d) => d.file === SPECS_FILE);
  const fields = specsView(snapshot, proposal);
  const at = found && focus ? stepIndex(found.steps, focus.step) : -1;
  const current = found?.steps[at]?.key ?? null;
  const move = (delta: -1 | 1) => {
    const next = found && focus ? neighbour(found.steps, focus.step, delta) : null;
    if (focus && next) onFocus(goTo(focus, next.key));
  };
  return (
    <TooltipProvider>
      <div
        tabIndex={-1}
        className="flex h-full min-h-0 flex-col outline-none"
        onKeyDown={(event) => {
          // A modal, drop-down, popover or tooltip that is open takes the Esc first and marks the event handled.
          if (event.key === "Escape" && focus && !event.defaultPrevented) onFocus(null);
        }}
      >
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <ProposalSelect label="Proposal to draw over the Specs" options={options} value={proposal ? proposal.id : null} focused={focus !== null} onChange={onProposal} />
        </div>
        {found && focus ? (
          <FocusBar title={found.spec.title} stepName={found.steps[at]?.name ?? ""} index={at} count={found.steps.length} missing={found.missing} onPrevious={() => move(-1)} onNext={() => move(1)} onClear={() => onFocus(null)} />
        ) : null}
        {problems.length > 0 ? (
          <div className="border-b border-destructive/50 bg-destructive/15 px-3 py-1.5">
            {problems.map((d, at) => (
              <p key={at} role="alert" className="my-0.5 break-words">
                {d.line > 0 ? `${d.file}:${d.line}: ${d.message}` : `${d.file}: ${d.message}`}
              </p>
            ))}
          </div>
        ) : null}
        <div ref={scroller} className="flex max-w-6xl min-h-0 flex-1 flex-col gap-3.5 overflow-auto p-3">
          {fields.map((view) => (
            <Field key={view.field} view={view} openLink={openLink} focus={{ marked: found?.steps.some((s) => s.key === view.field) ?? false, current: current === view.field }} />
          ))}
          {fields.length === 0 && !snapshot.specsPresent ? <p className="text-muted-foreground">This project has no Specs yet.</p> : null}
        </div>
      </div>
    </TooltipProvider>
  );
}

export const mountSpecs: MountView = (slot, context) => {
  let snapshot: Snapshot | null = null;
  let proposalId: string | null = null;
  let focus: PageFocus | null = null;

  /** A focus whose Proposal is no longer open (or whose Task is gone) ends, the tab back on the Specs without a Proposal; any other stays at its field while it exists, else goes to the first. */
  function settleFocus() {
    if (!focus || !snapshot) return;
    const spec = focusSpec(snapshot, focus.request);
    if (!spec) {
      if (focus.request.kind === "proposal") proposalId = null;
      focus = null;
      return;
    }
    focus = settle(focus, specsSteps(snapshot, spec).steps);
  }

  function render() {
    slot(
      <SpecsTab
        snapshot={snapshot}
        proposalId={proposalId}
        focus={focus}
        onProposal={(id) => {
          // With a focus on the Proposal drawn stays until Clear or Esc takes the focus off.
          if (focus) return;
          proposalId = id;
          render();
        }}
        onFocus={(next) => {
          focus = next;
          render();
        }}
        openLink={context.openLink}
      />,
    );
  }

  return {
    update(next) {
      snapshot = next;
      settleFocus();
      render();
    },
    show(options: NavigateOptions) {
      if (options.focus) {
        // A new focus replaces the old one and the Proposal drawn: only a Proposal's focus draws one.
        focus = openPageFocus(options.focus);
        proposalId = options.focus.kind === "proposal" ? options.focus.id : null;
        settleFocus();
      } else if (options.proposal !== undefined) proposalId = options.proposal;
      render();
    },
  };
};
