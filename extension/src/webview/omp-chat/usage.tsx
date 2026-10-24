import { Gauge, Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { barLabel, barTooltip, fetchedText, modelProvider, usageLevel, usagePercent, windowDetail, windowTooltip, type UsageLevel, type UsageWindow } from "../../../../src/core/omp-usage";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { cn } from "../lib/utils";
import type { UsageView } from "./state";

/** How often the durations of the bar and of the dialog are written again, while either is visible. */
const TICK_MS = 30_000;

const RING_SIZE = 14;
const RING_STROKE = 2;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** The colour of a ring and of its percentage: secondary text, the colour of warnings from 80 %, the colour of errors at 100 %. */
const LEVEL_CLASS: Record<UsageLevel, string> = { ok: "text-muted-foreground", warning: "text-amber-500", error: "text-destructive" };

/** The progress ring of a window: two circles, the second dashed to the fraction used. Decorative. */
function Ring({ fraction, level }: { fraction: number; level: UsageLevel }) {
  const used = Math.min(1, Math.max(0, fraction));
  return (
    <svg aria-hidden="true" width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className={cn("shrink-0", LEVEL_CLASS[level])}>
      <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" stroke="currentColor" strokeWidth={RING_STROKE} opacity={0.25} />
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={RING_STROKE}
        strokeDasharray={`${used * RING_LENGTH} ${RING_LENGTH}`}
        transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
      />
    </svg>
  );
}

const levelOf = (window: UsageWindow): UsageLevel => usageLevel(usagePercent(window.usedFraction));

/** Draws again every 30 seconds while `active`, so the durations that are computed at drawing follow the clock. */
function useTick(active: boolean): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setTick((tick) => tick + 1), TICK_MS);
    return () => clearInterval(timer);
  }, [active]);
}

/**
 * The usage of the subscription in General (`ui#omp-chat-general`): a small bar in the row under the message field, right of the model selector, with an entry for each
 * window of the provider of General's model, and the dialog with every provider. The bar is one button that opens the dialog; its entries wrap onto more lines in the space
 * right of the selector. With no data for that provider it is a compact `Usage` button; with no report at all it is nothing. Opening the dialog asks the host for the usage
 * again.
 */
export function UsageBar({ usage, model, active, onRefresh }: { usage: UsageView; model: string | undefined; active: boolean; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<number>();
  const report = usage.report;
  const hasData = report !== undefined && report.providers.length > 0;
  useTick(active && hasData);
  // A report with no provider takes the bar away, and the dialog with it.
  useEffect(() => {
    if (!hasData) setOpen(false);
  }, [hasData]);
  if (report === undefined || !hasData) return null;
  const now = Date.now();
  const provider = report.providers.find((each) => each.id === modelProvider(model));
  const show = () => {
    setOpen(true);
    onRefresh();
  };
  const hoveredWindow = hovered === undefined ? undefined : provider?.windows[hovered];
  return (
    <div data-usage-bar className="flex min-w-0 flex-1 items-center text-xs">
      {provider === undefined ? (
        <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-xs text-muted-foreground" onClick={show}>
          <Gauge />
          Usage
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={barLabel(provider)}
              onClick={show}
              className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {provider.windows.map((window, index) => (
                <span key={`${index}-${window.short}`} data-usage-entry onPointerEnter={() => setHovered(index)} onPointerLeave={() => setHovered(undefined)} className="flex items-center gap-1">
                  <Ring fraction={window.usedFraction} level={levelOf(window)} />
                  <span className="text-muted-foreground">{window.short}</span>
                  <span className={LEVEL_CLASS[levelOf(window)]}>{usagePercent(window.usedFraction)}%</span>
                </span>
              ))}
            </button>
          </TooltipTrigger>
          <TooltipContent>{hoveredWindow === undefined ? barTooltip(provider) : windowTooltip(hoveredWindow, now)}</TooltipContent>
        </Tooltip>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usage</DialogTitle>
            <DialogDescription className="flex items-center gap-1.5">
              {fetchedText(report.generatedAt, now)}
              {usage.fetching ? <Loader aria-label="Fetching usage" className="size-3.5 animate-spin motion-reduce:animate-none" /> : null}
            </DialogDescription>
            {usage.error === undefined ? null : <p className="text-sm text-muted-foreground">{`Could not refresh: ${usage.error}.`}</p>}
          </DialogHeader>
          {report.providers.map((each) => (
            <section key={each.id} aria-label={each.name} className="flex flex-col gap-1.5">
              <h3 className="text-sm font-medium">{each.name}</h3>
              <ul className="flex flex-col gap-1">
                {each.windows.map((window, index) => (
                  <li key={`${index}-${window.short}`} className="flex items-center gap-2 text-sm">
                    <Ring fraction={window.usedFraction} level={levelOf(window)} />
                    <span className="w-16 shrink-0 text-foreground">{window.short}</span>
                    <span className={LEVEL_CLASS[levelOf(window)]}>{windowDetail(window, now)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}
