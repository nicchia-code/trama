import { Info } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { ToHost } from "../../protocol";
import { Checkbox } from "../ui/checkbox";
import { MANAGER_EXPLANATION, MANAGER_NEEDS_GITHUB_TEXT, MANAGER_TITLE, type ManagerState, ORIGIN_ON_GITHUB_TEXT } from "./logic";

/** What the repository of origin looks like: `<owner>/<repo>` in the monospace font and `origin on GitHub`, or the reason there is none. */
function OriginText({ repository, reason }: { repository: string | null; reason: string | null }) {
  if (repository === null) return <>{reason}</>;
  return (
    <>
      <span className="font-mono">{repository}</span> · {ORIGIN_ON_GITHUB_TEXT}
    </>
  );
}

/** The box of the wizard's Project step above the `Manager Mode` row: `Repository` on the left and what origin says on the right. */
export function OriginBox({ repository, reason }: { repository: string | null; reason: string | null }) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border px-4 py-3">
      <span className="text-muted-foreground">Repository</span>
      <span className="min-w-0 wrap-anywhere text-right">
        <OriginText repository={repository} reason={reason} />
      </span>
    </div>
  );
}

export interface ManagerModeRowProps {
  /** The value the row shows; it is shown off whenever origin is not on GitHub. */
  checked: boolean;
  /** The GitHub repository of origin; without one the `Checkbox` is off and disabled, with the reason it is. */
  repository: string | null;
  /** Why there is no repository: `No origin remote` or `Origin is not on GitHub`. */
  reason: string | null;
  /** A write is under way: the control is disabled. */
  busy?: boolean;
  /** Whether the row tells the repository itself (the Settings tab) or leaves it to the box above (the wizard). */
  showRepository?: boolean;
  onChange: (on: boolean) => void;
}

/**
 * The `Manager Mode` row, as the Settings tab and the wizard's Project step show it: bold title with the `Checkbox` at its left, the description, and, without origin on GitHub, the `Info`
 * line that says what it needs. In the Settings tab the line with the repository of origin follows. It has the layout of the `Solo Mode` row.
 */
export function ManagerModeRow({ checked, repository, reason, busy = false, showRepository = true, onChange }: ManagerModeRowProps) {
  const id = useId();
  const available = repository !== null;
  const describedBy = [`${id}-explain`, available ? null : `${id}-needs`, showRepository ? `${id}-repository` : null].filter((part) => part !== null).join(" ");
  return (
    <div className="grid min-w-0 gap-1.5">
      <div className="flex min-w-0 items-start gap-2">
        <span className="mt-1 flex">
          <Checkbox id={`${id}-manager`} aria-label={MANAGER_TITLE} aria-describedby={describedBy} className="shrink-0" checked={available && checked} disabled={busy || !available} onCheckedChange={(next) => onChange(next === true)} />
        </span>
        <label htmlFor={`${id}-manager`} className="min-w-0 font-semibold wrap-anywhere">
          {MANAGER_TITLE}
        </label>
      </div>
      <div className="grid min-w-0 gap-1.5 pl-6">
        <p id={`${id}-explain`} className="m-0 text-sm text-muted-foreground wrap-anywhere">
          {MANAGER_EXPLANATION}
        </p>
        {available ? null : (
          <p id={`${id}-needs`} className="m-0 flex items-start gap-2 text-sm text-muted-foreground wrap-anywhere">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0">{MANAGER_NEEDS_GITHUB_TEXT}</span>
          </p>
        )}
        {showRepository ? (
          <p id={`${id}-repository`} className="m-0 text-sm text-muted-foreground wrap-anywhere">
            {available ? "Repository: " : null}
            <OriginText repository={repository} reason={reason} />
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The row of the Settings tab, driven by the host's `managerMode`: a change shows at once, disables the control and is sent as `setManagerMode`; the host answers with the real value
 * (`generation` counts its messages), which replaces what was chosen, so a failed write puts the control back.
 */
export function ManagerModeSetting({ state, generation, post }: { state: ManagerState; generation: number; post: (message: ToHost) => void }) {
  const [picked, setPicked] = useState<boolean | null>(null);
  useEffect(() => setPicked(null), [generation]);
  return (
    <ManagerModeRow
      checked={picked ?? state.recorded}
      repository={state.repository}
      reason={state.reason}
      busy={picked !== null}
      onChange={(on) => {
        setPicked(on);
        post({ type: "setManagerMode", on });
      }}
    />
  );
}
