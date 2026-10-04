# CLI

`trama` is a single binary. It lets the agent **explore** the Model and manage Proposals, Tasks and Drifts. It never reads the user's code (ADR 0002). File formats are in [model-format.md](./model-format.md).

## Conventions

- `trama [--json] [--root <dir>] <command> …`
- Without `--root`, the CLI walks up from the current directory to the first folder containing `.trama/`.
- Default output is Markdown: compact for agents and readable for people. `--json` prints the same data as one JSON document, for the extension and for scripts. `ask` always prints JSON; `mcp` uses JSON-RPC.
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
| `proposal new <title> [--body <text>] [--requires <id>…] [--import]` | Creates `proposals/<NNNN-slug>/proposal.md` with `status: draft`. `--requires` writes it on top of those draft, open or approved Proposals (refused for a rejected or discarded one); `--import` marks it `kind: import` (ADR 0008). |
| `proposal edit <id> <path>` | `<path>` is a Model file relative to `.trama/model/` or an Area `requirements/<area>.md`. Copies the current file into the Proposal and records its hash in `base`, or creates an empty file marked `new` if it does not exist. Prints the path to edit. Register before every change: an open Proposal returns to Draft, with a notice after the path. Re-registering keeps the original hash and contents. Use `--json` and its `path` field for scripts. |
| `proposal delete <id> <path>` | Adds the file to `delete` and records its hash in `base`; an open Proposal returns to Draft, with a notice. |
| `proposal submit <id>` | Hands a Draft over, setting `status: open`. Refuses validation errors and unregistered files, leaving it Draft. Staleness or waiting for required approvals do not prevent submission. |
| `proposal discard <id>` | Developer only. Discards only a Draft, setting `status: discarded`; no feedback, no changes to dependents or attached Drifts. |
| `proposal show <id>` | Description; stale or not; for each touched file, what is added, removed or changed; validation errors of the Model and Requirements with the Proposal applied. |
| `proposal list [--all]` | Draft and open Proposals (all statuses with `--all`), marking drafts `(draft)`, imports, stale ones and required Proposals not approved yet. |
| `proposal approve <id> [--skills-dir <dir>…]` | Developer only, open Proposals only. Refuses Drafts as still being written. Fails if a required Proposal is not approved, or the Proposal is stale or invalid; otherwise applies it, sets `status: approved` and regenerates the `trama-req-*` skills in `.agents/skills`, `.claude/skills`, `.github/skills` and each `--skills-dir` folder (relative to the project root) that holds `trama-design`. The extension passes its `trama.skillsDir` setting; from a terminal, pass the folder you configured. |
| `proposal reject <id> [--feedback <text>]` | Developer only, open Proposals only. Sets `status: rejected`. With non-blank feedback it is appended under `## Feedback`; without it, or with blank text, nothing is appended. Drafts are refused as still being written. |

`approve`, `reject`, `discard`, `drift resolve` and `task take-back` are the developer's decisions. The extension sets `TRAMA_AGENT=1` in every agent it launches, and the CLI refuses these commands when that variable is set. This stops an agent that runs them by mistake, not one that clears the variable on purpose (ADR 0005).

## Tasks

| Command | Effect |
|---|---|
| `task new <title> (--ref <ref>… \| --technical [--ref <requirement>…]) [--drift <id>] [--proposal <id>] [--body <text>]` | Creates a Task in `todo`. A Task references at least one Model element and may add Requirements (`requirements/ui#order/Paid`); a Technical Task may reference only Requirements. `--proposal` links the Task to the Proposal (the design) it comes from; the Proposal must exist, in any status; a Technical Task keeps no link, because it is never part of a design. The Scan files its Tasks with it after an approval. Fails if a reference or the Proposal does not resolve. |
| `task list [--column todo\|doing\|done]` | Tasks grouped by column, flat: every Task is listed, with its Proposal ID when it has one, so the agent can always find the Tasks in `todo`. A Task the agent has taken is marked `(agent working)`, here and in `task show`, `board` and the agent tools. A blocked Task is marked `(blocked by Drift <id>)` once for each Drift that blocks it, or `(waiting for Task <id>)` when it waits for the Task that fixes its Drift, in the same places. |
| `task show <id>` | The Task, with the blocked and `(agent working)` marks, a line `Blocked by Drift <id>: <title>` or `Waiting for Task <id>: <title>` for each blocker, the current text of each reference inlined, then the Requirements attached to the referenced elements (or to what contains them) and the Areas whose General Requirements apply. |
| `task move <id> <todo\|doing\|done>` | Moves the Task to another column. Run in the agent terminal (`TRAMA_AGENT` set), a move to `doing` takes the Task for the agent and a move to `todo` or `done` clears that; run without it, the move is refused while the agent has the Task. A move to `doing` by the agent is refused, and changes nothing, when the Task is blocked (also when it is already in `doing`): the refusal names each blocking Drift (ID and title) or the fix Task, and says the developer must decide. Moves of the developer, and of the agent to `todo` or `done`, are never refused for that reason. |
| `task take-back <id>` | Developer only. Clears the agent's mark on a Task it has taken; the Task stays in `doing` and the developer can move it again. Refused when the Task is not taken. |

## Drifts

| Command | Effect |
|---|---|
| `drift new <title> --ref <ref>… --happens <text> --should <text> (--option <title> --option-text <text>)×2..5 [--where <text>] [--proposal <id>] [--task <id>]` | Records an open Drift. `--happens` is what the code does and `--should` is what the Model or Requirement says; both are required and become the Drift's two sections. The Drift also needs from two to five **fix options**, the one the agent recommends first: each `--option <title>` is followed by its `--option-text <text>`, in order, and they become the **Fix options** section. Each is a different way to reach what should happen (not a step of one plan), in terms of behaviour and with what it costs, about 60 words, no headings or tables. Filing is refused, naming the problem, with fewer than two options, more than five, an option missing its title or its text, or two options with the same title. Write them as short Markdown, at the level of behaviour and in domain words: no variable, function, class, field or file names unless the difference cannot be understood without them, no headings or tables, about 100 words per side. `--where` is optional and becomes a third section, **Where in the code**: the only place for files and code elements (no line numbers); a blank `--where` is refused. The refs point to the Model elements or Requirements closest to where the code differs. `--task` is the Task the agent was implementing when it found the difference, the Drift's origin; it must exist. The Drift blocks its origin and every Task that is not Done and concerns the same thing (a reference of one is the other's or inside it). Drifts filed by a Scan or a Fix have no origin. |
| `drift list [--all]` | Open Drifts (all of them with `--all`). |
| `drift show <id>` | The Drift's two sides (**What happens**, **What should happen**; a Drift written before them shows one **Description**), then **Fix options** as a numbered list, each with its title and text and the first marked `(recommended)` (a Drift written before options existed has none), then **Where in the code** when it has one, printed as the Markdown it was written in, its references inlined, the Requirements that apply, and its attached Proposal with its state and, when it cannot be approved, why. A Drift resolved by fixing the code also shows a **Chosen option** block (the option's number and title, when there was one) and a **Note** block when the developer gave one. |
| `drift replace-proposal <id> --proposal <id>` | Attaches a newer Proposal to an open Drift in place of the stale one attached to it, and rejects the stale one with the feedback `Replaced by Proposal <id>`. Refused unless the Drift is open, its attached Proposal is open and stale, and the new one exists, differs from it and was not rejected or discarded. Not developer-only: the agent runs it when asked to rework a stale Proposal. |
| `drift resolve <id> --fix-code [--option <n>] [--note <text>] \| --accept-proposal \| --dismiss [--skills-dir <dir>…]` | Developer only. `--fix-code` (keep what should happen) needs `--option <n>`, the number from 1 of one of the Drift's fix options, when the Drift has options; without it, in an interactive terminal, the options are listed as a numbered menu with the recommended one as the default (Enter) and then an optional note is asked (Enter for none), and in a non-interactive run it is refused, saying that an option must be chosen, and the Drift stays open. A Drift without options is fixed without choosing and accepts no `--option`. `--note` is free text kept with the choice. The number and the note are kept in the Drift. `--accept-proposal` and `--dismiss` take neither `--option` nor `--note`. `--fix-code` creates a Task referencing the same elements and links it to the Drift, with both sides, the chosen option (title and text), the note and **Where in the code** as its body; the Task is technical when the Drift references only Requirements. If the Drift has an origin Task that is not Done, that Task goes back to `todo` (its agent mark cleared) and stays blocked, `(waiting for Task <id>)`, until the fix Task is Done. Every resolution ends the Drift's blocking of the other Tasks. `--accept-proposal` (keep what happens) approves the attached Proposal, with the same skill regeneration and `--skills-dir` as `proposal approve`, and is refused, naming why, when it cannot be approved. `--dismiss` (keep what happens, with no Proposal) closes the Drift without changes and is refused when the Drift has an attached Proposal. |

## Announcements

Announcing a card before the agent creates it makes the Board show a ghost of it meanwhile.

| Command | Effect |
|---|---|
| `announce <proposal\|task\|drift> <title>` | Announces a card the agent is about to create, as soon as it knows it will. Prints the announcement ID, six letters and digits. Not developer-only: the agent runs it. Writes a temporary file under `.trama/announcements/` (see the file format). When `TRAMA_TERMINAL` holds a terminal ID (the extension sets it in every agent terminal it starts), the announcement belongs to that terminal; without it, or with a value that is not six lowercase letters and digits, it belongs to none. |

`proposal new`, `task new` and `drift new` take `--announcement <id>`: when the card is created, the announcement it names is delivered and the ghost gives way to the real card. A `proposal new` with no `--announcement` takes over the oldest announcement that Trama made for a design request and that no Draft has taken yet, whatever its terminal; with none waiting it makes an announcement of its own, so the Board shows its Draft, and that one belongs to the terminal in `TRAMA_TERMINAL`, if any. An ID that is unknown, already delivered or withdrawn, of another kind, or already bound to a Draft never prevents the card from being created; the output adds a note saying so. `proposal submit` delivers the announcement bound to the Draft only when it succeeds; `proposal discard` withdraws it with no notice. The agent tools `trama_announce` and `trama_proposal_new` do the same through `trama mcp`, which reads `TRAMA_TERMINAL` once when it starts.

Only the extension withdraws announcements the agent never delivered, and each terminal only its own: the command Trama typed into an agent terminal ending (recognised by the command line the editor reports for it, compared after trimming; any other command, or an end reported without that line, withdraws nothing) or that terminal closing withdraws the announcements that belong to it. Every announcement, whatever terminal it belongs to, is also withdrawn after fifteen minutes in which the agent announced nothing, changed no announced Draft and filed no card (the count stops while a question round is open), and at startup; announcements that belong to no terminal (from the editor's chat, or from an agent Trama did not start) go only that way. The command line alone never withdraws any.

## Board

| Command | Output |
|---|---|
| `board` | Draft Proposals marked `(draft)` in **In writing**, separate from **To decide** (handed-over Proposals and open Drifts), then **To do**, **In progress**, **Done**. JSON keeps Drafts in `inWriting`, outside `toDecide`. The Tasks linked to one Proposal, when there are at least two, are listed once, as the Proposal with its Tasks underneath (each with its own column), in the column they add up to: To do while none has started, Done when all are done, In progress otherwise. Other Tasks are listed as before. |

## Question rounds

`trama ask [--root <dir>] < round.json` reads one complete question round from JSON stdin and waits for its editor window. It always prints one JSON result or error on stdout; command diagnostics go to stderr. `--root` selects the project independently of the caller's current directory.

Example `round.json`:

```json
{
  "questions": [{
    "id": "route",
    "question": "Choose the route",
    "options": [
      { "label": "Fast", "description": "Fewer checks" },
      { "label": "Safe", "description": "More checks" }
    ],
    "recommended": 1,
    "multi": false
  }]
}
```

Every question needs a unique non-empty ID, non-empty question text, at least two options with non-empty labels and descriptions, an in-range integer recommendation and an explicit `multi` boolean. Unknown fields are refused. The whole round is validated before any question is shown. Do not add an Other option: the editor supplies it.

- **Completed:** `status: "answered"` and `answers` keyed by question ID. Each entry is `{status: "answered", selected: [...]}` with original option labels and optional `text`, or `{status: "skipped"}`. A multiple-choice answer may combine selected options and free text. Recommendation markers never appear in returned labels.
- **Initially unavailable:** `status: "unavailable"` and a `reason`. No answers are supplied; only this outcome permits the agent's own question interface.
- **Invalid request:** `error.code: "invalid-input"` with the offending field identified in `error.message`; correct the request rather than using fallback answers.
- **Editor lost after submission:** `error.code: "editor-interrupted"` with no answers. Stop the current workflow: no partial answers, recommendations, fallback, retry, rerouting or resumption. This is not initial unavailability.
- **Caller cancellation:** abandons only that caller's round. SIGINT/SIGTERM and observable output disconnection cancel CLI waiting; MCP supports `notifications/cancelled` with `requestId`, and connection loss cancels that connection's pending calls.

Completed and initially unavailable results exit `0`; question failures and cancellation exit `1`; malformed requests exit `2`.

Questions open immediately in native editor Quick Picks. Back preserves accepted answers; Other opens a native input box; Escape requires `Skip this one`, `Skip all` or `Go back`. Skips contain no invented answer: the agent applies its recommendation and lists the skipped decisions for review. There is no final Send step or response deadline.

Each window owns one FIFO shared by native tools, MCP and CLI callers. Cancelling one caller does not cancel another; losing the editor interrupts both its active and queued rounds. Other windows remain independent. The endpoint in `TRAMA_QUESTION_ENDPOINT`, set by Trama in launched agent terminals, is authoritative; otherwise discovery selects the most recently focused live window for the selected project. Requests are sent to only that window.

Routing uses private user-local sockets on Unix and user-only local named pipes on Windows. Discovery records live outside the repository and contain only project/window identities, endpoint and focus recency. Questions and incomplete answers remain in memory, never in `.trama/` or discovery files. The Windows bridge uses OS Windows PowerShell 5.1 and .NET Framework `Add-Type`; it fails closed if those facilities are unavailable, rather than falling back to a permissive Node pipe.

## Agent tools and MCP

`trama mcp [--root <dir>]` serves the agent tools over MCP (stdio, newline-delimited JSON-RPC) until stdin closes. The same tools are registered natively in VS Code, so Copilot's agent mode can call them without the CLI (ADR 0006). Configure it in any MCP client, for example:

```json
{ "mcpServers": { "trama": { "command": "trama", "args": ["--root", "/path/to/project", "mcp"] } } }
```

In Cursor the extension writes this entry into `.cursor/mcp.json` itself.

| Tool | Does |
|---|---|
| `trama_ask` | The same request and result as `ask`; always offered, including when the editor is initially unavailable. Native invocation identifies the agent as Copilot; MCP uses `initialize.clientInfo.name`. Pending rounds do not block other tool requests. |
| `trama_view` | Like `system`, `feature`, `machine`, `state`, `event` chosen by `ref`, with the attached Requirements; `requirements` or `requirements/<area>[#section]` like `requirements` |
| `trama_paths`, `trama_analyze`, `trama_search`, `trama_validate`, `trama_board` | Like the commands of the same name |
| `trama_proposal_new`, `trama_proposal_show`, `trama_proposal_delete_file` | Like `proposal new` (`requires`, `import`), `show`, `delete` |
| `trama_proposal_write` | `proposal edit` plus writing the complete new Model or Requirement file; answers with the validation of the Model and Requirements with the Proposal applied |
| `trama_proposal_submit` | Validates and hands a finished Draft over to the developer; new, write and delete tools leave it Draft until this succeeds |
| `trama_announce` | Like `announce` (`kind`, `title`); `trama_proposal_new`, `trama_task_new` and `trama_drift_new` take the `announcement` it returns |
| `trama_task_new`, `trama_task_show`, `trama_task_move` | Like `task new`, `show`, `move` |
| `trama_drift_new`, `trama_drift_show`, `trama_drift_replace_proposal` | Like `drift new` (the origin Task is `task`; `happens` and `should` are the two texts, `options` the list of `{title, text}` fix options and `where` the optional extra section), `show`, `replace-proposal` |

There is no tool for `proposal approve`, `proposal reject`, `proposal discard`, `drift resolve` or `task take-back`.
