import { ArrowRight, ChevronDown, ChevronRight, CircleAlert, CircleCheck, CircleDashed, CircleDot, CircleHelp, CircleSlash, Clock, ExternalLink, Eye, Gauge, Link as LinkIcon, LoaderCircle, MessageSquare, ScanSearch, Upload } from "lucide-react";
import { useState } from "react";
import type { Snapshot } from "../../../../src/core/snapshot";
import type { ToHost } from "../../protocol";
import { Tip } from "../board/parts";
import { cn } from "../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { EpicChip } from "./decisions-tab";
import { avatarText, type EpicGroup, type GitHubMessage, groupByEpic, groupText, ISSUES_EMPTY, type IssueRow, issuesSummary, issueStatus, NARROW_ISSUES, unsetText, withGitHub } from "./logic";
import type { TeamMessage } from "./people-tab";
import { useNarrow } from "./use-narrow";

type Post = (message: ToHost) => void;

const PILLS = {
  publishing: { icon: LoaderCircle, className: "border-blue-600/40 bg-blue-600/10 text-blue-800 dark:border-blue-400/40 dark:bg-blue-400/15 dark:text-blue-300" },
  "not-published": { icon: CircleDashed, className: "border-dashed text-muted-foreground" },
  open: { icon: CircleDot, className: "border-green-600/40 bg-green-600/10 text-green-800 dark:border-green-400/40 dark:bg-green-400/15 dark:text-green-300" },
  "in-progress": { icon: LoaderCircle, className: "border-blue-600/40 bg-blue-600/10 text-blue-800 dark:border-blue-400/40 dark:bg-blue-400/15 dark:text-blue-300" },
  "in-review": { icon: Eye, className: "border-amber-600/40 bg-amber-600/10 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-300" },
  closed: { icon: CircleCheck, className: "border-violet-600/40 bg-violet-600/10 text-violet-800 dark:border-violet-400/40 dark:bg-violet-400/15 dark:text-violet-300" },
  "not-planned": { icon: CircleSlash, className: "border-border bg-muted text-muted-foreground" },
  "not-found": { icon: CircleHelp, className: "border-border bg-muted text-muted-foreground" },
} as const;

type Signals = GitHubMessage["signals"];
type Signal = Signals[number][number];

/** The badge of each signal: its icon, its word and its colour (`ui#issue/Published`); the reason follows it in secondary text. The signal is never told by colour alone. */
const SIGNAL_LOOKS = {
  stale: { icon: Clock, label: "Stale", className: "border-amber-600/50 text-amber-800 dark:border-amber-400/50 dark:text-amber-300" },
  "carry-over": { icon: ArrowRight, label: "Carry-over", className: "border-amber-600/50 text-amber-800 dark:border-amber-400/50 dark:text-amber-300" },
  overload: { icon: Gauge, label: "Overload", className: "border-destructive/50 text-destructive" },
  dependency: { icon: LinkIcon, label: "Dependency", className: "text-muted-foreground" },
} as const;

/** The signals of an issue under its title: a small outlined badge with an icon and, after it, the short reason. */
function SignalBadges({ signals }: { signals: readonly Signal[] }) {
  if (signals.length === 0) return null;
  return (
    <ul aria-label="Signals" className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {signals.map((signal) => {
        const { icon: Icon, label, className } = SIGNAL_LOOKS[signal.kind];
        return (
          <li key={signal.kind} className="flex items-center gap-1.5">
            <Badge variant="outline" className={cn("gap-1 px-1.5 py-0", className)}>
              <Icon aria-hidden="true" focusable="false" />
              {label}
            </Badge>
            <span className="text-xs text-muted-foreground">{signal.reason}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** The status of an issue as a pill with an icon and its words: the state is never told by colour alone; `Publishing` turns, and stops turning with `motion-reduce`. */
export function StatusPill({ row }: { row: Pick<IssueRow, "state" | "github"> }) {
  const status = issueStatus(row, row.github);
  const { icon: Icon, className } = PILLS[status.look];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap", className)}>
      <Icon aria-hidden="true" focusable="false" className={cn("size-3.5", status.look === "publishing" && "animate-spin motion-reduce:animate-none")} />
      {status.label}
    </span>
  );
}

function Assignee({ handle, members }: { handle: string | null; members: TeamMessage["members"] }) {
  return handle === null ? (
    <span role="img" aria-label="No assignee" className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed text-xs text-muted-foreground">
      –
    </span>
  ) : (
    <span role="img" aria-label={`Assigned to @${handle}`} className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
      {avatarText(handle, members)}
    </span>
  );
}

function Problems({ row, signals }: { row: IssueRow; signals: readonly Signal[] }) {
  const failed = row.state === "not-published" && row.reason !== null;
  return (
    <>
      {failed ? (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <CircleAlert aria-hidden="true" focusable="false" className="size-3.5 shrink-0" />
          {`Publish failed: ${row.reason}`}
        </p>
      ) : null}
      {row.unset.length > 0 ? <p className="text-xs text-muted-foreground">{unsetText(row.unset)}</p> : null}
      <SignalBadges signals={signals} />
    </>
  );
}

/** A button of the Actions column; disabled with the reason as its tooltip. */
function ActionButton({ icon: Icon, label, reason, onClick }: { icon: typeof MessageSquare; label: string; reason: string | null; onClick: () => void }) {
  const button = (
    <Button type="button" variant="outline" size="sm" disabled={reason !== null} onClick={onClick}>
      <Icon aria-hidden="true" focusable="false" />
      {label}
    </Button>
  );
  return <Tip text={reason}>{reason === null ? button : <span className="inline-flex">{button}</span>}</Tip>;
}

function Actions({ row, signals, github, post }: { row: IssueRow; signals: readonly Signal[]; github: GitHubMessage | null; post: Post }) {
  if (row.state === "published") {
    const { url, number } = row;
    const reasons = number === null ? undefined : github?.actions[number];
    // `Comment update` on an open issue the Model changed under, `Scan` on a closed one; an issue GitHub no longer has has neither.
    const extra = row.github?.status === "Closed" ? "scan" : signals.some((signal) => signal.kind === "stale") ? "update" : null;
    const open = (
      <Button type="button" variant="ghost" size={extra === null ? "sm" : "icon"} aria-label="Open on GitHub" disabled={url === null} onClick={() => url !== null && post({ type: "openLink", url })}>
        <ExternalLink aria-hidden="true" focusable="false" />
        {extra === null ? "Open on GitHub" : null}
      </Button>
    );
    return (
      <>
        {extra === "update" ? <ActionButton icon={MessageSquare} label="Comment update" reason={reasons?.update ?? null} onClick={() => post({ type: "askIssueUpdate", issue: row.id })} /> : null}
        {extra === "scan" ? <ActionButton icon={ScanSearch} label="Scan" reason={reasons?.scan ?? null} onClick={() => post({ type: "scanIssue", issue: row.id })} /> : null}
        {extra === null ? open : <Tip text="Open on GitHub">{open}</Tip>}
      </>
    );
  }
  const blocked = row.state === "publishing" ? "The issues of this handoff are being published" : row.publishBlock;
  const button = (
    <Button type="button" variant="outline" size="sm" disabled={blocked !== null || row.state !== "not-published"} onClick={() => post({ type: "publishAgain", handoff: row.handoff })}>
      <Upload aria-hidden="true" focusable="false" />
      Publish again
    </Button>
  );
  return <Tip text={blocked}>{blocked === null ? button : <span className="inline-flex">{button}</span>}</Tip>;
}

function Row({ row, members, github, narrow, post }: { row: IssueRow; members: TeamMessage["members"]; github: GitHubMessage | null; narrow: boolean; post: Post }) {
  const signals = row.number === null ? [] : (github?.signals[row.number] ?? []);
  const number = row.number === null ? "–" : `#${row.number}`;
  return (
    <div role="row" className={cn("border-t", narrow ? "flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2" : "grid grid-cols-[4.5rem_minmax(0,1fr)_2rem_8rem_9rem_14rem] items-center gap-x-3 px-3 py-2")}>
      <span role="cell" className={cn("font-mono text-sm", narrow && "order-1")}>
        {number}
      </span>
      <div role="cell" className={cn("flex min-w-0 flex-col gap-0.5", narrow && "order-4 basis-full")}>
        <span className="text-sm font-medium break-words">{row.title}</span>
        <Problems row={row} signals={signals} />
      </div>
      <span role="cell" className={cn("flex justify-center", narrow && "order-5")}>
        <Assignee handle={row.assignee} members={members} />
      </span>
      <span role="cell" className={cn("text-sm", narrow && "order-6")}>
        {row.sprint ?? "No sprint"}
      </span>
      <span role="cell" className={cn(narrow && "order-2")}>
        <StatusPill row={row} />
      </span>
      <span role="cell" className={cn("flex items-center justify-end gap-1", narrow && "order-3 ml-auto")}>
        <Actions row={row} signals={signals} github={github} post={post} />
      </span>
    </div>
  );
}

function Group({ group, members, github, narrow, post }: { group: EpicGroup; members: TeamMessage["members"]; github: GitHubMessage | null; narrow: boolean; post: Post }) {
  const [folded, setFolded] = useState(false);
  const Chevron = folded ? ChevronRight : ChevronDown;
  return (
    <div role="rowgroup">
      <div role="row" className="flex items-center gap-2 border-t bg-muted/50 px-3 py-2 first:border-t-0">
        <button type="button" aria-expanded={!folded} aria-label={`${folded ? "Unfold" : "Fold"} ${group.label}`} className="flex size-6 items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setFolded(!folded)}>
          <Chevron aria-hidden="true" focusable="false" className="size-4" />
        </button>
        <EpicChip label={group.label} />
        <span className="text-xs text-muted-foreground">{groupText(group)}</span>
      </div>
      {folded ? null : group.rows.map((row) => <Row key={row.id} row={row} members={members} github={github} narrow={narrow} post={post} />)}
    </div>
  );
}

/** The Issues tab (`ui#issue`): the issues of the approved handoffs grouped by epic, with where each one is and what the Manager can do about it. */
export function IssuesTab({ snapshot, team, github = null, post }: { snapshot: Snapshot | null; team: TeamMessage | null; github?: GitHubMessage | null; post: Post }) {
  const { ref, narrow } = useNarrow(NARROW_ISSUES);
  const rows = withGitHub(snapshot?.issues ?? [], github?.issues ?? []);
  const groups = groupByEpic(rows);
  const members = team?.members ?? [];
  if (snapshot !== null && rows.length === 0) return <p className="px-1 py-6 text-sm text-muted-foreground">{ISSUES_EMPTY}</p>;
  return (
    <div ref={ref} className="flex flex-col gap-3">
      {snapshot === null ? null : <p className="text-xs text-muted-foreground">{issuesSummary(groups)}</p>}
      <div role="table" aria-label="Issues" className="overflow-hidden rounded-md border">
        {narrow ? null : (
          <div role="row" className="grid grid-cols-[4.5rem_minmax(0,1fr)_2rem_8rem_9rem_14rem] items-center gap-x-3 px-3 py-2 text-xs text-muted-foreground">
            <span role="columnheader">Issue</span>
            <span role="columnheader">Title</span>
            <span role="columnheader">
              <span className="sr-only">Assignee</span>
            </span>
            <span role="columnheader">Sprint</span>
            <span role="columnheader">Status</span>
            <span role="columnheader" className="text-right">
              Actions
            </span>
          </div>
        )}
        {groups.map((group) => (
          <Group key={group.label} group={group} members={members} github={github} narrow={narrow} post={post} />
        ))}
      </div>
    </div>
  );
}
