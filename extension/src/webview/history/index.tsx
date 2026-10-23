import { useMemo, useState } from "react";
import { noNumbers } from "../../../../src/core/card-names";
import type { Snapshot } from "../../../../src/core/snapshot";
import { HistoryEntryView } from "../board/history";
import { HISTORY_EMPTY, HISTORY_PERIODS, type HistoryPeriod, historyGroups } from "../board/logic";
import { ViewEnvContext } from "../board/parts";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { TooltipProvider } from "../ui/tooltip";
import type { MountView, View } from "../types";

/**
 * The History view, full width: its title with the number of entries the period lets through and the period menu at the right, then the entries in one column,
 * latest first, grouped by day. The period is kept while the view refreshes and while the developer changes view; it is forgotten when the panel closes.
 */
export function HistoryPage({ snapshot, closed }: { snapshot: Snapshot | null; closed: number }) {
  const [period, setPeriod] = useState<HistoryPeriod>("week");
  const groups = useMemo(() => (snapshot === null ? [] : historyGroups(snapshot.history, period)), [snapshot, period]);
  if (snapshot === null) return <div />;
  const count = groups.reduce((n, group) => n + group.entries.length, 0);
  const now = new Date();
  return (
    <TooltipProvider>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">History</h2>
          <Badge variant="secondary" className="px-1.5 py-0 tabular-nums">
            {count}
          </Badge>
          <span className="flex-1" />
          <Select value={period} onValueChange={(value) => setPeriod(value as HistoryPeriod)}>
            <SelectTrigger aria-label="History period" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HISTORY_PERIODS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* A change of `closed` draws the entries anew, which closes a details window left open. */}
        <div key={closed} className="flex flex-col gap-3">
          {groups.length === 0 ? (
            <p className="my-3 text-center text-muted-foreground italic">{HISTORY_EMPTY}</p>
          ) : (
            groups.map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                <h3 className="mt-1 text-[11px] font-semibold text-muted-foreground">{group.heading}</h3>
                {group.entries.map((entry) => (
                  <HistoryEntryView key={entry.id} entry={entry} now={now} />
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

/** The History view: it has no state of its own but the period, which lives in the page. */
export const mountHistory: MountView = (slot, context) => {
  let snapshot: Snapshot | null = null;
  let closed = 0;
  const render = () => slot(<ViewEnvContext.Provider value={{ context, numbers: snapshot?.numbers ?? noNumbers }}><HistoryPage snapshot={snapshot} closed={closed} /></ViewEnvContext.Provider>);
  render();
  const view: View = {
    update(next) {
      snapshot = next;
      render();
    },
    show() {},
    hide() {
      closed++;
      render();
    },
  };
  return view;
};
