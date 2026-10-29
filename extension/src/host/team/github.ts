import { z } from "zod";
import { TramaError } from "../../../../src/core/errors";
import { type GhDeps, type GhProblemKind, ghProblemKind, type GitHubIteration, type GitHubProject, linkedGithubProject, linkGithubProject, type LinkedProject, type ProjectChoice, readGitHub } from "../../../../src/core/github";
import { type IssueActions, type IssueOnGitHub, type IssueSignals, issuesOnGitHub, openLoads, type PublishedIssue } from "../../../../src/core/timeline";
import type { OpenLoad } from "../../../../src/core/sprints";
import { managerStatus } from "../../../../src/core/manager-mode";
import type { Project } from "../../../../src/core/store";
import type { ModelMemory } from "../proposal-models";
import type { ToWebview } from "../../protocol";

/** The workspace state key of what Trama last read from GitHub (`data#github-project`). */
export const GITHUB_CACHE_KEY = "trama.team.github";

/** What Trama last read from GitHub: when, the linked Project, and why the last read failed (`null` when it worked). Only a cache: losing it costs a read. */
export interface GitHubCache {
  readAt: string | null;
  project: GitHubProject | null;
  error: string | null;
}

/** The `teamGitHub` message the Team view gets. */
export type TeamGitHubMessage = Extract<ToWebview, { type: "teamGitHub" }>;

const CacheSchema = z.object({
  readAt: z.string().nullable(),
  project: z
    .object({
      fields: z.array(z.object({ id: z.string(), name: z.string(), type: z.string(), options: z.array(z.object({ id: z.string(), name: z.string() })).optional() })),
      iterations: z.array(z.object({ id: z.string(), title: z.string(), startDate: z.string(), duration: z.number() })),
      url: z.string().optional(),
      items: z.array(
        z.object({
          number: z.number(),
          title: z.string(),
          state: z.string(),
          stateReason: z.string().nullable(),
          assignees: z.array(z.string()),
          values: z.record(z.string(), z.union([z.string(), z.number()])),
          pullRequests: z.array(z.object({ state: z.string(), draft: z.boolean() })),
          branches: z.array(z.string()),
        }),
      ),
    })
    .nullable(),
  error: z.string().nullable(),
});

/** The cache as the workspace state holds it; a value of another shape is no cache. */
export function readGitHubCache(memory: ModelMemory): GitHubCache | undefined {
  const parsed = CacheSchema.safeParse(memory.get(GITHUB_CACHE_KEY));
  return parsed.success ? parsed.data : undefined;
}

/** The key of what a read was asked for: a second request for the same thing, made while one runs, is answered by that read. */
const keyOf = (repository: string, linked: LinkedProject | null): string => JSON.stringify([repository, linked?.owner ?? null, linked?.number ?? null]);

/**
 * The Team view's reads of GitHub (`rules#github-project`): one at a time, the result kept in the workspace state and the last successful data kept through a failed read.
 * A request made while a read runs waits for it, and runs again only when it asked for something else (another linked Project). `deps` is for tests.
 */
export class TeamGitHub {
  private running: Promise<void> | undefined;
  private lastKey: string | undefined;
  private problemDetails = "";
  private projects: ProjectChoice[] = [];
  private cache: GitHubCache | undefined;

  constructor(
    private readonly memory: ModelMemory,
    private readonly deps: GhDeps = {},
  ) {
    this.cache = readGitHubCache(memory);
  }

  /** Whether a read is running. */
  get reading(): boolean {
    return this.running !== undefined;
  }

  /** Reads GitHub for `repository` (`<owner>/<repo>`): the state of `gh`, the Projects of its owner and the linked Project; resolves when the result is stored. Never rejects. */
  read(repository: string, linked: LinkedProject | null): Promise<void> {
    const key = keyOf(repository, linked);
    if (this.running !== undefined) return this.running.then(() => (this.lastKey === key ? undefined : this.read(repository, linked)));
    const running = this.run(repository, linked, key).finally(() => {
      this.running = undefined;
    });
    this.running = running;
    return running;
  }

  private async run(repository: string, linked: LinkedProject | null, key: string): Promise<void> {
    const reading = await readGitHub(repository, linked, this.deps);
    if (reading.ok) {
      this.projects = reading.projects;
      this.problemDetails = "";
      this.cache = { readAt: reading.readAt, project: reading.project, error: null };
    } else {
      this.problemDetails = reading.details;
      this.cache = { readAt: this.cache?.readAt ?? null, project: this.cache?.project ?? null, error: reading.reason };
    }
    this.lastKey = key;
    try {
      await this.memory.update(GITHUB_CACHE_KEY, this.cache);
    } catch {
      // The cache is only a cache: nothing depends on it.
    }
  }

  /** The linked Project changed: the data read for the other one is no longer shown. */
  async forgetProject(): Promise<void> {
    this.lastKey = undefined;
    this.cache = { readAt: null, project: null, error: this.cache?.error ?? null };
    try {
      await this.memory.update(GITHUB_CACHE_KEY, this.cache);
    } catch {
      // See `run`.
    }
  }

  /** The Projects of the owner of the last read that worked, as the picker offers them. */
  choices(): readonly ProjectChoice[] {
    return this.projects;
  }

  /** What `gh` said in full about the last failure, for the output channel; empty after a read that worked. */
  details(): string {
    return this.problemDetails !== "" ? this.problemDetails : (this.cache?.error ?? "");
  }

  /** What each published issue of Trama is on GitHub now, from the last read (`rules#issue/Published`); see `issuesOnGitHub`. */
  issues(published: readonly PublishedIssue[], linked: LinkedProject | null): IssueOnGitHub[] {
    return linked === null ? [] : issuesOnGitHub(published, this.cache ?? null);
  }

  /** The iterations of the linked Project from the last read, by start; none without a linked Project or a read. */
  iterations(linked: LinkedProject | null): GitHubIteration[] {
    return linked === null ? [] : [...(this.cache?.project?.iterations ?? [])];
  }

  /** What every open item of the linked Project adds to its assignee's load in its sprint, from the last read (`rules#issue/Published`); see `openLoads`. The items themselves never leave the host. */
  loads(published: readonly PublishedIssue[], linked: LinkedProject | null): OpenLoad[] {
    return linked === null ? [] : openLoads(published, this.cache ?? null);
  }

  /** The state of `gh` now, from the last read: what `Log in to GitHub` and `Give access` act on. */
  problem(): GhProblemKind | null {
    return this.cache?.error == null ? null : ghProblemKind(this.cache.error);
  }

  /**
   * The message for the Team view. `project` is shown only with a linked Project: data read for another one never is, and the items of its issues never leave the host.
   * `signals` and `actions` are computed by the caller from the cards, the team and the jobs now (`issueSignals`, `issueActions`), which this class does not know.
   */
  message(repository: string | null, linked: LinkedProject | null, published: readonly PublishedIssue[] = [], extras: { signals: IssueSignals; actions: Record<number, IssueActions> } = { signals: {}, actions: {} }): TeamGitHubMessage {
    const cache = this.cache;
    const error = cache?.error ?? null;
    const read = linked === null ? null : (cache?.project ?? null);
    const project = read === null ? null : { fields: read.fields, iterations: read.iterations, ...(read.url === undefined ? {} : { url: read.url }) };
    const readAt = cache?.readAt ?? null;
    const state = error !== null ? ghProblemKind(error) : readAt === null && this.lastKey === undefined ? "loading" : "ready";
    return { type: "teamGitHub", state, reading: this.reading, repository, linked, readAt, project, issues: this.issues(published, linked), loads: this.loads(published, linked), signals: extras.signals, actions: extras.actions, projects: [...this.projects], error };
  }
}

/** The repository of the project (`<owner>/<repo>`) and the Project linked to it, as the reads of Team need them. */
export interface GitHubTarget {
  repository: string;
  linked: LinkedProject | null;
}

/** The target of the reads of Team; null unless Team is available (Manager mode recorded and origin on GitHub). Origin is the window's value (`ProjectOrigin`), never read from git here. */
export function githubTarget(project: Project): GitHubTarget | null {
  const { repository, available } = managerStatus(project);
  return repository === null || !available ? null : { repository, linked: linkedGithubProject(project) };
}

/**
 * Links the Project `owner`/`number` the webview chose (`developer.LINK_GITHUB_PROJECT`). Only a Project of the last read's list is linked, with its title and its iteration
 * field as the host read them, never as the webview said; a Project without an iteration field is refused with the reason of the Team view. A failed write changes nothing.
 */
export function linkChosenProject(project: Project, github: TeamGitHub, owner: string, number: number): LinkedProject {
  const choice = github.choices().find((c) => c.owner === owner && c.number === number);
  if (choice === undefined) throw new TramaError(`${owner} #${number} is not one of the Projects read from GitHub: select Refresh and choose again.`);
  return linkGithubProject(project, choice);
}
