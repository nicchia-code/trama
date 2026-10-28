import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { PersonErrors } from "../../../../src/core/people";
import type { Snapshot } from "../../../../src/core/snapshot";
import type { ReplanView, ToHost } from "../../protocol";
import { ViewEnvContext } from "../board/parts";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { TooltipProvider } from "../ui/tooltip";
import type { Slot, View, ViewContext } from "../types";
import { noNumbers } from "../../../../src/core/card-names";
import { DecisionsTab } from "./decisions-tab";
import { GitHubBanner, GitHubHeader, GitHubSkeleton, LinkProjectPage } from "./github";
import { IssuePreview, type FieldRejections, rejectionKey } from "./issue-preview";
import { IssuesTab } from "./issues-tab";
import { gateOf, type GitHubMessage, type PreviewAt, previewOf, type PullRequestsMessage, shownTab, TEAM_TAB_LABELS, type TeamTab, teamTabs, type TimelineMode } from "./logic";
import { PeopleTab, type TeamMessage } from "./people-tab";
import { PullRequestsTab } from "./pull-requests-tab";
import { TimelineTab } from "./timeline";
import type { Rejection } from "./person-dialog";

export interface TeamPageProps {
  /** Team is available (Manager mode on, origin on GitHub): the view has the Manager's tabs and the Project's button. Without it the view is only `Pull Requests`. */
  manager: boolean;
  /** What the host sent last about the people; null until it has. */
  team: TeamMessage | null;
  rejection: Rejection | null;
  /** What the host sent last about GitHub (`ui#github-project`); null until it has. */
  github?: GitHubMessage | null;
  /** What the host sent last about the pull requests of the `Pull Requests` tab; null until it has. */
  pullRequests?: PullRequestsMessage | null;
  /** The last picture of the project: the open handoffs of Decisions and the issues of Issues; null until the host has sent one. */
  snapshot?: Snapshot | null;
  /** What `Replan` needs (`ui#proposal/Open`); absent until the host has sent a picture, or while Team is not available: then the Decisions tab shows no `Replan`. */
  replan?: ReplanView | null;
  /** The host's refusals of the changes of an issue's fields, by `rejectionKey`. */
  fieldRejections?: FieldRejections;
  /** A sentence of the host for the top of the view (a refused link, publish or split), closable. */
  notice?: string | null;
  post(message: ToHost): void;
  /** Follows a reference chip of an issue's references to the Diagram, Requirements or Specs. */
  navigate?: ViewContext["navigate"];
  /** A change of an issue's field was sent: the host's refusal shown for it, if any, goes. */
  onFieldSent?: (handoff: string, issue: string, key: string) => void;
  onDismissNotice?: () => void;
}

interface TabEntry {
  id: TeamTab;
  label: string;
  /** The number on the tab's label, only when it is not zero. */
  count?: number;
  /**
   * What the tab shows while GitHub is not ready: `replace` puts the skeleton of the first read, then the page `Link a GitHub Project` while no Project is linked, in place
   * of the content; `above` puts that page only above it (a handoff is still previewed without a Project, but cannot be approved). Without it the content is always its own.
   */
  gate?: "replace" | "above";
  content: ReactNode;
}

const noop = (): void => {};

/**
 * The Team view (`ui#panel/Team`): the title `Team` with, with Manager mode on, the button of the GitHub Project, then `Updated <time ago>` and `Refresh`, the box of the state of
 * `gh`, and the tabs of the view in the segmented style: with Manager mode on `Decisions`, `Issues`, `Pull Requests`, `Timeline` and `People`, in this order, opening on `Decisions`;
 * with it off only `Pull Requests`, where it opens. The chosen tab, and how the Timeline groups its lanes, stay while the view updates and while the developer visits other views, and
 * are forgotten with the panel; a chosen tab the view no longer has (Manager mode went off) gives way to the first one. The issue preview is a page of `Decisions`: it stays across tabs
 * and goes when its handoff is decided.
 */
export function TeamPage({ manager, team, rejection, post, github = null, pullRequests = null, snapshot = null, replan = null, fieldRejections = {}, notice = null, navigate = noop, onFieldSent = noop, onDismissNotice = noop }: TeamPageProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  const tab = shownTab(chosen, manager);
  const setTab = (next: string) => setChosen(next);
  // A chosen tab the view lost (Manager mode went off) is forgotten, so it does not come back when Manager mode is turned on again.
  useEffect(() => {
    if (chosen !== null && tab !== chosen) setChosen(null);
  }, [chosen, tab]);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>("person");
  const [picking, setPicking] = useState(false);
  const [at, setAt] = useState<PreviewAt | null>(null);
  const reopen = useRef<string | null>(null);
  const linked = github?.linked ?? null;
  const linkedKey = linked === null ? "" : `${linked.owner}#${linked.number}`;
  // Linking (or unlinking) a Project ends the choice of another one.
  useEffect(() => setPicking(false), [linkedKey]);

  const handoffs = snapshot?.handoffs ?? [];
  const preview = previewOf(handoffs, at);
  // The focus goes back to the card whose preview was left, once the cards are drawn again.
  useEffect(() => {
    if (preview === null && reopen.current !== null) {
      document.getElementById(`handoff-${reopen.current}`)?.focus();
      reopen.current = null;
    }
  }, [preview]);

  const closePreview = () => {
    if (at !== null) reopen.current = at.handoff;
    setAt(null);
  };
  const gate = manager ? gateOf(github, picking) : null;
  const page = manager && github !== null && gate === "link" ? <LinkProjectPage github={github} post={post} {...(linked === null ? {} : { onCancel: () => setPicking(false) })} /> : null;
  const env = { context: { post, navigate, openLink: (url: string) => post({ type: "openLink", url }) }, numbers: snapshot?.numbers ?? noNumbers };

  const decisions =
    preview !== null && snapshot !== null ? (
      <IssuePreview
        handoff={preview.handoff}
        issue={preview.issue}
        index={preview.index}
        snapshot={snapshot}
        team={team}
        github={github}
        rejections={fieldRejections}
        post={post}
        onBack={closePreview}
        onStep={(issue) => setAt({ handoff: preview.handoff.id, issue })}
        onFieldSent={(key) => onFieldSent(preview.handoff.id, preview.issue.id, key)}
      />
    ) : (
      <>
        {page === null ? null : <div className="mb-4 border-b pb-4">{page}</div>}
        <DecisionsTab snapshot={snapshot} replan={replan} post={post} onPreview={(handoff) => setAt({ handoff, issue: 0 })} onShowIssues={() => setTab("issues")} />
      </>
    );
  const entries: TabEntry[] = [
    { id: "decisions", label: TEAM_TAB_LABELS.decisions, count: handoffs.length, gate: "above", content: decisions },
    { id: "issues", label: TEAM_TAB_LABELS.issues, gate: "replace", content: <IssuesTab snapshot={snapshot} team={team} github={github} post={post} /> },
    { id: "pull-requests", label: TEAM_TAB_LABELS["pull-requests"], content: <PullRequestsTab pullRequests={pullRequests} snapshot={snapshot} post={post} navigate={navigate} /> },
    { id: "timeline", label: TEAM_TAB_LABELS.timeline, gate: "replace", content: <TimelineTab snapshot={snapshot} team={team} github={github} mode={timelineMode} onModeChange={setTimelineMode} post={post} /> },
    { id: "people", label: TEAM_TAB_LABELS.people, content: <PeopleTab team={team} rejection={rejection} post={post} /> },
  ];
  const available: readonly TeamTab[] = teamTabs(manager);
  const tabs = entries.filter((entry) => available.includes(entry.id));
  const instead = gate === "loading" ? <GitHubSkeleton /> : page;
  return (
    <TooltipProvider>
      <ViewEnvContext.Provider value={env}>
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 p-3">
          <div className="@container">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="text-sm font-semibold">Team</h2>
              <GitHubHeader github={github} manager={manager} post={post} onPickAnother={() => setPicking(true)} />
            </div>
          </div>
          {notice === null ? null : (
            <div role="alert" className="flex items-start justify-between gap-3 rounded-md border border-amber-600 bg-amber-600/10 px-3 py-2 text-sm dark:border-amber-400 dark:bg-amber-400/15">
              <p className="min-w-0 break-words">{notice}</p>
              <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={onDismissNotice}>
                <X aria-hidden="true" focusable="false" />
                Close
              </Button>
            </div>
          )}
          <GitHubBanner github={github} manager={manager} post={post} />
          <Tabs value={tab} onValueChange={setTab} className="gap-0">
            <TabsList aria-label="Team">
              {tabs.map(({ id, label, count }) => (
                <TabsTrigger key={id} value={id} {...(count === undefined || count === 0 ? {} : { "aria-label": `${label}, ${count} waiting` })}>
                  {label}
                  {count === undefined || count === 0 ? null : (
                    <Badge aria-hidden="true" className="h-5 min-w-5 rounded-full px-1.5">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            <hr className="mt-3 border-border" />
            {tabs.map(({ id, gate: how, content }) => (
              <TabsContent key={id} value={id} className="pt-3">
                {how === "replace" && instead !== null ? instead : content}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </ViewEnvContext.Provider>
    </TooltipProvider>
  );
}

/** What `mountTeam` gives the shell: the messages of the host that are the view's. */
export interface TeamView extends Pick<View, "show" | "hide"> {
  /** Whether Team is available (Manager mode on, origin on GitHub), from the host's `managerMode`: the view has the Manager's tabs and the Project's button, or only `Pull Requests`. */
  receiveManager(available: boolean): void;
  /** The people of this project's team as the host sent them. */
  receive(message: TeamMessage): void;
  /** A `Save` the host refused: the dialog marks each invalid field. */
  receiveRejected(errors: PersonErrors): void;
  /** What the host read of GitHub: the Project's button, the box of the state of `gh` and what stands in place of the tabs that need a Project. */
  receiveGitHub(message: GitHubMessage): void;
  /** The pull requests the host read, with the report of each one's last PR Check and the state of the PR Check running in this window. */
  receivePullRequests(message: PullRequestsMessage): void;
  /** The last picture of the project: the handoffs of Decisions and the issues of Issues. */
  update(snapshot: Snapshot, replan?: ReplanView | null): void;
  /** A change of an issue's field the host refused, with its message. */
  receiveFieldRejected(handoff: string, issue: string, key: string, message: string): void;
  /** A sentence for the top of the view. */
  notice(text: string): void;
}

/** The Team view: its people, GitHub and snapshot come from the host's messages and the tab it shows is kept by the page. */
export function mountTeam(slot: Slot, context: ViewContext): TeamView {
  let manager = false;
  let team: TeamMessage | null = null;
  let rejection: Rejection | null = null;
  let github: GitHubMessage | null = null;
  let pullRequests: PullRequestsMessage | null = null;
  let snapshot: Snapshot | null = null;
  let replan: ReplanView | null = null;
  let fieldRejections: FieldRejections = {};
  let notice: string | null = null;
  const render = () =>
    slot(
      <TeamPage
        manager={manager}
        team={team}
        rejection={rejection}
        github={github}
        pullRequests={pullRequests}
        snapshot={snapshot}
        replan={replan}
        fieldRejections={fieldRejections}
        notice={notice}
        post={context.post}
        navigate={context.navigate}
        onFieldSent={(handoff, issue, key) => {
          const { [rejectionKey(handoff, issue, key)]: _gone, ...rest } = fieldRejections;
          fieldRejections = rest;
          render();
        }}
        onDismissNotice={() => {
          notice = null;
          render();
        }}
      />,
    );
  render();
  return {
    receiveManager(available) {
      if (available === manager) return;
      manager = available;
      render();
    },
    receive(message) {
      team = message;
      render();
    },
    receiveRejected(errors) {
      rejection = { n: (rejection?.n ?? 0) + 1, errors };
      render();
    },
    receiveGitHub(message) {
      github = message;
      render();
    },
    receivePullRequests(message) {
      pullRequests = message;
      render();
    },
    update(next, nextReplan = null) {
      snapshot = next;
      replan = nextReplan;
      render();
    },
    receiveFieldRejected(handoff, issue, key, message) {
      fieldRejections = { ...fieldRejections, [rejectionKey(handoff, issue, key)]: message };
      render();
    },
    notice(text) {
      notice = text;
      render();
    },
    show() {},
    hide() {},
  };
}
