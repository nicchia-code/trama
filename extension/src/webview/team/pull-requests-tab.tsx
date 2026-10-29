import { CircleCheck, CircleDashed, Clock, ExternalLink, LoaderCircle, ScanSearch, Square, Table } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Snapshot } from "../../../../src/core/snapshot";
import type { PullRequestView, ToHost } from "../../protocol";
import { Tip, TipBadge } from "../board/parts";
import { cn } from "../lib/utils";
import type { ViewContext } from "../types";
import { Button } from "../ui/button";
import { useNow } from "./github";
import { NARROW_PULL_REQUESTS, orderPullRequests, PULL_REQUESTS_EMPTY, type PullRequestsMessage, pullRequestActions, pullRequestLine, pullRequestsSummary, pullRequestStatus, OUTDATED_TOOLTIP } from "./logic";
import { PullRequestReport } from "./pull-request-report";
import { useNarrow } from "./use-narrow";

type Post = (message: ToHost) => void;

const noop = (): void => {};

const LOOKS = {
  "not-checked": { icon: CircleDashed, className: "border-dashed border-border text-muted-foreground" },
  checking: { icon: LoaderCircle, className: "border-blue-600/40 bg-blue-600/10 text-blue-800 dark:border-blue-400/40 dark:bg-blue-400/15 dark:text-blue-300" },
  checked: { icon: CircleCheck, className: "border-green-600/40 bg-green-600/10 text-green-800 dark:border-green-400/40 dark:bg-green-400/15 dark:text-green-300" },
} as const;

/** The status of a row as a pill with an icon and its words, and, when the report is outdated, the badge `Outdated`: the state is never told by colour alone; `Checking…` turns, and stops turning with `motion-reduce`. */
function Status({ item, running, now }: { item: PullRequestView; running: number | null; now: number }) {
  const status = pullRequestStatus(item, running, now);
  const { icon: Icon, className } = LOOKS[status.look];
  return (
    <span className="flex flex-wrap items-center gap-1">
      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", className)}>
        <Icon aria-hidden="true" focusable="false" className={cn("size-3.5", status.look === "checking" && "animate-spin motion-reduce:animate-none")} />
        {status.label}
      </span>
      {status.outdated ? (
        <TipBadge tone="warning" tooltip={OUTDATED_TOOLTIP} className="gap-1 py-0.5 text-xs text-amber-900 dark:text-amber-300">
          <Clock aria-hidden="true" focusable="false" />
          Outdated
        </TipBadge>
      ) : null}
    </span>
  );
}

function Actions({ item, message, post, onReport }: { item: PullRequestView; message: PullRequestsMessage; post: Post; onReport: () => void }) {
  const actions = pullRequestActions(item, message);
  const check =
    actions.check === null ? null : (
      <Tip text={actions.check.reason}>
        <span className="inline-flex">
          <Button type="button" variant="outline" size="sm" disabled={actions.check.reason !== null} onClick={() => post({ type: "checkPullRequest", number: item.number })}>
            <ScanSearch aria-hidden="true" focusable="false" />
            {actions.check.label}
          </Button>
        </span>
      </Tip>
    );
  return (
    <>
      {check}
      {actions.stop ? (
        <Button type="button" variant="outline" size="sm" onClick={() => post({ type: "stopPullRequestCheck", number: item.number })}>
          <Square aria-hidden="true" focusable="false" />
          Stop
        </Button>
      ) : null}
      {actions.report ? (
        <Button type="button" id={`pull-request-report-${item.number}`} variant="ghost" size="sm" onClick={onReport}>
          <Table aria-hidden="true" focusable="false" />
          Report
        </Button>
      ) : null}
      <Tip text="Open on GitHub">
        <Button type="button" variant="ghost" size="icon" aria-label="Open on GitHub" onClick={() => post({ type: "openLink", url: item.url })}>
          <ExternalLink aria-hidden="true" focusable="false" />
        </Button>
      </Tip>
    </>
  );
}

function Row({ item, message, narrow, now, post, onReport }: { item: PullRequestView; message: PullRequestsMessage; narrow: boolean; now: number; post: Post; onReport: () => void }) {
  return (
    <li className={cn("border-t first:border-t-0", narrow ? "flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2" : "grid grid-cols-[4rem_minmax(0,1fr)_14rem_auto] items-center gap-x-3 px-3 py-2")}>
      <span className={cn("font-mono text-sm", narrow && "order-1")}>#{item.number}</span>
      <div className={cn("flex min-w-0 flex-col gap-0.5", narrow && "order-4 basis-full")}>
        <span className="text-sm font-medium break-words">{item.title}</span>
        <span className="text-xs break-words text-muted-foreground">{pullRequestLine(item)}</span>
      </div>
      <span className={cn(narrow && "order-2")}>
        <Status item={item} running={message.running} now={now} />
      </span>
      <span className={cn("flex items-center justify-end gap-1", narrow && "order-3 ml-auto")}>
        <Actions item={item} message={message} post={post} onReport={onReport} />
      </span>
    </li>
  );
}

/**
 * The `Pull Requests` tab, not offered by the Team view while the PR Check is hidden (`ui#pull-request-check`): a header with how many pull requests are ready for review and one row for each,
 * the highest number first, with its status and what the developer can do (`Check`, `Stop`, `Report`, `Open on GitHub`). `Report` opens the window of the report of the pull request,
 * which follows what the host sends: it closes when the pull request or its report is gone.
 */
export function PullRequestsTab({
  pullRequests = null,
  snapshot = null,
  post,
  navigate = noop,
}: {
  /** What the host sent last; null until it has. */
  pullRequests?: PullRequestsMessage | null;
  snapshot?: Snapshot | null;
  post: Post;
  navigate?: ViewContext["navigate"];
}) {
  const { ref, narrow } = useNarrow(NARROW_PULL_REQUESTS);
  const now = useNow();
  const [reporting, setReporting] = useState<number | null>(null);
  const closed = useRef<number | null>(null);
  // The focus goes back to the `Report` button the window was opened from, once the window is gone.
  useEffect(() => {
    if (reporting === null && closed.current !== null) {
      document.getElementById(`pull-request-report-${closed.current}`)?.focus();
      closed.current = null;
    }
  }, [reporting]);
  const items = orderPullRequests(pullRequests?.items ?? []);
  if (pullRequests === null || items.length === 0) return <p className="px-1 py-6 text-sm text-muted-foreground">{PULL_REQUESTS_EMPTY}</p>;
  const shown = reporting === null ? undefined : items.find((item) => item.number === reporting);
  return (
    <div ref={ref} className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{pullRequestsSummary(items.length)}</p>
      <ul aria-label="Pull requests" className="overflow-hidden rounded-md border">
        {items.map((item) => (
          <Row key={item.number} item={item} message={pullRequests} narrow={narrow} now={now} post={post} onReport={() => setReporting(item.number)} />
        ))}
      </ul>
      {shown?.report ? <PullRequestReport item={shown} report={shown.report} env={{ snapshot, navigate, openLink: (url) => post({ type: "openLink", url }) }} onClose={() => {
        closed.current = reporting;
        setReporting(null);
      }} /> : null}
    </div>
  );
}
