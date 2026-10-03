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
| `init [--skills-dir <dir>] [--force]` | Creates `.trama/` in `--root` (or the current directory) with `model/system.md`, `model/actors/`, `requirements/` with five empty Areas (`ui`, `tech`, `quality`, `data`, `rules`), `proposals/`, `tasks/` and `drifts/`, and installs the agent skills (embedded in the binary) into `<dir>`, default `.agents/skills`. It never walks up. Fails, creating nothing, if `.trama/` already exists or if any skill file to install already exists with different content; `--force` overwrites those. Identical files are not a conflict. |
| `skills update [--skills-dir <dir>]` | Writes this version's agent skills into an existing project's `<dir>` (default `.agents/skills`), replacing older or edited copies, and lists the files it changed. Creates the five starting Areas if the project has no `requirements/` folder, and regenerates the `trama-req-*` skills from the Areas. The extension runs it from **Trama: Update Agent Skills**. |

## Exploring

All exploring commands are read-only.

| Command | Output |
|---|---|
| `system` | System description; Actors with their Events; Features with their Machines. |
| `feature <feature>` | Description; Machines, each with the first line of its description; the Events that reach Machines of this Feature, as `owner.EVENT → receiving Machine`. An owner may be an Actor or a Machine of another Feature. Actors are only ever owners: what the System does in response to a Machine's Event toward the outside world is prose in that Event's description, never a graph edge. Then the Requirements attached to the Feature. |
| `machine <machine>` | Description; the State tree with markers; every Transition; owned Events and who receives them; the Requirements attached to the Machine or its Feature. |
| `state <state-ref>` | Description; parent and sub-States; outgoing Transitions, including those inherited from parents; incoming Transitions; the Requirements attached to the State or to what contains it. |
| `event <event-ref>` | Owner and description; every Transition that reacts to it (`machine/State → Target: prose`). |
| `paths <machine> <from> <to> [--max N]` | Simple paths between two States, shortest first, default `N = 20`. A State with sub-States stands for any of its sub-States; parents pass their Transitions down; entering a State with sub-States enters its initial sub-State. |
| `analyze [<machine>]` | Warnings for one Machine or the whole System: unreachable States, non-final dead ends, Events nobody receives. |
| `requirements [<area> \| <ref>]` | Without an argument, every Area with its description and sections. With an Area (`ui` or `requirements/ui`), the Area in full; with `requirements/ui#order/Paid`, one section. With a Model reference, the Requirements attached to that element or to what contains it. |
| `search <text>` | Case-insensitive match over names and prose of the whole Model and its Requirements; each hit with its reference. |
| `validate [--proposal <id>]` | Validation errors for the Model and its Requirements, or for both with that Proposal applied. Exits `1` when there are any. |

## Proposals

| Command | Effect |
|---|---|
| `proposal new <title> [--body <text>] [--requires <id>…] [--import]` | Creates `proposals/<NNNN-slug>/proposal.md` with `status: open`. `--requires` writes it on top of those open or approved Proposals (refused for a rejected one); `--import` marks it `kind: import` (ADR 0008). |
| `proposal edit <id> <path>` | `<path>` is a Model file relative to `.trama/model/` or an Area `requirements/<area>.md`. Copies the current file into the Proposal and records its hash in `base`, or creates an empty file marked `new` if it does not exist. Prints the path to edit. Running it twice on the same file changes nothing. |
| `proposal delete <id> <path>` | Adds the file to `delete` and records its hash in `base`. |
| `proposal show <id>` | Description; stale or not; for each touched file, what is added, removed or changed; validation errors of the Model and Requirements with the Proposal applied. |
| `proposal list [--all]` | Open Proposals (all of them with `--all`), marking import ones, stale ones and the required Proposals not approved yet. |
| `proposal approve <id>` | Developer only. Fails if a required Proposal is not approved, or the Proposal is stale or invalid; otherwise applies it, sets `status: approved` and regenerates the `trama-req-*` skills. |
| `proposal reject <id> --feedback <text>` | Developer only. Sets `status: rejected` and appends the feedback. |

`approve`, `reject`, `drift resolve` and `task take-back` are the developer's decisions. The extension sets `TRAMA_AGENT=1` in every agent it launches, and the CLI refuses these four commands when that variable is set. This stops an agent that runs them by mistake, not one that clears the variable on purpose (ADR 0005).

## Tasks

| Command | Effect |
|---|---|
| `task new <title> (--ref <ref>… \| --technical [--ref <requirement>…]) [--drift <id>] [--proposal <id>] [--body <text>]` | Creates a Task in `todo`. A Task references at least one Model element and may add Requirements (`requirements/ui#order/Paid`); a Technical Task may reference only Requirements. `--proposal` links the Task to the Proposal (the design) it comes from; the Proposal must exist, in any status. The Scan files its Tasks with it after an approval. Fails if a reference or the Proposal does not resolve. |
| `task list [--column todo\|doing\|done]` | Tasks grouped by column, flat: every Task is listed, with its Proposal ID when it has one, so the agent can always find the Tasks in `todo`. A Task the agent has taken is marked `(agent working)`, here and in `task show`, `board` and the agent tools. |
| `task show <id>` | The Task, with the current text of each reference inlined, then the Requirements attached to the referenced elements (or to what contains them) and the Areas whose General Requirements apply. |
| `task move <id> <todo\|doing\|done>` | Moves the Task to another column. Run in the agent terminal (`TRAMA_AGENT` set), a move to `doing` takes the Task for the agent and a move to `todo` or `done` clears that; run without it, the move is refused while the agent has the Task. |
| `task take-back <id>` | Developer only. Clears the agent's mark on a Task it has taken; the Task stays in `doing` and the developer can move it again. Refused when the Task is not taken. |

## Drifts

| Command | Effect |
|---|---|
| `drift new <title> --ref <ref>… [--proposal <id>] [--body <text>]` | Records an open Drift. The refs point to the Model elements or Requirements closest to where the code differs. |
| `drift list [--all]` | Open Drifts (all of them with `--all`). |
| `drift show <id>` | The Drift, its references inlined, the Requirements that apply, and its attached Proposal, if any. |
| `drift resolve <id> --fix-code \| --accept-proposal \| --dismiss` | Developer only. `--fix-code` creates a Task referencing the same elements and links it to the Drift; the Task is technical when the Drift references only Requirements. `--accept-proposal` approves the attached Proposal. `--dismiss` closes the Drift without changes. |

## Board

| Command | Output |
|---|---|
| `board` | **To decide** (open Proposals and Drifts), **To do**, **In progress**, **Done**: the same data the extension's board shows. The Tasks linked to one Proposal, when there are at least two, are listed once, as the Proposal with its Tasks underneath (each with its own column), in the column they add up to: To do while none has started, Done when all are done, In progress otherwise. Other Tasks are listed as before. |

## Agent tools and MCP

`trama mcp [--root <dir>]` serves the agent tools over MCP (stdio, newline-delimited JSON-RPC) until stdin closes. The same tools are registered natively in VS Code, so Copilot's agent mode can call them without the CLI (ADR 0006). Configure it in any MCP client, for example:

```json
{ "mcpServers": { "trama": { "command": "trama", "args": ["--root", "/path/to/project", "mcp"] } } }
```

In Cursor the extension writes this entry into `.cursor/mcp.json` itself.

| Tool | Does |
|---|---|
| `trama_view` | Like `system`, `feature`, `machine`, `state`, `event` chosen by `ref`, with the attached Requirements; `requirements` or `requirements/<area>[#section]` like `requirements` |
| `trama_paths`, `trama_analyze`, `trama_search`, `trama_validate`, `trama_board` | Like the commands of the same name |
| `trama_proposal_new`, `trama_proposal_show`, `trama_proposal_delete_file` | Like `proposal new` (`requires`, `import`), `show`, `delete` |
| `trama_proposal_write` | `proposal edit` plus writing the complete new Model or Requirement file; answers with the validation of the Model and Requirements with the Proposal applied |
| `trama_task_new`, `trama_task_show`, `trama_task_move` | Like `task new`, `show`, `move` |
| `trama_drift_new`, `trama_drift_show` | Like `drift new`, `show` |

There is no tool for `proposal approve`, `proposal reject`, `drift resolve` or `task take-back`.
