// The shape of a scene of the guide's screenshots (`scenes.ts`): data only, interpreted by `scripts/screenshots/steps.ts`.
import type { Page } from "playwright";

/** The roles `getByRole` knows. */
type AriaRole = Parameters<Page["getByRole"]>[0];

export type Theme = "light" | "dark";

/** Where a step looks: the VS Code window itself, or one of the extension's webviews (the Trama panel in the editor area, the side menu, the omp Chat view). */
export type Surface = "window" | "panel" | "menu" | "chat";

/**
 * An element, found by what the developer sees. One of `button` (a button, a link or a menu item with this visible text), `role` (with `name`), `text`, `placeholder`, `label` or `css` says where to look;
 * `hasText` keeps only the matches that show this text; `within` narrows to the element it names first; `nth` picks one of several matches (0 is the first). A string matches as a substring, a regular expression as written.
 */
export interface Target {
  button?: string | RegExp;
  role?: AriaRole;
  /** The accessible name for `role`. Controls of the panel often have a longer accessible name than the text they show: look for those with `button`. */
  name?: string | RegExp;
  hasText?: string | RegExp;
  text?: string | RegExp;
  placeholder?: string | RegExp;
  label?: string | RegExp;
  css?: string;
  /** Match the whole text or name instead of a part. */
  exact?: boolean;
  within?: Target;
  nth?: number;
}

/** A `trama` command: its words after `trama`, and the JSON `--input` when it takes one. Words may name an earlier result as `$name` (its `id`), `$name.number` (its short number). */
export interface TramaCommand {
  run: string[];
  input?: unknown;
  /** Keeps the printed `id` and `number` of the result under this name. */
  as?: string;
}

/** A file of the project the scene writes (a Model file inside a Proposal, a request): `path` is relative to the project, or, with `proposal`, to the file `proposal edit` returned for it. */
export interface FileEdit {
  /** The Proposal (`$name`) the file is edited in; its path is the one `trama proposal edit` prints for `path`. */
  proposal?: string;
  path: string;
  /** Replaces the whole file. */
  content?: string;
  /** Or: pairs of text and replacement applied to what the file holds (the copy in the Model for a new file in a Proposal). */
  replace?: [string, string][];
  /** Keeps the identity of the new card the file is (a Task or an issue of the Proposal, from the name `proposal edit` printed) under this name, as `$name`. */
  as?: string;
}

/** How the project of a scene starts. `shop` is `examples/shop` as it is; `code` is its code without `.trama/`, a project that is not yet a Trama project; `empty` is an empty folder. */
export type ProjectKind = "shop" | "code" | "empty";

/** A step of the preparation, before VS Code opens the folder. */
export type PrepareStep =
  | ({ kind: "trama" } & TramaCommand)
  | ({ kind: "file" } & FileEdit)
  /** Runs `git` in the project (`git init`, a commit, a remote). */
  | { kind: "git"; args: string[] };

/** A step with VS Code running. The ones that look at a surface wait for what they need, and fail the scene when it does not come. */
export type Step =
  | PrepareStep
  /** Runs a command of the editor by its identifier (`trama.open`, `workbench.action.closeAuxiliaryBar`). */
  | { kind: "command"; id: string; args?: unknown[] }
  /** Scrolls an element into view (a group far down in Settings). */
  | { kind: "scroll"; in: Surface; target: Target }
  | { kind: "click"; in: Surface; target: Target; /** Holds the pointer where it is after the click instead of moving away. */ keepPointer?: boolean; /** Clicks without waiting for the element to be free of what overlaps it. */ force?: boolean }
  | { kind: "hover"; in: Surface; target: Target }
  /** Types into a field (clicked first); `submit` presses Enter after. */
  | { kind: "type"; in: Surface; target: Target; text: string; submit?: boolean }
  | { kind: "press"; keys: string }
  /** Takes the keyboard focus off the element that has it (a button whose tooltip is still open). */
  | { kind: "blur"; in: Exclude<Surface, "window"> }
  /** Types text where the keyboard focus is (a written request in the editor). */
  | { kind: "write"; text: string }
  /** Waits until the element shows (default) or is gone. */
  | { kind: "wait"; in: Surface; target: Target; until?: "visible" | "hidden" }
  | { kind: "pause"; ms: number }
  /** Shows or hides parts of the window: the side bar (explorer, Trama, none), the omp Chat view and the terminal area. */
  | { kind: "layout"; sidebar?: "explorer" | "trama" | "hidden"; chat?: "shown" | "hidden"; terminal?: "shown" | "hidden"; /** Closes the editor tabs that are open. */ closeEditors?: boolean }
  /** Runs `trama` commands as the agent of the job last started (its environment, as its terminal or conversation has it). A command that waits for the developer (a question round) is left running. */
  | { kind: "agent"; commands: AgentCommand[]; /** Which job: the nth started (0 first), default the last. */ job?: number }
  /** From now on the `trama` commands and files of the steps run as the agent of the job last started (the commands that need the editor, such as the hand-over of a handoff). */
  | { kind: "agent-env" }
  /** The agent of the job last started (or the nth, 0 first) ends its turn, as an agent that has finished its work: Trama ends the job. */
  | { kind: "finish"; job?: number }
  /** Waits for the stand-in omp to have started a job (a conversation or a terminal); `count` jobs in all. */
  | { kind: "job"; count?: number }
  /** Sets a setting of the user (`settings.json`) with the editor running. */
  | { kind: "setting"; key: string; value: unknown }
  /** Waits for the file of the project to exist (or hold `contains`). */
  | { kind: "file-exists"; path: string; contains?: string };

/** One command of an agent: like a `trama` command, but `wait: false` leaves it running (a question round, which ends when the developer answers). */
export interface AgentCommand extends TramaCommand {
  wait?: boolean;
}

/** The part of the 1440×900 window a scene keeps, in pixels from its top-left corner. */
export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Scene {
  /** The name of the images: `site/public/screenshots/<name>.light.png` and `<name>.dark.png`. */
  name: string;
  /** What the images show, for whoever writes the guide's `alt` text and the annotations. */
  shows: string;
  /** The folder the window opens; `none` opens no folder. */
  project: ProjectKind | "none";
  /** `trama` commands and files that bring the project to the state to show, before VS Code opens it. */
  prepare?: PrepareStep[];
  /** What to do with the editor running, in order; the window starts with the side bar of Trama's menu and the omp Chat view closed. */
  steps: Step[];
  /** The part of the window to keep; the whole window when absent. */
  area?: Area;
  /** Settings of the user set before the window opens (`settings.json`), besides the theme. */
  settings?: Record<string, unknown>;
  /** The scene shows omp Chat: the stand-in omp replays the recorded conversation. */
  chat?: true;
}
