import { ChevronDown, type LucideIcon } from "lucide-react";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

function Tip({ text, children }: { text: string | null | undefined; children: React.ReactElement }) {
  if (!text) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="whitespace-pre-line">{text}</TooltipContent>
    </Tooltip>
  );
}

/**
 * The split button of `Reject` and `Dismiss Drift`: the usual button on the left and, joined to it, an icon-only arrow
 * that opens a menu with one item, «Rework with feedback…». The arrow is disabled whenever `disabled` says so, with the same reason.
 * `reason` is why the button is disabled (its tooltip); `arrowDisabled` and `arrowReason` default to the button's own.
 */
export function SplitButton({
  icon: Icon,
  label,
  aria,
  tooltip,
  reason = null,
  disabled = false,
  arrowReason = reason,
  arrowDisabled = disabled,
  arrowName,
  itemTooltip,
  onClick,
  onRework,
}: {
  icon: LucideIcon;
  label: string;
  /** The accessible name of the main button when its visible text is not enough. */
  aria?: string;
  /** The tooltip of the main button when it works. */
  tooltip: string;
  reason?: string | null;
  disabled?: boolean;
  arrowReason?: string | null;
  arrowDisabled?: boolean;
  /** The tooltip and accessible name of the arrow. */
  arrowName: string;
  /** The tooltip of the menu item. */
  itemTooltip: string;
  onClick: () => void;
  onRework: () => void;
}) {
  const main = (
    <Button variant="outline" size="sm" disabled={disabled} aria-label={aria} aria-description={(reason ?? tooltip) || undefined} className="rounded-r-none" onClick={onClick}>
      <Icon aria-hidden="true" focusable="false" />
      {label}
    </Button>
  );
  const arrow = (
    <Button variant="outline" size="sm" disabled={arrowDisabled} aria-disabled={arrowDisabled} aria-label={arrowName} aria-description={arrowReason ?? undefined} className="-ml-px rounded-l-none px-2">
      <ChevronDown aria-hidden="true" focusable="false" />
    </Button>
  );
  return (
    <div className="inline-flex">
      <Tip text={reason ?? tooltip}>{disabled ? <span className="inline-flex">{main}</span> : main}</Tip>
      {arrowDisabled ? (
        <Tip text={arrowReason ?? arrowName}>
          <span className="inline-flex">{arrow}</span>
        </Tip>
      ) : (
        <DropdownMenu>
          <Tip text={arrowName}>
            <DropdownMenuTrigger asChild>{arrow}</DropdownMenuTrigger>
          </Tip>
          <DropdownMenuContent side="bottom" align="end">
            <Tip text={itemTooltip}>
              <DropdownMenuItem onSelect={onRework}>Rework with feedback…</DropdownMenuItem>
            </Tip>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
