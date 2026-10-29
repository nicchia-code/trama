import { X } from "lucide-react";
import { type ReactNode, useSyncExternalStore } from "react";
import type { Snapshot } from "../../../src/core/snapshot";
import type { ViewName } from "../protocol";
import { Button } from "./ui/button";
import { TooltipProvider } from "./ui/tooltip";

/** What the shell shows, kept outside React so the message handlers can change it. */
export interface ShellState {
  view: ViewName;
  /** Whether the folder has a Trama project; null until the host says. */
  hasProject: boolean | null;
  error: string | null;
  diagnostics: Snapshot["diagnostics"];
  /** What each view drew last: every view stays mounted, so a hidden one keeps its state. */
  views: Partial<Record<ViewName, ReactNode>>;
  /** The question overlay: its bar sits above the view and its dialog opens above everything. */
  questions: ReactNode;
  /** The project's GitHub repository (`owner/repo`) the host sent with the picture; null without one. */
  githubRepo: string | null;
  /** Whether Team is available (Manager mode on, origin on GitHub): only then the panel has the Team view. */
  team: boolean;
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

/** The views of a project, in the order of the side menu. */
const PROJECT_VIEWS = ["board", "diagram", "requirements", "specs", "history", "team", "settings"] as const;

/** The panel: the alerts, the diagnostics and the question bar above the view the developer chose. It has no tab bar: the side menu, the commands and the links choose the view. */
export function Shell({
  store,
  openModelFile,
}: {
  store: ShellStore;
  openModelFile: (path: string) => void;
}) {
  const state = useSyncExternalStore(store.subscribe, store.get);
  const present = state.hasProject === true;
  // Without a project the views are Get Started and Settings; with one, every view but Get Started.
  const views = present ? PROJECT_VIEWS.filter((view) => view !== "team" || state.team) : (["getstarted", "settings"] as const);
  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
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
            // Every view stays mounted, so a hidden one keeps what the developer was looking at.
            <div key={view} data-view-name={view} hidden={view !== state.view} className="absolute inset-0 overflow-auto">
              {state.views[view]}
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
