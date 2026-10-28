import { Check, ChevronsUpDown, CircleAlert, ExternalLink, KeyRound, LogIn, Plus, RefreshCw, RotateCw, SquareKanban, Terminal, TriangleAlert } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import type { ToHost } from "../../protocol";
import { cn } from "../lib/utils";
import { Button } from "../ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import {
  choiceKey,
  choiceScope,
  createProjectUrl,
  fieldsLine,
  firstUsable,
  GH_INSTALL_URL,
  type GitHubChoice,
  type GitHubMessage,
  LINK_PAGE_TEXT,
  LINK_PAGE_TITLE,
  LOADING_TEXT,
  NO_ITERATION_TEXT,
  ownerOf,
  PULL_REQUESTS_READ_ERROR_TITLE,
  staleText,
  updatedText,
} from "./logic";

type Post = (message: ToHost) => void;

/** The time now, renewed every half minute, so `Updated 2 min ago` stays true while the view is open. This is only the clock of the text: it never reads GitHub. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** `<owner>/<repo>` in monospace, ` · `, then the title. */
const ProjectName = ({ scope, title }: { scope: string; title: string }) => (
  <>
    <span className="font-mono">{scope}</span>
    <span> · </span>
    <span>{title}</span>
  </>
);

interface PopoverProps {
  github: GitHubMessage;
  post: Post;
  onPickAnother: () => void;
}

/** The button of the linked Project and its `Popover` `Change GitHub Project` (`ui#github-project`). */
function ProjectButton({ github, post, onPickAnother }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const { linked, repository } = github;
  if (linked === null || repository === null) return null;
  const close = () => setOpen(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="@max-[480px]:order-last @max-[480px]:w-full @max-[480px]:justify-start" aria-label={`GitHub Project: ${repository} · ${linked.title}`}>
          <SquareKanban aria-hidden="true" />
          <span aria-hidden="true">
            <ProjectName scope={repository} title={linked.title} />
          </span>
          <ChevronsUpDown aria-hidden="true" className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <p className="px-3 pt-3 pb-2 text-xs font-semibold text-muted-foreground">Change GitHub Project</p>
        <Command>
          <CommandInput placeholder={`Search Projects of ${ownerOf(repository)}…`} />
          <CommandList>
            <CommandEmpty>No Project found.</CommandEmpty>
            <CommandGroup>
              {github.projects.map((choice) => {
                const current = choice.owner === linked.owner && choice.number === linked.number;
                return (
                  <CommandItem
                    key={choiceKey(choice)}
                    value={`${choice.owner} ${choice.title} ${choice.number}`}
                    disabled={!choice.iteration}
                    onSelect={() => {
                      close();
                      if (!current) post({ type: "linkGitHubProject", owner: choice.owner, number: choice.number });
                    }}
                  >
                    <Check aria-hidden="true" className={cn(current ? "opacity-100" : "opacity-0")} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">
                        <ProjectName scope={choiceScope(choice, repository)} title={choice.title} />
                      </span>
                      {choice.iteration ? null : <span className="truncate text-xs text-muted-foreground">{NO_ITERATION_TEXT}</span>}
                    </span>
                    {current ? <span className="sr-only">Linked</span> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="link another project"
                onSelect={() => {
                  close();
                  onPickAnother();
                }}
              >
                <Plus aria-hidden="true" />
                Link another Project…
              </CommandItem>
              <CommandItem
                value="unlink"
                className="text-destructive data-[selected=true]:text-destructive"
                onSelect={() => {
                  close();
                  post({ type: "unlinkGitHubProject" });
                }}
              >
                Unlink
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** On the title's line of the Team view: with Manager mode on the Project's button and, at the right, when GitHub was read and `Refresh`; with it off only `Updated …` and `Refresh`. */
export function GitHubHeader({ github, manager, post, onPickAnother }: { github: GitHubMessage | null; manager: boolean; post: Post; onPickAnother: () => void }) {
  const now = useNow();
  if (github === null) return null;
  const updated = github.state === "loading" ? LOADING_TEXT : updatedText(github.readAt, now);
  return (
    <>
      {manager ? <ProjectButton github={github} post={post} onPickAnother={onPickAnother} /> : null}
      <div className="ml-auto flex items-center gap-3">
        {updated === "" ? null : (
          <span className="text-xs text-muted-foreground" role="status">
            {updated}
          </span>
        )}
        <Button type="button" variant="outline" disabled={github.reading} onClick={() => post({ type: "refreshTeam" })}>
          <RefreshCw aria-hidden="true" className={github.reading ? "animate-spin motion-reduce:animate-none" : undefined} />
          Refresh
        </Button>
      </div>
    </>
  );
}

const TONES = {
  warning: { box: "border-amber-600 bg-amber-600/10 dark:border-amber-400 dark:bg-amber-400/15", title: "text-amber-800 dark:text-amber-300" },
  destructive: { box: "border-destructive/60 bg-destructive/10", title: "text-destructive" },
} as const;

function Box({ tone, icon, title, children, actions }: { tone: keyof typeof TONES; icon: ReactNode; title: string; children: ReactNode; actions: ReactNode }) {
  const classes = TONES[tone];
  return (
    <div role={tone === "destructive" ? "alert" : "status"} className={cn("flex flex-col gap-2 rounded-md border px-3 py-2.5 text-sm", classes.box)}>
      <p className={cn("flex items-center gap-2 font-semibold [&_svg]:size-4 [&_svg]:shrink-0", classes.title)}>
        {icon}
        {title}
      </p>
      <div className="flex flex-col gap-1 text-foreground">{children}</div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}

const Code = ({ children }: { children: ReactNode }) => <code className="rounded bg-muted px-1 font-mono text-[0.85em]">{children}</code>;

/** What Trama reads for: `<owner>/<repo> · <Project>`, or only the repository while no Project is linked. */
const ReadsOf = ({ github }: { github: GitHubMessage }) =>
  github.repository === null ? null : github.linked === null ? (
    <Code>{github.repository}</Code>
  ) : (
    <>
      <Code>{github.repository}</Code> · {github.linked.title}
    </>
  );

/**
 * The box of the state of `gh` at the top of the content (`ui#github-project`): nothing while it is `loading` or `ready`. Without Manager mode the view reads only the pull
 * requests: its texts say so, there is no missing access to Projects (`Give access` is the Manager's) and a failed read is the pull requests'.
 */
export function GitHubBanner({ github, manager, post }: { github: GitHubMessage | null; manager: boolean; post: Post }) {
  const now = useNow();
  if (github === null || github.state === "loading" || github.state === "ready") return null;
  if (github.state === "no-project-access" && !manager) return null;
  const refresh = (
    <Button type="button" variant="ghost" disabled={github.reading} onClick={() => post({ type: "refreshTeam" })}>
      <RefreshCw aria-hidden="true" />
      Refresh
    </Button>
  );
  switch (github.state) {
    case "not-installed":
      return (
        <Box
          tone="warning"
          icon={<Terminal aria-hidden="true" />}
          title="GitHub CLI is not installed"
          actions={
            <>
              <Button type="button" variant="outline" onClick={() => post({ type: "openLink", url: GH_INSTALL_URL })}>
                <ExternalLink aria-hidden="true" />
                Install gh
              </Button>
              {refresh}
            </>
          }
        >
          <p>
            {manager ? (
              <>
                Team uses <Code>gh</Code> to read the Project and publish issues. Install it, then select Refresh.
              </>
            ) : (
              <>
                Team uses <Code>gh</Code> to read the pull requests. Install it, then select Refresh.
              </>
            )}
          </p>
        </Box>
      );
    case "not-logged-in":
      return (
        <Box
          tone="warning"
          icon={<TriangleAlert aria-hidden="true" />}
          title="You're not logged in to GitHub"
          actions={
            <Button type="button" onClick={() => post({ type: "logInGitHub" })}>
              <LogIn aria-hidden="true" />
              Log in to GitHub
            </Button>
          }
        >
          <p>
            {manager ? (
              <>
                Log in so Team can read <ReadsOf github={github} /> and publish approved issues. This runs <Code>gh auth login</Code> in a terminal.
              </>
            ) : (
              <>
                Log in so Trama can read the pull requests of {github.repository === null ? "the repository" : <Code>{github.repository}</Code>}. This runs <Code>gh auth login</Code> in a terminal.
              </>
            )}
          </p>
        </Box>
      );
    case "no-project-access":
      return (
        <Box
          tone="warning"
          icon={<TriangleAlert aria-hidden="true" />}
          title="GitHub CLI can't read Projects"
          actions={
            <Button type="button" onClick={() => post({ type: "logInGitHub" })}>
              <KeyRound aria-hidden="true" />
              Give access
            </Button>
          }
        >
          <p>
            Give <Code>gh</Code> access to Projects. This runs <Code>gh auth refresh</Code> in a terminal.
          </p>
        </Box>
      );
    case "read-error": {
      const stale = staleText(github.readAt, now);
      return (
        <Box
          tone="destructive"
          icon={<CircleAlert aria-hidden="true" />}
          title={manager ? "Couldn't read the GitHub Project" : PULL_REQUESTS_READ_ERROR_TITLE}
          actions={
            <>
              <Button type="button" variant="outline" disabled={github.reading} onClick={() => post({ type: "refreshTeam" })}>
                <RotateCw aria-hidden="true" />
                Retry
              </Button>
              <Button type="button" variant="ghost" onClick={() => post({ type: "showGitHubDetails" })}>
                Show details
              </Button>
            </>
          }
        >
          <p className="font-mono text-xs break-words">{github.error}</p>
          {stale === null ? null : <p>{stale}</p>}
        </Box>
      );
    }
  }
}

/** Muted blocks in the place of the rows while the first read runs; still with `motion-reduce`. */
export function GitHubSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-2">
      <span className="sr-only">{LOADING_TEXT}</span>
      {[0, 1, 2, 3].map((row) => (
        <div key={row} aria-hidden="true" className="flex items-center gap-3 rounded-md border p-3">
          <div className="h-4 w-1/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-4 flex-1 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="size-6 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

function ProjectRow({ choice, repository }: { choice: GitHubChoice; repository: string | null }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 aria-disabled:opacity-60" aria-disabled={!choice.iteration || undefined}>
      <RadioGroupItem value={choiceKey(choice)} disabled={!choice.iteration} aria-labelledby={`${id}-name`} aria-describedby={`${id}-fields`} className="mt-0.5" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span id={`${id}-name`} className="truncate text-sm">
          <ProjectName scope={choiceScope(choice, repository)} title={choice.title} />
        </span>
        <span id={`${id}-fields`} className="text-xs text-muted-foreground">
          {choice.iteration ? fieldsLine(choice) : NO_ITERATION_TEXT}
        </span>
      </div>
    </div>
  );
}

/**
 * `Link a GitHub Project` (`ui#github-project`): the Projects of the owner as radio rows, the ones without an Iteration field disabled with the reason, `Link Project` and
 * `Create a Project on GitHub`. `onCancel` is there only while another Project is linked: it goes back to the tabs.
 */
export function LinkProjectPage({ github, post, onCancel }: { github: GitHubMessage; post: Post; onCancel?: () => void }) {
  const [chosen, setChosen] = useState<string | undefined>(undefined);
  const owner = github.repository === null ? "" : ownerOf(github.repository);
  const selected = github.projects.find((choice) => choiceKey(choice) === chosen && choice.iteration) ?? firstUsable(github.projects);
  return (
    <section aria-labelledby="link-github-project" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 id="link-github-project" className="text-sm font-semibold">
          {LINK_PAGE_TITLE}
        </h3>
        <p className="text-xs text-muted-foreground">{LINK_PAGE_TEXT}</p>
      </div>
      {github.projects.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">No Projects found for {owner}.</p>
      ) : (
        <RadioGroup aria-labelledby="link-github-project" value={selected === undefined ? "" : choiceKey(selected)} onValueChange={setChosen} className="gap-0 divide-y rounded-md border">
          {github.projects.map((choice) => (
            <ProjectRow key={choiceKey(choice)} choice={choice} repository={github.repository} />
          ))}
        </RadioGroup>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={selected === undefined} onClick={() => selected !== undefined && post({ type: "linkGitHubProject", owner: selected.owner, number: selected.number })}>
          Link Project
        </Button>
        <Button type="button" variant="ghost" onClick={() => post({ type: "openLink", url: createProjectUrl(owner) })}>
          <ExternalLink aria-hidden="true" />
          Create a Project on GitHub
        </Button>
        {onCancel === undefined ? null : (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </section>
  );
}
