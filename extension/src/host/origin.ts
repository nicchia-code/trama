import { type Origin, originOf, readOriginAsync, useOriginSource } from "../../../src/core/manager-mode";
import type { GitDirectories } from "./git-directories";

const sameOrigin = (a: Origin, b: Origin): boolean => a.repository === b.repository && a.reason === b.reason;

/**
 * The origin of the window's project, one per window (`rules#manager-mode`, `quality#General`): the address of the `origin` remote and the GitHub repository it gives
 * (`<owner>/<repo>` in lower case), or none. It is read asynchronously when the window opens the project and again only when git's `config` changes (`GitDirectories`);
 * `onDidChange` tells the listeners when the value is not the one they know. No origin, no git and a failed git call are no origin remote. The panel, the side menu, Team,
 * the PR Check, the design requests and omp Chat read `get()`; none of them asks git for origin.
 */
export class ProjectOrigin {
  private value: Origin = originOf(null);
  /** The project root the value was read for: the value says nothing about another root. */
  private valueRoot: string | undefined;
  private readonly listeners = new Set<() => void>();
  private generation = 0;
  private reading: Promise<void> = Promise.resolve();

  constructor(
    private readonly git: GitDirectories,
    private readonly read: (root: string) => Promise<Origin> = readOriginAsync,
  ) {}

  /** The origin of the window's project as last read; no origin until the first read ends. Never starts a process. */
  get(): Origin {
    return this.value;
  }

  /** Settles when the read in progress, if any, has ended. */
  settled(): Promise<void> {
    return this.reading;
  }

  /** Calls `listener` when the origin changed (the address, so also whether it is on GitHub, and the repository). */
  onDidChange(listener: () => void): { dispose(): void } {
    this.listeners.add(listener);
    return { dispose: () => void this.listeners.delete(listener) };
  }

  /**
   * Reads the origin of the folder `root` and keeps it as the window's value for that folder. For a folder the window does not follow yet (the setup wizard turning Manager mode on in a
   * project it is about to create); the window's own project is read by `start`'s listener.
   */
  async readFor(root: string): Promise<void> {
    const generation = ++this.generation;
    const next = await this.read(root);
    if (generation !== this.generation) return;
    this.valueRoot = root;
    if (sameOrigin(next, this.value)) return;
    this.value = next;
    for (const listener of [...this.listeners]) listener();
  }

  /**
   * Starts following the window: from now on the core's `managerStatus`, `teamUnavailableReason` and `setManagerMode` take the window's value instead of reading git, and the
   * origin is read each time the git directories are resolved (the project opens, `config` changes). Returns what takes all that off again.
   */
  start(): { dispose(): void } {
    const unuse = useOriginSource((root) => (root === this.valueRoot ? this.value : originOf(null)));
    const subscription = this.git.onDidChange(() => {
      this.reading = this.load();
    });
    return {
      dispose: () => {
        this.generation++;
        subscription.dispose();
        unuse();
      },
    };
  }

  private async load(): Promise<void> {
    const generation = ++this.generation;
    const root = this.git.root();
    const found = await this.git.get();
    const next = root === undefined || found === undefined ? originOf(null) : await this.read(root);
    if (generation !== this.generation) return;
    this.valueRoot = root;
    if (sameOrigin(next, this.value)) return;
    this.value = next;
    for (const listener of [...this.listeners]) listener();
  }
}
