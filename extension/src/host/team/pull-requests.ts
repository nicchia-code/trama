import { z } from "zod";
import { type GhDeps, type PullRequest, readPullRequests } from "../../../../src/core/github";
import type { ModelMemory } from "../proposal-models";

/** The workspace state key of what Trama last read of the pull requests (`data#pull-request-check`). */
export const PULL_REQUESTS_CACHE_KEY = "trama.team.pullRequests";

/** What Trama last read of the open pull requests that are ready for review: when (null before a read that worked), the items (kept through a failed read) and why the last read failed (null when it worked). Only a cache: losing it costs a read. */
export interface PullRequestsCache {
  readAt: string | null;
  items: PullRequest[];
  error: string | null;
}

const CacheSchema = z.object({
  readAt: z.string().nullable(),
  items: z.array(z.object({ number: z.number().int().positive(), title: z.string(), author: z.string(), baseRefName: z.string(), headRefName: z.string(), headRefOid: z.string(), url: z.string() })),
  error: z.string().nullable(),
});

/** The cache as the workspace state holds it; a value of another shape is no cache. */
export function readPullRequestsCache(memory: ModelMemory): PullRequestsCache | undefined {
  const parsed = CacheSchema.safeParse(memory.get(PULL_REQUESTS_CACHE_KEY));
  return parsed.success ? parsed.data : undefined;
}

/** How one read ended: `ok` when `gh` answered the list. */
export type PullRequestsRead = { ok: true; items: readonly PullRequest[] } | { ok: false };

/**
 * The reads of the open pull requests of the Team view (`rules#pr-check`): when the view is shown and with Refresh, never on a timer, one at a time (a request made while a read runs
 * is answered by it), in the background. The result is kept in the workspace state and the items of the last read that worked are kept through a failed one. `deps` is for tests.
 */
export class TeamPullRequests {
  private running: Promise<PullRequestsRead> | undefined;
  private cache: PullRequestsCache | undefined;
  private problemDetails = "";

  constructor(
    private readonly memory: ModelMemory,
    private readonly deps: GhDeps = {},
  ) {
    this.cache = readPullRequestsCache(memory);
  }

  /** Whether a read runs. */
  get reading(): boolean {
    return this.running !== undefined;
  }

  /** The open pull requests of the last read that worked, the highest number first; empty before one. */
  get items(): readonly PullRequest[] {
    return this.cache?.items ?? [];
  }

  /** When the items on show were read (ISO time); null before a read that worked. */
  get readAt(): string | null {
    return this.cache?.readAt ?? null;
  }

  /** Why the last read failed; null when it worked or none ran. */
  get error(): string | null {
    return this.cache?.error ?? null;
  }

  /** What `gh` said in full about the last failure, for the output channel; empty after a read that worked. */
  details(): string {
    return this.problemDetails !== "" ? this.problemDetails : (this.cache?.error ?? "");
  }

  /** Reads the pull requests of `repository` (`<owner>/<repo>`); resolves when the result is stored. Never rejects. */
  read(repository: string): Promise<PullRequestsRead> {
    if (this.running !== undefined) return this.running;
    const running = this.run(repository).finally(() => {
      this.running = undefined;
    });
    this.running = running;
    return running;
  }

  private async run(repository: string): Promise<PullRequestsRead> {
    const reading = await readPullRequests(repository, this.deps);
    let outcome: PullRequestsRead;
    if (reading.ok) {
      this.problemDetails = "";
      this.cache = { readAt: reading.readAt, items: reading.items, error: null };
      outcome = { ok: true, items: reading.items };
    } else {
      this.problemDetails = reading.details;
      this.cache = { readAt: this.cache?.readAt ?? null, items: this.cache?.items ?? [], error: reading.reason };
      outcome = { ok: false };
    }
    try {
      await this.memory.update(PULL_REQUESTS_CACHE_KEY, this.cache);
    } catch {
      // The cache is only a cache: nothing depends on it.
    }
    return outcome;
  }
}
