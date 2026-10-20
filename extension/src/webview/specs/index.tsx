import { cardLabel, noNumbers } from "../../../../src/core/card-names";
import type { SpecEntry } from "../../../../src/core/specs";
import type { ProposalView, Snapshot } from "../../../../src/core/snapshot";
import type { NavigateOptions } from "../../protocol";
import { cn } from "../lib/utils";
import { Markdown } from "../markdown";
import { CHANGE_BORDER, CHANGE_TEXT, ProposalSelect } from "../proposal-select";
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

function Field({ view, openLink }: { view: SpecFieldView; openLink: (url: string) => void }) {
  return (
    <section className="border-t pt-2">
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
  onProposal(id: string | null): void;
  openLink(url: string): void;
}

/** Read-only Specs, field by field; a Proposal is drawn over them with what it adds, removes or changes. */
export function SpecsTab({ snapshot, proposalId, onProposal, openLink }: SpecsProps) {
  if (!snapshot) return null;
  const proposal: ProposalView | undefined = snapshot.proposals.find((p) => p.id === proposalId);
  const numbers = snapshot.numbers ?? noNumbers;
  const options = snapshot.proposals.map((p) => ({ id: p.id, label: `${cardLabel(numbers, "proposal", p.id)} ${p.title}` }));
  const problems = snapshot.diagnostics.filter((d) => d.file === SPECS_FILE);
  const fields = specsView(snapshot, proposal);
  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <ProposalSelect label="Proposal to draw over the Specs" options={options} value={proposal ? proposal.id : null} onChange={onProposal} />
        </div>
        {problems.length > 0 ? (
          <div className="border-b border-destructive/50 bg-destructive/15 px-3 py-1.5">
            {problems.map((d, at) => (
              <p key={at} role="alert" className="my-0.5 break-words">
                {d.line > 0 ? `${d.file}:${d.line}: ${d.message}` : `${d.file}: ${d.message}`}
              </p>
            ))}
          </div>
        ) : null}
        <div className="flex max-w-6xl min-h-0 flex-1 flex-col gap-3.5 overflow-auto p-3">
          {fields.map((view) => (
            <Field key={view.field} view={view} openLink={openLink} />
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

  function render() {
    slot(
      <SpecsTab
        snapshot={snapshot}
        proposalId={proposalId}
        onProposal={(id) => {
          proposalId = id;
          render();
        }}
        openLink={context.openLink}
      />,
    );
  }

  return {
    update(next) {
      snapshot = next;
      render();
    },
    show(options: NavigateOptions) {
      if (options.proposal !== undefined) proposalId = options.proposal;
      render();
    },
  };
};
