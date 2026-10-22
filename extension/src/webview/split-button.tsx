import { ChevronDown, type LucideIcon } from "lucide-react";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { cn } from "./lib/utils";

function Tip({ text, children }: { text: string | null | undefined; children: React.ReactElement }) {
  if (!text) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="whitespace-pre-line">{text}</TooltipContent>
    </Tooltip>
  );
}

/** One item of the menu the arrow opens. A disabled item stays in the menu, shows `reason` as its tooltip and accessible description, keeps the menu open and does nothing. */
export type SplitItem = { label: string; tooltip: string; onSelect: () => void; disabled?: boolean; reason?: string };

/**
 * The one split button of the webview: the main button on the left and, joined to it, an icon-only arrow that opens a menu.
 * The arrow is disabled whenever `arrowDisabled` says so, with `arrowReason`; both default to the main button's own.
 * `full` makes the container as wide as its parent, the main button taking only the room the arrow leaves (it grows and
 * shrinks, minimum width zero) and the arrow never shrinking; without it the button is as wide as its content and never wraps.
 * `reason` is why the button is disabled (its tooltip).
 */
export function SplitButton({
  icon: Icon,
  label,
  aria,
  tooltip,
  reason = null,
  disabled = false,
  variant = "outline",
  dashed = false,
  full = false,
  arrowIcon: ArrowIcon = ChevronDown,
  side = "bottom",
  arrowReason = reason,
  arrowDisabled = disabled,
  arrowName,
  items,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  /** The accessible name of the main button when its visible text is not enough. */
  aria?: string;
  /** The tooltip of the main button when it works. */
  tooltip: string;
  reason?: string | null;
  disabled?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  /** A dashed border on both parts. */
  dashed?: boolean;
  full?: boolean;
  arrowIcon?: LucideIcon;
  /** The side of the button the menu opens on. */
  side?: "top" | "bottom";
  arrowReason?: string | null;
  arrowDisabled?: boolean;
  /** The tooltip and accessible name of the arrow. */
  arrowName: string;
  items: SplitItem[];
  onClick: () => void;
}) {
  const main = (
    <Button variant={variant} size="sm" disabled={disabled} aria-label={aria} aria-description={(reason ?? tooltip) || undefined} className={cn("rounded-r-none", dashed && "border-dashed", full && "min-w-0 flex-1 shrink")} onClick={onClick}>
      <Icon aria-hidden="true" focusable="false" />
      {label}
    </Button>
  );
  const arrow = (
    <Button variant={variant} size="sm" disabled={arrowDisabled} aria-disabled={arrowDisabled} aria-label={arrowName} aria-description={arrowReason ?? undefined} className={cn("-ml-px shrink-0 rounded-l-none px-2", dashed && "border-dashed")}>
      <ArrowIcon aria-hidden="true" focusable="false" />
    </Button>
  );
  return (
    <div className={cn("flex max-w-full", full ? "w-full" : "inline-flex")}>
      <Tip text={reason ?? tooltip}>{disabled ? <span className={cn("inline-flex", full && "min-w-0 flex-1")}>{main}</span> : main}</Tip>
      {arrowDisabled ? (
        <Tip text={arrowReason ?? arrowName}>
          <span className="inline-flex shrink-0">{arrow}</span>
        </Tip>
      ) : (
        <DropdownMenu>
          <Tip text={arrowName}>
            <DropdownMenuTrigger asChild>{arrow}</DropdownMenuTrigger>
          </Tip>
          <DropdownMenuContent side={side} align="end">
            {items.map((item) =>
              item.disabled === true ? (
                <Tip key={item.label} text={item.reason ?? item.tooltip}>
                  <span className="block">
                    <DropdownMenuItem disabled aria-disabled="true" aria-description={item.reason ?? item.tooltip} onSelect={(event) => event.preventDefault()}>
                      {item.label}
                    </DropdownMenuItem>
                  </span>
                </Tip>
              ) : (
                <Tip key={item.label} text={item.tooltip}>
                  <DropdownMenuItem onSelect={item.onSelect}>{item.label}</DropdownMenuItem>
                </Tip>
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
