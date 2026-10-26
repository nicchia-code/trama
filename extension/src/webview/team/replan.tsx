import { CalendarSync, LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { ReplanView, ToHost } from "../../protocol";
import { BoardButton } from "../board/parts";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

/** The tooltip of `Replan` while it is available (`ui#proposal/Open`); when it is not, the tooltip is the reason. */
export const REPLAN_TOOLTIP = "Plan sprints and people again for all open handoffs";
export const REPLAN_DIALOG_TITLE = "Replan open handoffs?";

/** The text of the confirmation: what the agent does for `open` open handoffs, and, when some of them are stale, that those only count as load. */
export function replanDialogText(open: number, stale: number): string {
  const handoffs = open === 1 ? "1 open handoff" : `${open} open handoffs`;
  const main = `The agent plans sprint, assignee, reviewer and estimate again for the issues of ${handoffs}, keeping your changes. Each handoff it changes goes back to Draft until the agent hands it over again.`;
  if (stale === 0) return main;
  return `${main} ${stale === 1 ? "1 stale handoff only counts as load and does not change." : `${stale} stale handoffs only count as load and do not change.`}`;
}

/**
 * `Replan` in the header of the Decisions tab (`ui#proposal/Open`, `rules#developer.REPLAN_HANDOFFS`): `outline` with `CalendarSync`, disabled with the reason of the host while
 * it is not available; while a Replan runs, `LoaderCircle` turns in its place (still with `motion-reduce`). The click asks for confirmation, and only the confirmation sends
 * `replanHandoffs`: Esc and `Cancel` close the dialog and send nothing.
 */
export function ReplanControl({ replan, post }: { replan: ReplanView; post: (message: ToHost) => void }) {
  const [asking, setAsking] = useState(false);
  const confirm = () => {
    setAsking(false);
    post({ type: "replanHandoffs" });
  };
  return (
    <>
      <BoardButton
        icon={replan.running ? LoaderCircle : CalendarSync}
        label="Replan"
        variant="outline"
        disabled={replan.block !== null}
        tooltip={replan.block ?? REPLAN_TOOLTIP}
        {...(replan.running ? { className: "[&_svg]:animate-spin motion-reduce:[&_svg]:animate-none" } : {})}
        onClick={() => setAsking(true)}
      />
      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{REPLAN_DIALOG_TITLE}</DialogTitle>
            <DialogDescription>{replanDialogText(replan.open, replan.stale)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAsking(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirm}>
              <CalendarSync aria-hidden="true" focusable="false" />
              Replan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
