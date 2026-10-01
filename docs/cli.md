# CLI

`trama` is a single binary. It lets the agent **explore** the Model and manage Proposals, Tasks and Drifts. It never reads the user's code (ADR 0002). File formats are in [model-format.md](./model-format.md).

## Conventions

- `trama [--json] [--root <dir>] <command> …`
- Without `--root`, the CLI walks up from the current directory to the first folder containing `.trama/`.
- Default output is Markdown: compact for agents and readable for people. `--json` prints the same data as one JSON document, for the extension and for scripts.
- Element arguments use the reference syntax from the format spec: `order`, `order/Paid`, `order/Paid/user.CANCEL`, `user.CANCEL`.
- Exit codes: `0` success; `1` domain failure (validation errors, unknown element, stale Proposal); `2` usage error.
- Commands that create a file print its ID and path. The agent may edit the file's prose directly afterwards.

## Project

| Command | Effect |
|---|---|
| `init [--skills-dir <dir>] [--force]` | Creates `.trama/` in `--root` (or the current directory) with `model/system.md`, `model/actors/`, `proposals/`, `tasks/` and `drifts/`, and installs the agent skills (embedded in the binary) into `<dir>`, default `.agents/skills`. It never walks up. Fails, creating nothing, if `.trama/` already exists or if any skill file to install already exists with different content; `--force` overwrites those. Identical files are not a conflict. |
| `skills update [--skills-dir <dir>]` | Writes this version's agent skills into an existing project's `<dir>` (default `.agents/skills`), replacing older or edited copies, and lists the files it changed. The extension runs it from **Trama: Update Agent Skills**. |

## Exploring

All exploring commands are read-only.

| Command | Output |
|---|---|
| `system` | System description; Actors with their Events; Features with their Machines. |
| `feature <feature>` | Description; Machines, each with the first line of its description; the Events that reach Machines of this Feature, as `owner.EVENT → receiving Machine`. An owner may be an Actor or a Machine of another Feature. Actors are only ever owners: what the System does in response to a Machine's Event toward the outside world is prose in that Event's description, never a graph edge. |
| `machine <machine>` | Description; the State tree with markers; every Transition; owned Events and who receives them. |
| `state <state-ref>` | Description; parent and sub-States; outgoing Transitions, including those inherited from parents; incoming Transitions. |
| `event <event-ref>` | Owner and description; every Transition that reacts to it (`machine/State → Target: prose`). |
| `paths <machine> <from> <to> [--max N]` | Simple paths between two States, shortest first, default `N = 20`. A State with sub-States stands for any of its sub-States; parents pass their Transitions down; entering a State with sub-States enters its initial sub-State. |
| `analyze [<machine>]` | Warnings for one Machine or the whole System: unreachable States, non-final dead ends, Events nobody receives. |
| `search <text>` | Case-insensitive match over names and prose of the whole Model; each hit with its element reference. |
| `validate [--proposal <id>]` | Validation errors for the Model, or for the Model with that Proposal applied. Exits `1` when there are any. |

## Proposals

| Command | Effect |
|---|---|
| `proposal new <title> [--body <text>]` | Creates `proposals/<NNNN-slug>/proposal.md` with `status: open`. |
| `proposal edit <id> <model-path>` | Copies `model/<model-path>` into the Proposal and records its hash in `base`, or creates an empty file marked `new` if it does not exist. Prints the path to edit. Running it twice on the same file changes nothing. |
| `proposal delete <id> <model-path>` | Adds the file to `delete` and records its hash in `base`. |
| `proposal show <id>` | Description; stale or not; for each touched file, States, Transitions and Events added, removed or changed; validation errors of the Model with the Proposal applied. |
| `proposal list [--all]` | Open Proposals (all of them with `--all`), marking the stale ones. |
| `proposal approve <id>` | Developer only. Fails if the Proposal is stale or invalid; otherwise applies it and sets `status: approved`. |
| `proposal reject <id> --feedback <text>` | Developer only. Sets `status: rejected` and appends the feedback. |

`approve`, `reject` and `drift resolve` are the developer's decisions. The extension sets `TRAMA_AGENT=1` in every agent it launches, and the CLI refuses these three commands when that variable is set. This stops an agent that runs them by mistake, not one that clears the variable on purpose (ADR 0005).

## Tasks

| Command | Effect |
|---|---|
| `task new <title> (--ref <ref>… \| --technical) [--drift <id>] [--body <text>]` | Creates a Task in `todo`. Fails if a reference does not resolve. |
| `task list [--column todo\|doing\|done]` | Tasks grouped by column. |
| `task show <id>` | The Task, with the current Model text of each reference inlined. |
| `task move <id> <todo\|doing\|done>` | Moves the Task to another column. |

## Drifts

| Command | Effect |
|---|---|
| `drift new <title> --ref <ref>… [--proposal <id>] [--body <text>]` | Records an open Drift. The refs point to the Model elements closest to where the code differs. |
| `drift list [--all]` | Open Drifts (all of them with `--all`). |
| `drift show <id>` | The Drift, its references inlined and its attached Proposal, if any. |
| `drift resolve <id> --fix-code \| --accept-proposal \| --dismiss` | Developer only. `--fix-code` creates a Task referencing the same elements and links it to the Drift. `--accept-proposal` approves the attached Proposal. `--dismiss` closes the Drift without changes. |

## Board

| Command | Output |
|---|---|
| `board` | **To decide** (open Proposals and Drifts), **To do**, **In progress**, **Done**: the same data the extension's board shows. |
