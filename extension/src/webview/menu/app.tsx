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

/** One entry: a button as wide as the view, its icon at 16 px to the left of the text, the one of the view the panel shows highlighted. Under 200 px the view shows only the icon, centred; the tooltip always names the entry. */
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
        className={cn("w-full justify-start @max-[200px]:justify-center aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground")}
        onClick={() => post({ type: "show", view })}
      >
        <Icon aria-hidden="true" focusable="false" className="size-4" />
        <span className="@max-[200px]:hidden">{ENTRY_LABELS[view]}</span>
        {awaiting > 0 ? <Badge className="ml-auto @max-[200px]:hidden">{awaiting}</Badge> : null}
      </Button>
    </Tip>
  );
}

/** Scan System, at the foot of the view with Settings: a ghost button as wide as the view, icon and text to the left. Its tooltip is always there: `Scan System`, and after ` · ` the tooltip of its count or of the Advisor Scanner when it has one. */
function ScanSystem({ state, post }: { state: MenuState; post: (message: ToMenuHost) => void }) {
  const label = scanButtonLabel("Scan System", state.tasksSinceScan, state.advisorScanner);
  const button = (
    <Button variant="ghost" aria-label={label.ariaLabel} aria-description={label.tooltip || undefined} disabled={label.disabled} className="w-full justify-start @max-[200px]:justify-center" onClick={() => post({ type: "scan" })}>
      <Search aria-hidden="true" focusable="false" className="size-4" />
      <span className="@max-[200px]:hidden">{label.text}</span>
    </Button>
  );
  const tooltip = label.tooltip ? `Scan System · ${label.tooltip}` : "Scan System";
  // A disabled button takes no pointer events: its tooltip hangs on the span around it.
  return <Tip text={tooltip}>{label.disabled ? <span className="flex w-full">{button}</span> : button}</Tip>;
}

/** The foot of the view, apart by a line: Scan System (only in a project), then Settings. */
function Bottom({ state, post }: { state: MenuState; post: (message: ToMenuHost) => void }) {
  return (
    <div className="mt-auto flex flex-col gap-1 border-t pt-2">
      {state.situation === "project" ? <ScanSystem state={state} post={post} /> : null}
      <Entry view="settings" state={state} post={post} />
    </div>
  );
}

/** The side menu: what the window has open decides the entries (`menu-laterale`). Before the host's first state it draws nothing. */
export function MenuApp({ state, post }: { state: MenuState | null; post: (message: ToMenuHost) => void }) {
  if (state === null) return <div />;
  return (
    <TooltipProvider>
      <nav aria-label="Trama" className="@container flex h-full min-h-0 flex-col gap-1 p-2">
        {state.situation === "noFolder" ? (
          <>
            <p className="px-2 py-1 text-sm text-muted-foreground @max-[200px]:hidden">Open a folder to use Trama.</p>
            <Tip text="Open a folder to use Trama.">
              <Button className="w-full justify-start @max-[200px]:justify-center" onClick={() => post({ type: "openFolder" })}>
                <FolderOpen aria-hidden="true" focusable="false" className="size-4" />
                <span className="@max-[200px]:hidden">Open Folder</span>
              </Button>
            </Tip>
          </>
        ) : state.situation === "notProject" ? (
          <Entry view="getstarted" state={state} post={post} />
        ) : (
          PROJECT_ENTRIES.map((view) => <Entry key={view} view={view} state={state} post={post} />)
        )}
        <Bottom state={state} post={post} />
      </nav>
    </TooltipProvider>
  );
}
