import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { tabKeyAction } from "../../../../src/core/omp-chat-view";
import type { ConversationItem } from "../../omp-chat-protocol";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { cn } from "../lib/utils";

export const tabId = (id: string) => `omp-chat-tab-${id}`;
export const panelId = (id: string) => `omp-chat-panel-${id}`;

/** The dot of a tab: animated while the agent is in a turn (still with reduced motion), in the colour of warnings while a form waits. */
function Dot({ state }: { state: ConversationItem["state"] }) {
  if (state === "idle") return null;
  return (
    <span
      aria-hidden="true"
      data-dot={state}
      className={cn("size-1.5 shrink-0 rounded-full", state === "running" ? "animate-pulse bg-blue-500 motion-reduce:animate-none" : "bg-amber-500")}
    />
  );
}

/**
 * The row of tabs, one per conversation in order of opening. It is a `tablist`: left and right move between the tabs, `Delete` closes one like its `X`. With more
 * tabs than fit the row scrolls sideways without a visible bar, and the chosen tab stays in view.
 */
export function ConversationTabs({ items, selected, onSelect, onClose }: { items: ConversationItem[]; selected: string | undefined; onSelect: (id: string) => void; onClose: (id: string) => void }) {
  const tabs = useRef(new Map<string, HTMLButtonElement>());
  const order = items.map((item) => item.id);
  useEffect(() => {
    if (selected === undefined) return;
    tabs.current.get(selected)?.scrollIntoView?.({ inline: "nearest", block: "nearest" });
  }, [selected, items.length]);
  return (
    <div role="tablist" aria-label="Conversations" aria-orientation="horizontal" className="flex shrink-0 overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const isSelected = item.id === selected;
        return (
          <div
            key={item.id}
            role="presentation"
            className={cn(
              "flex shrink-0 items-center border-b-2 pr-0.5 pl-2.5 transition-colors duration-150 motion-reduce:transition-none",
              isSelected ? "border-ring bg-background text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <button
              type="button"
              role="tab"
              id={tabId(item.id)}
              aria-selected={isSelected}
              aria-controls={panelId(item.id)}
              tabIndex={isSelected ? 0 : -1}
              ref={(element) => {
                if (element === null) tabs.current.delete(item.id);
                else tabs.current.set(item.id, element);
              }}
              onClick={() => onSelect(item.id)}
              onKeyDown={(event) => {
                const action = tabKeyAction(event.key, order, item.id);
                if (action === undefined) return;
                event.preventDefault();
                if ("select" in action) {
                  onSelect(action.select);
                  tabs.current.get(action.select)?.focus();
                } else onClose(action.close);
              }}
              className="flex h-8 items-center gap-1.5 rounded-sm text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{item.name}</span>
              <Dot state={item.state} />
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Close ${item.name}`}
                  onClick={() => onClose(item.id)}
                  className="ml-1 flex size-5 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{`Close ${item.name}`}</TooltipContent>
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
}
