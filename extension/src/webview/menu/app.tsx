import { FolderOpen, History, ListChecks, type LucideIcon, Network, Package, Rocket, Search, Settings, SquareKanban } from "lucide-react";
import type { ReactElement } from "react";
import type { MenuState, MenuViewName, ToMenuHost } from "../../menu-protocol";
import { cn } from "../lib/utils";
import { scanButtonLabel } from "../scan-label";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { ENTRY_LABELS, entryName, entryTooltip, PROJECT_ENTRIES } from "./logic";

const ICONS: Record<MenuViewName, LucideIcon> = {
  board: SquareKanban,
  diagram: Network,
  requirements: ListChecks,
  specs: Package,
  history: History,
  settings: Settings,
  getstarted: Rocket,
};

/** A tooltip around one element; with no text the element stays as it is. */
function Tip({ text, children }: { text: string; children: ReactElement }) {
  if (text === "") return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

/** One entry: a button as wide as the view, its icon at 16 px to the left of the text, the one of the view the panel shows highlighted. */
function Entry({ view, state, post }: { view: MenuViewName; state: MenuState; post: (message: ToMenuHost) => void }) {
  const Icon = ICONS[view];
  const shown = state.panelView === view;
  const awaiting = view === "board" ? state.decisions : 0;
  return (
    <Tip text={entryTooltip(view)}>
      <Button
        variant="ghost"
        aria-label={entryName(view, state.decisions)}
        aria-current={shown ? "page" : undefined}
        className={cn("w-full justify-start aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground")}
        onClick={() => post({ type: "show", view })}
      >
        <Icon aria-hidden="true" focusable="false" className="size-4" />
        {ENTRY_LABELS[view]}
        {awaiting > 0 ? <Badge className="ml-auto">{awaiting}</Badge> : null}
      </Button>
    </Tip>
  );
}

/** Scan System: the primary button, with its count, tooltip and the reason it is disabled when the Advisor Scanner is on. */
function ScanSystem({ state, post }: { state: MenuState; post: (message: ToMenuHost) => void }) {
  const label = scanButtonLabel("Scan System", state.tasksSinceScan, state.advisorScanner);
  const button = (
    <Button aria-label={label.ariaLabel} aria-description={label.tooltip || undefined} disabled={label.disabled} className="w-full justify-start" onClick={() => post({ type: "scan" })}>
      <Search aria-hidden="true" focusable="false" className="size-4" />
      {label.text}
    </Button>
  );
  // A disabled button takes no pointer events: its tooltip hangs on the span around it.
  return <Tip text={label.tooltip}>{label.disabled ? <span className="flex w-full">{button}</span> : button}</Tip>;
}

/** Settings stands alone at the bottom of the view, apart by a line. */
function Bottom({ state, post }: { state: MenuState; post: (message: ToMenuHost) => void }) {
  return (
    <div className="mt-auto border-t pt-2">
      <Entry view="settings" state={state} post={post} />
    </div>
  );
}

/** The side menu: what the window has open decides the entries (`menu-laterale`). Before the host's first state it draws nothing. */
export function MenuApp({ state, post }: { state: MenuState | null; post: (message: ToMenuHost) => void }) {
  if (state === null) return <div />;
  return (
    <TooltipProvider>
      <nav aria-label="Trama" className="flex h-full min-h-0 flex-col gap-1 p-2">
        {state.situation === "noFolder" ? (
          <>
            <p className="px-2 py-1 text-sm text-muted-foreground">Open a folder to use Trama.</p>
            <Button className="w-full justify-start" onClick={() => post({ type: "openFolder" })}>
              <FolderOpen aria-hidden="true" focusable="false" className="size-4" />
              Open Folder
            </Button>
          </>
        ) : state.situation === "notProject" ? (
          <Entry view="getstarted" state={state} post={post} />
        ) : (
          <>
            {PROJECT_ENTRIES.map((view) => (
              <Entry key={view} view={view} state={state} post={post} />
            ))}
            <div className="pt-3">
              <ScanSystem state={state} post={post} />
            </div>
          </>
        )}
        <Bottom state={state} post={post} />
      </nav>
    </TooltipProvider>
  );
}
