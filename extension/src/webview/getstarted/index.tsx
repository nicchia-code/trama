import { TriangleAlert } from "lucide-react";
import type { ToHost, ToWebview } from "../../protocol";
import { InlineMarkdown } from "../markdown";
import type { Slot, View, ViewContext } from "../types";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

type SetupMessage = Extract<ToWebview, { type: "setup" }>;

/** The Get Started tab takes the host's setup messages directly: it is not driven by snapshots. */
export interface GetStartedView extends View {
  receive(message: SetupMessage): void;
}

const NOTICE = "Trama will create a `.trama` folder that describes this project. It holds no secrets and is meant to be committed. It also writes the agent skills and the Trama sub-agent definition into this project, which are meant to be committed too.";

const CHOICES = [
  { choice: "import", label: "Import from Code", tip: "Set up Trama and ask an agent to describe the existing code as Proposals" },
  { choice: "scratch", label: "Start from Scratch", tip: "Set up Trama and describe the project you want to build" },
] as const;

export interface GetStartedProps {
  /** A choice is under way: neither button can be pressed. */
  busy: boolean;
  /** Why the last initialization failed, shown under the two choices. */
  error: string | null;
  choose(choice: "import" | "scratch"): void;
  openLink(url: string): void;
}

/** The notice and the two ways to start; shown only while the folder has no Trama project. */
export function GetStartedTab({ busy, error, choose, openLink }: GetStartedProps) {
  return (
    <TooltipProvider>
      <div className="max-w-xl p-4">
        <div className="flex items-start gap-2.5 rounded-md border border-amber-500/50 bg-amber-500/15 px-3 py-2.5">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>
            <InlineMarkdown source={NOTICE} openLink={openLink} />
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {CHOICES.map(({ choice, label, tip }) => (
            <Tooltip key={choice}>
              <TooltipTrigger asChild>
                <span tabIndex={busy ? 0 : undefined}>
                  <Button disabled={busy} aria-label={`${label}. ${tip}`} onClick={() => choose(choice)}>
                    {label}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{tip}</TooltipContent>
            </Tooltip>
          ))}
        </div>
        {error !== null ? (
          <p role="alert" className="mt-3 break-words text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

function Connected({ context, state }: { context: ViewContext; state: { busy: boolean; error: string | null; start(): void } }) {
  return (
    <GetStartedTab
      busy={state.busy}
      error={state.error}
      openLink={context.openLink}
      choose={(choice) => {
        if (state.busy) return;
        state.start();
        context.post({ type: "initialize", choice } satisfies ToHost);
      }}
    />
  );
}

/** The Get Started tab: shown only while the folder has no Trama project, so the developer can pick how to start. */
export const mountGetStarted = (slot: Slot, context: ViewContext): GetStartedView => {
  let busy = false;
  let error: string | null = null;

  function render() {
    slot(<Connected context={context} state={{ busy, error, start() { busy = true; error = null; render(); } }} />);
  }
  render();

  return {
    update() {},
    show() {},
    receive(message) {
      busy = message.busy;
      error = message.error;
      render();
    },
  };
};
