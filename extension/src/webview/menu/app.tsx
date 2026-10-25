import { Bot, FolderOpen, GitCompare, GitMerge, History, ListChecks, type LucideIcon, Network, Package, Rocket, Search, Settings, SquareKanban, Users, X } from "lucide-react";
import type { MenuState, MenuViewName, MergeMenuState, ToMenuHost } from "../../menu-protocol";
import { cn } from "../lib/utils";
import { scanButtonLabel } from "../scan-label";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ENTRY_LABELS, entryName, mergeLines, mergeName, projectEntries } from "./logic";

const ICONS: Record<MenuViewName, LucideIcon> = {
  board: SquareKanban,
  diagram: Network,
  requirements: ListChecks,
  specs: Package,
  history: History,
  team: Users,
  settings: Settings,
  getstarted: Rocket,
};

/** One entry: a button as wide as the view, its icon to the left of the text, highlighted when it is the view the panel shows. Under 56 px only the icon shows, centred; the entry has no tooltip, its name is its text. */
function Entry({ view, state, post }: { view: MenuViewName; state: MenuState; post: (message: ToMenuHost) => void }) {
  const Icon = ICONS[view];
  const shown = state.panelView === view;
  const awaiting = view === "board" ? state.decisions : view === "team" ? (state.handoffs ?? 0) : 0;
  return (
    <Button
      variant="ghost"
      aria-label={entryName(view, state.decisions, state.handoffs ?? 0)}
      aria-current={shown ? "page" : undefined}
      className={cn("w-full justify-start @max-[56px]:justify-center aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground")}
      onClick={() => post({ type: "show", view })}
    >
      <Icon aria-hidden="true" focusable="false" className="size-4" />
      <span className="@max-[56px]:hidden">{ENTRY_LABELS[view]}</span>
      {awaiting > 0 ? <Badge className="ml-auto @max-[56px]:hidden">{awaiting}</Badge> : null}
    </Button>
  );
}

/** Scan System, at the foot of the view with Settings: a ghost button as wide as the view, icon and text to the left. */
function ScanSystem({ state, post }: { state: MenuState; post: (message: ToMenuHost) => void }) {
  const label = scanButtonLabel("Scan System", state.tasksSinceScan);
  return (
    <Button
      variant="ghost"
      aria-label={label.ariaLabel}
      className="w-full justify-start @max-[56px]:justify-center"
      onClick={() => post({ type: "scan" })}
    >
      <Search aria-hidden="true" focusable="false" className="size-4" />
      <span className="@max-[56px]:hidden">{label.text}</span>
    </Button>
  );
}

/** A ghost button below Merge during a merge Trama started: as wide as the view, icon and text to the left; under 56 px only the icon, its name staying. */
function MergeStep({ icon: Icon, label, message, post }: { icon: LucideIcon; label: string; message: ToMenuHost; post: (message: ToMenuHost) => void }) {
  return (
    <Button variant="ghost" aria-label={label} className="w-full justify-start @max-[56px]:justify-center" onClick={() => post(message)}>
      <Icon aria-hidden="true" focusable="false" className="size-4" />
      <span className="@max-[56px]:hidden">{label}</span>
    </Button>
  );
}

/** Merge of Solo mode, the first thing after the line: the only primary button of the menu, the lines under it and, during a merge Trama started, the ghost buttons of its ways to go on. */
function Merge({ merge, post }: { merge: MergeMenuState; post: (message: ToMenuHost) => void }) {
  const lines = mergeLines(merge);
  return (
    <>
      <Button
        variant="default"
        aria-label={mergeName(merge)}
        aria-disabled={merge.available ? undefined : true}
        disabled={!merge.available}
        className="w-full justify-start @max-[56px]:justify-center"
        onClick={() => post({ type: "merge" })}
      >
        <GitMerge aria-hidden="true" focusable="false" className="size-4" />
        <span className="@max-[56px]:hidden">Merge</span>
      </Button>
      {lines.map((line) => (
        <p key={line.text} className={cn("m-0 px-2 text-xs wrap-anywhere @max-[56px]:hidden", line.warning ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
          {line.text}
        </p>
      ))}
      {merge.open?.conflict ? <MergeStep icon={GitCompare} label="Open Merge Editor" message={{ type: "openMergeEditor" }} post={post} /> : null}
      {merge.open?.conflict ? <MergeStep icon={Bot} label="Reconcile with Agent" message={{ type: "reconcileMerge" }} post={post} /> : null}
      {merge.open ? <MergeStep icon={X} label="Abort Merge" message={{ type: "abortMerge" }} post={post} /> : null}
    </>
  );
}

/** The foot of the view, apart by a line: Merge (only with Solo mode on), Scan System (only in a project), then Settings. */
function Bottom({ state, post }: { state: MenuState; post: (message: ToMenuHost) => void }) {
  return (
    <div className="mt-auto flex flex-col gap-1 border-t pt-2">
      {state.situation === "project" && state.merge !== undefined ? <Merge merge={state.merge} post={post} /> : null}
      {state.situation === "project" ? <ScanSystem state={state} post={post} /> : null}
      <Entry view="settings" state={state} post={post} />
    </div>
  );
}

/** The side menu: what the window has open decides the entries (`menu-laterale`). Before the host's first state it draws nothing. */
export function MenuApp({ state, post }: { state: MenuState | null; post: (message: ToMenuHost) => void }) {
  if (state === null) return <div />;
  return (
    <nav aria-label="Trama" className="@container flex h-full min-h-0 flex-col gap-1 p-2">
      {state.situation === "noFolder" ? (
        <>
          <p className="px-2 py-1 text-sm text-muted-foreground @max-[56px]:hidden">Open a folder to use Trama.</p>
          <Button aria-label="Open Folder" className="w-full justify-start @max-[56px]:justify-center" onClick={() => post({ type: "openFolder" })}>
            <FolderOpen aria-hidden="true" focusable="false" className="size-4" />
            <span className="@max-[56px]:hidden">Open Folder</span>
          </Button>
        </>
      ) : state.situation === "notProject" ? (
        <Entry view="getstarted" state={state} post={post} />
      ) : (
        projectEntries(state).map((view) => <Entry key={view} view={view} state={state} post={post} />)
      )}
      <Bottom state={state} post={post} />
    </nav>
  );
}
