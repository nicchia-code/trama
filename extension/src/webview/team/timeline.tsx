import { CalendarOff, ExternalLink, TriangleAlert } from "lucide-react";
import type { CSSProperties } from "react";
import type { Snapshot } from "../../../../src/core/snapshot";
import type { SignalKind } from "../../../../src/core/timeline";
import type { ToHost } from "../../protocol";
import { tagColour } from "../board/logic";
import { Tip } from "../board/parts";
import { cn } from "../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { DOT, EpicChip } from "./decisions-tab";
import { useNow } from "./github";
import {
  ADD_ITERATIONS,
  type AbsenceBlock,
  daysText,
  type GitHubMessage,
  type IssueBlock,
  loadSpoken,
  loadText,
  missingSprintsText,
  projectSettingsUrl,
  TIMELINE_EMPTY,
  TIMELINE_SCALE,
  type TimelineCell,
  type TimelineColumn,
  type TimelineLane,
  type TimelineMode,
  timelineOf,
  todayOf,
  unestimatedText,
  withGitHub,
} from "./logic";
import type { TeamMessage } from "./people-tab";

type Post = (message: ToHost) => void;

/** The width of the column of the lanes, and the least width of each sprint's column: under their sum the grid scrolls sideways inside its card. */
const LANE_WIDTH = 220;
const COLUMN_MIN_WIDTH = 150;

/** A faint diagonal hatch in the border colour: the column of the issues with no sprint and the absences. */
const HATCH: CSSProperties = { backgroundImage: "repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in oklab, var(--border) 80%, transparent) 6px 7px)" };

/** The left border of a block that has a signal: the signal's colour (`ui#issue/Published`). */
const SIGNAL_BORDER: Record<SignalKind, string> = {
  stale: "border-l-amber-600 dark:border-l-amber-400",
  "carry-over": "border-l-amber-600 dark:border-l-amber-400",
  overload: "border-l-destructive",
  dependency: "border-l-muted-foreground",
};

function IssueBlockView({ block, post }: { block: IssueBlock; post: Post }) {
  const number = `#${block.number}`;
  const colour = block.epic === "" ? "bg-muted-foreground" : DOT[tagColour(block.epic)];
  const button = (
    <button
      type="button"
      aria-label={block.name}
      data-signal={block.signal ?? undefined}
      disabled={block.url === null}
      style={{ width: `${block.fraction * 100}%`, minWidth: `calc(${number.length + 1}ch + 1.75rem)` }}
      className={cn(
        "flex h-7 max-w-full shrink-0 items-center gap-1.5 overflow-hidden rounded-md border bg-card px-2 text-xs shadow-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none",
        block.signal !== null && cn("border-l-[3px]", SIGNAL_BORDER[block.signal]),
        block.closed && "opacity-60",
      )}
      onClick={() => block.url !== null && post({ type: "openLink", url: block.url })}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", colour)} />
      <span aria-hidden="true" className={cn("shrink-0 font-mono", block.closed && "line-through")}>
        {number}
      </span>
      <span aria-hidden="true" className="min-w-0 flex-1 truncate">
        {block.title}
      </span>
      {block.days === null ? null : (
        <span aria-hidden="true" className="shrink-0 text-muted-foreground">
          {daysText(block.days)}
        </span>
      )}
    </button>
  );
  return <Tip text={block.name}>{button}</Tip>;
}

function OffBlock({ block }: { block: AbsenceBlock }) {
  return (
    <div style={{ ...HATCH, width: `${block.fraction * 100}%`, minWidth: "2.25rem" }} className="flex h-7 max-w-full shrink-0 items-center gap-1.5 overflow-hidden rounded-md border border-dashed px-2 text-xs text-muted-foreground">
      <CalendarOff aria-hidden="true" focusable="false" className="size-3.5 shrink-0" />
      <span className="truncate">{block.text}</span>
    </div>
  );
}

function Cell({ cell, column, post }: { cell: TimelineCell; column: TimelineColumn; post: Post }) {
  const { load } = cell;
  const note = load === null ? null : unestimatedText(load.unestimated);
  return (
    <td style={column.iteration === null ? HATCH : undefined} className={cn("border-r border-b p-0 align-top last:border-r-0", column.current && "bg-primary/5", column.iteration === null && "border-l border-dashed")}>
      <div className="flex min-h-28 flex-col gap-1.5 p-2">
        {cell.blocks.map((block) => (block.kind === "issue" ? <IssueBlockView key={block.key} block={block} post={post} /> : <OffBlock key={block.key} block={block} />))}
        {load === null ? null : (
          <Tip text={note}>
            <span className={cn("mt-auto self-end pt-1 font-mono text-[11px]", load.over ? "text-destructive" : "text-muted-foreground")}>
              <span aria-hidden="true">{loadText(load)}</span>
              <span className="sr-only">{`${loadSpoken(load)}${note === null ? "" : `, ${note}`}`}</span>
            </span>
          </Tip>
        )}
        {cell.epicDays === null ? null : <span className="mt-auto self-end pt-1 font-mono text-[11px] text-muted-foreground">{daysText(cell.epicDays)}</span>}
      </div>
    </td>
  );
}

function LaneHeader({ lane }: { lane: TimelineLane }) {
  return (
    <th scope="row" className="sticky left-0 z-10 border-r border-b bg-card p-3 text-left align-top font-normal">
      <div className="flex items-start gap-2">
        {lane.initials === null ? null : (
          <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
            {lane.initials}
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          {lane.kind === "epic" ? <EpicChip label={lane.title} /> : <span className={cn("truncate text-sm font-medium", lane.kind !== "member" && "text-muted-foreground")}>{lane.title}</span>}
          {lane.detail === null ? null : <span className="text-xs text-muted-foreground">{lane.detail}</span>}
        </div>
      </div>
    </th>
  );
}

/** The roadmap in time of the linked Project (`ui#github-project/Linked`): sprints as columns, people or epics as lanes, the issues as blocks as wide as their estimate. View only: sprints, estimates and assignees change on GitHub. */
export function TimelineTab({
  snapshot,
  team,
  github,
  mode,
  onModeChange,
  post,
}: {
  snapshot: Snapshot | null;
  team: TeamMessage | null;
  github: GitHubMessage | null;
  mode: TimelineMode;
  onModeChange: (mode: TimelineMode) => void;
  post: Post;
}) {
  const now = useNow();
  const project = github?.project ?? null;
  const model = timelineOf({
    iterations: project?.iterations ?? [],
    rows: withGitHub(snapshot?.issues ?? [], github?.issues ?? []),
    loads: github?.loads ?? [],
    members: team?.members ?? [],
    today: todayOf(now),
    mode,
    signals: github?.signals ?? {},
  });
  const owner = github?.linked?.owner ?? "";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Tabs value={mode} onValueChange={(value) => onModeChange(value === "epic" ? "epic" : "person")}>
          <TabsList aria-label="Group the timeline">
            <TabsTrigger value="person">By person</TabsTrigger>
            <TabsTrigger value="epic">By epic</TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="text-xs text-muted-foreground">{TIMELINE_SCALE}</span>
      </div>
      {project !== null && model.missing !== null ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-md border border-amber-600 bg-amber-600/10 px-3 py-2 text-sm dark:border-amber-400 dark:bg-amber-400/15">
          <p className="flex items-center gap-2">
            <TriangleAlert aria-hidden="true" focusable="false" className="size-4 shrink-0 text-amber-700 dark:text-amber-400" />
            {missingSprintsText(model.missing.after)}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => post({ type: "openLink", url: projectSettingsUrl(project, owner) })}>
            <ExternalLink aria-hidden="true" focusable="false" />
            {ADD_ITERATIONS}
          </Button>
        </div>
      ) : null}
      {snapshot !== null && model.empty ? <p className="text-sm text-muted-foreground">{TIMELINE_EMPTY}</p> : null}
      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm" style={{ minWidth: LANE_WIDTH + model.columns.length * COLUMN_MIN_WIDTH }}>
          <caption className="sr-only">{mode === "person" ? "Issues by person and sprint" : "Issues by epic and sprint"}</caption>
          <colgroup>
            <col style={{ width: LANE_WIDTH }} />
            {model.columns.map((column) => (
              <col key={column.key} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 border-r border-b bg-card p-3 text-left align-top text-xs font-normal text-muted-foreground">
                {mode === "person" ? "Person" : "Epic"}
              </th>
              {model.columns.map((column) => (
                <th key={column.key} scope="col" className={cn("border-r border-b p-3 text-left align-top font-normal last:border-r-0", column.current && "bg-primary/5", column.iteration === null && "border-l border-dashed")}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={cn("font-medium", column.iteration === null && "text-muted-foreground")}>{column.title}</span>
                    {column.current ? <Badge>Current</Badge> : null}
                  </div>
                  {column.dates === "" ? null : <div className="text-xs text-muted-foreground">{column.dates}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.lanes.map((lane) => (
              <tr key={lane.key}>
                <LaneHeader lane={lane} />
                {lane.cells.map((cell, index) => (
                  <Cell key={model.columns[index]?.key ?? index} cell={cell} column={model.columns[index] as TimelineColumn} post={post} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
