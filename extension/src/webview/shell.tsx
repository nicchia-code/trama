import { Settings, X } from "lucide-react";
import { type ReactNode, useSyncExternalStore } from "react";
import type { Snapshot } from "../../../src/core/snapshot";
import type { ViewName } from "../protocol";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

/** What the shell shows, kept outside React so the message handlers can change it. */
export interface ShellState {
  view: ViewName;
  /** Whether the folder has a Trama project; null until the host says. */
  hasProject: boolean | null;
  /** Tasks and Proposals waiting for a decision, on the Board tab; 0 shows no badge. */
  decisions: number;
  error: string | null;
  diagnostics: Snapshot["diagnostics"];
  /** What each view drew last: the tabs keep it mounted, so a hidden tab keeps its state. */
  views: Partial<Record<ViewName, ReactNode>>;
  /** The question overlay: its bar sits above the tabs and its dialog opens above everything. */
  questions: ReactNode;
}

export interface ShellStore {
  get(): ShellState;
  set(patch: Partial<ShellState>): void;
  subscribe(listener: () => void): () => void;
}

export function createShellStore(initial: ShellState): ShellStore {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const TABS: { view: ViewName; label: string }[] = [
  { view: "getstarted", label: "Get Started" },
  { view: "board", label: "Board" },
  { view: "diagram", label: "Diagram" },
  { view: "requirements", label: "Requirements" },
  { view: "specs", label: "Specs" },
];

export function Shell({
  store,
  navigate,
  openModelFile,
}: {
  store: ShellStore;
  navigate: (view: ViewName) => void;
  openModelFile: (path: string) => void;
}) {
  const state = useSyncExternalStore(store.subscribe, store.get);
  const present = state.hasProject === true;
  const tabs = TABS.filter((tab) => (tab.view === "getstarted" ? !present : present));
  const views = [...tabs.map((tab) => tab.view), "settings" as const];
  return (
    <TooltipProvider>
      <Tabs value={state.view} onValueChange={(view) => navigate(view as ViewName)} className="h-full gap-0">
        <div className="flex items-center gap-1 border-b px-2.5 py-1.5">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.view} value={tab.view}>
                {tab.label}
                {tab.view === "board" && state.decisions > 0 ? (
                  <Badge variant="secondary" className="ml-1.5 px-1.5 py-0" data-badge>
                    {state.decisions}
                  </Badge>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          <span className="flex-1" />
          <TabsList>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="settings" aria-label="Settings">
                  <Settings />
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </TabsList>
        </div>
        {state.error !== null ? (
          <div role="alert" className="flex items-start gap-2 border-b border-destructive/50 bg-destructive/15 px-2.5 py-1.5 whitespace-pre-wrap">
            <span>{state.error}</span>
            <Button variant="ghost" size="icon" className="ml-auto size-5" aria-label="Dismiss" onClick={() => store.set({ error: null })}>
              <X />
            </Button>
          </div>
        ) : null}
        {state.diagnostics.length > 0 ? (
          <details className="border-b border-amber-500/50 bg-amber-500/15 px-2.5 py-1.5">
            <summary className="cursor-pointer">
              {`The Model or its Requirements have ${state.diagnostics.length} validation error${state.diagnostics.length === 1 ? "" : "s"}: the Diagram may be incomplete until they are fixed.`}
            </summary>
            <ul className="mt-1.5 list-disc pl-4.5">
              {state.diagnostics.map((d, at) => (
                <li key={at}>
                  <Button variant="link" className="h-auto p-0" title={`Open ${d.file}`} onClick={() => openModelFile(d.file)}>
                    {d.line > 0 ? `${d.file}:${d.line}` : d.file}
                  </Button>{" "}
                  {d.message}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <div className="relative min-h-0 flex-1">
          {views.map((view) => (
            <TabsContent key={view} value={view} forceMount className="absolute inset-0 overflow-auto data-[state=inactive]:hidden">
              {state.views[view]}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </TooltipProvider>
  );
}
