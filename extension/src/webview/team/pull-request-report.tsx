import { CircleCheck, Clock, ExternalLink } from "lucide-react";
import type { ReportRow } from "../../../../src/core/pr-check";
import type { Snapshot } from "../../../../src/core/snapshot";
import type { PullRequestReportView, PullRequestView } from "../../protocol";
import { RefChip } from "../board/parts";
import type { ViewContext } from "../types";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { branchesLine, checkedLine, groupReportRows, NARROW_REPORT, outdatedNote, referenceExists, REPORT_EMPTY, reportCell, type ReportGroup, reportTitle } from "./logic";
import { useNarrow } from "./use-narrow";

/** What the window of a report needs of the page that holds it: the open folder's snapshot (a reference opens its focus only if it exists there) and the page's own navigation and links. */
export interface ReportEnv {
  snapshot: Snapshot | null;
  navigate: ViewContext["navigate"];
  openLink: ViewContext["openLink"];
}

/** The `Reference` of a row: a chip that opens its focus when it exists in the open folder, monospace text when it does not, `–` when the row has none. */
function Reference({ row, env }: { row: ReportRow; env: ReportEnv }) {
  if (row.ref === null) return <span className="text-muted-foreground">{reportCell(null)}</span>;
  if (referenceExists(env.snapshot, row.ref)) return <RefChip reference={row.ref} go={env.navigate} />;
  return <code className="font-mono text-xs break-all">{row.ref}</code>;
}

/** `Where in the code`: monospace text, `–` when empty. */
function Where({ value }: { value: string | null }) {
  const text = reportCell(value);
  return value === null || text !== value ? <span className="text-muted-foreground">{text}</span> : <code className="font-mono text-xs break-all">{value}</code>;
}

function GroupHeading({ group }: { group: ReportGroup }) {
  return (
    <>
      {group.name} <span className="font-normal text-muted-foreground">{group.rows.length}</span>
    </>
  );
}

/** The table, one group of rows per section. */
function ReportTable({ groups, env }: { groups: readonly ReportGroup[]; env: ReportEnv }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead scope="col">Section</TableHead>
          <TableHead scope="col">Reference</TableHead>
          <TableHead scope="col">Finding</TableHead>
          <TableHead scope="col">Source</TableHead>
          <TableHead scope="col">Where in the code</TableHead>
        </TableRow>
      </TableHeader>
      {groups.map((group) => (
        <TableBody key={group.section}>
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead scope="rowgroup" colSpan={5} className="py-1.5 text-xs font-semibold text-foreground">
              <GroupHeading group={group} />
            </TableHead>
          </TableRow>
          {group.rows.map((row, at) => (
            <TableRow key={`${row.ref ?? ""}|${at}`}>
              <TableCell className="text-xs text-muted-foreground">{group.name}</TableCell>
              <TableCell>
                <Reference row={row} env={env} />
              </TableCell>
              <TableCell className="break-words whitespace-pre-wrap">{row.finding}</TableCell>
              <TableCell className="whitespace-nowrap">{row.source}</TableCell>
              <TableCell>
                <Where value={row.where} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      ))}
    </Table>
  );
}

/** Narrower than `NARROW_REPORT` each row is a block: reference and source on the first line, the finding below, `Where in the code` last. */
function ReportBlocks({ groups, env }: { groups: readonly ReportGroup[]; env: ReportEnv }) {
  return (
    <div className="divide-y">
      {groups.map((group) => (
        <section key={group.section} aria-label={group.name}>
          <h3 className="bg-muted px-3 py-1.5 text-xs font-semibold">
            <GroupHeading group={group} />
          </h3>
          <ul className="divide-y">
            {group.rows.map((row, at) => (
              <li key={`${row.ref ?? ""}|${at}`} className="flex flex-col gap-1 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <Reference row={row} env={env} />
                  <span className="text-xs text-muted-foreground">{row.source}</span>
                </div>
                <p className="break-words whitespace-pre-wrap">{row.finding}</p>
                <Where value={row.where} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * `Report` of the Pull Requests tab (`ui#pull-request-report`): a window over the view with what the last PR Check of the pull request found, up to 960 px wide. The page mounts it
 * while the window is open and `onClose` unmounts it; Escape closes it too. `report` is the report on show.
 */
export function PullRequestReport({ item, report, env, onClose }: { item: PullRequestView; report: PullRequestReportView; env: ReportEnv; onClose: () => void }) {
  const { ref, narrow } = useNarrow(NARROW_REPORT);
  const groups = groupReportRows(report.rows);
  const outdated = outdatedNote(report);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-[min(960px,calc(100%-2rem))]">
        <DialogHeader>
          <DialogTitle className="leading-snug">{reportTitle(item.number, item.title)}</DialogTitle>
          <DialogDescription>{checkedLine(report)}</DialogDescription>
          <p className="text-sm text-muted-foreground">{branchesLine(item.baseRefName, item.headRefName)}</p>
        </DialogHeader>
        {outdated === null ? null : (
          <p role="status" className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
            <Clock aria-hidden="true" focusable="false" className="size-4 shrink-0" />
            {outdated}
          </p>
        )}
        <div ref={ref}>
          {groups.length === 0 ? (
            <p className="flex items-center gap-2 text-sm">
              <CircleCheck aria-hidden="true" focusable="false" className="size-5 shrink-0 text-green-700 dark:text-green-400" />
              {REPORT_EMPTY}
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border">{narrow ? <ReportBlocks groups={groups} env={env} /> : <ReportTable groups={groups} env={env} />}</div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => env.openLink(item.url)}>
            <ExternalLink aria-hidden="true" focusable="false" />
            Open on GitHub
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
