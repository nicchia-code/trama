import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

export interface FocusBarProps {
  /** What the focus is of: `Proposal P3 – title`, `Task T3 – title` or the reference of a chip. */
  title: string;
  /** The current step's name: the level, the section, the Area or the field; empty when no step is current. */
  stepName: string;
  /** Position of the current step; -1 when the level shown has none of the focus. */
  index: number;
  count: number;
  /** The references the tab does not have. */
  missing: string[];
  onPrevious(): void;
  onNext(): void;
  onClear(): void;
  /** `Only these` of the Requirements: undefined in the other tabs, which have no such switch. */
  only?: { pressed: boolean; onToggle(): void };
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick(): void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button variant="outline" size="icon" className="size-7" aria-label={label} aria-description={label} disabled={disabled} onClick={onClick}>
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** The bar at the top of a tab that has a focus: what it is of, the step, the counter, the arrows, what is not found, `Only these` and `Clear`. */
export function FocusBar({ title, stepName, index, count, missing, onPrevious, onNext, onClear, only }: FocusBarProps) {
  const several = count > 1;
  return (
    <TooltipProvider>
      <div role="region" aria-label="Focus" className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-1.5">
        <span className="min-w-0 truncate font-semibold" title={title}>
          {title}
        </span>
        {/* Announced when the step changes, so the colour is not the only signal. */}
        <span className="flex items-center gap-2" aria-live="polite" aria-atomic="true">
          {stepName ? <span className="min-w-0 truncate text-muted-foreground">{stepName}</span> : null}
          {several ? <span className="text-muted-foreground tabular-nums">{`${index < 0 ? "–" : index + 1} of ${count}`}</span> : null}
        </span>
        {several ? (
          <span className="inline-flex gap-0.5" role="group" aria-label="Focus steps">
            <IconButton label="Previous" disabled={index === 0} onClick={onPrevious}>
              <ChevronLeft aria-hidden="true" focusable="false" />
            </IconButton>
            <IconButton label="Next" disabled={index === count - 1} onClick={onNext}>
              <ChevronRight aria-hidden="true" focusable="false" />
            </IconButton>
          </span>
        ) : null}
        {missing.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="cursor-default text-sm text-muted-foreground" aria-label={`${missing.length} not found: ${missing.join(", ")}`}>
                {`${missing.length} not found`}
              </span>
            </TooltipTrigger>
            <TooltipContent className="whitespace-pre-line">{missing.join("\n")}</TooltipContent>
          </Tooltip>
        ) : null}
        <span className="flex-1" />
        {only ? (
          <Button variant={only.pressed ? "secondary" : "outline"} size="sm" aria-pressed={only.pressed} onClick={only.onToggle}>
            Only these
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={onClear}>
          <X aria-hidden="true" focusable="false" />
          Clear
        </Button>
      </div>
    </TooltipProvider>
  );
}
