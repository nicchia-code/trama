import type { GitDirectories } from "../extension/src/host/git-directories";
import type { ProjectOrigin } from "../extension/src/host/origin";

/** What a host test gets of the window: its git directories and origin, and the two events a test makes happen. */
export interface WindowOrigin {
  git: GitDirectories;
  origin: ProjectOrigin;
  /** The window opens (or looks again at) its project: origin is read now. */
  open(): Promise<void>;
  /** git's `config` changed: origin is read again. */
  changed(): Promise<void>;
  stop(): void;
}

/**
 * The window's git directories and origin for a host test, with real git: the origin is read when the window opens the project and again when `changed` says git's config
 * did, as in the editor. Import it after `mock.module("vscode", …)`: the modules it loads need the editor.
 */
export async function windowOrigin(root?: () => string | undefined): Promise<WindowOrigin> {
  const { GitDirectories } = await import("../extension/src/host/git-directories");
  const { ProjectOrigin } = await import("../extension/src/host/origin");
  let configChanged: (() => void) | undefined;
  const git = new GitDirectories({ ...(root === undefined ? {} : { projectRoot: root }), watch: (_common, onChange) => ((configChanged = onChange), { dispose() {} }) });
  const origin = new ProjectOrigin(git);
  const stop = origin.start();

  /** Lets git's directories and then the origin they lead to be read. */
  async function settle(): Promise<void> {
    await new Promise((resolve) => setImmediate(resolve));
    await git.get();
    await new Promise((resolve) => setImmediate(resolve));
    await origin.settled();
  }

  return {
    git,
    origin,
    async open(): Promise<void> {
      git.follow();
      await settle();
    },
    async changed(): Promise<void> {
      configChanged?.();
      await settle();
    },
    stop(): void {
      stop.dispose();
      git.dispose();
    },
  };
}
