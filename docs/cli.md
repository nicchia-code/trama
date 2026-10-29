# CLI

`trama` is a single binary. It lets the agent **explore** the Model and manage Proposals, Tasks and Drifts. It never reads the user's code (ADR 0002). File formats are in [model-format.md](./model-format.md).

## Conventions

- `trama <object> <verb> [<id>] [<state>] [--input <json>]`. The objects are `model`, `proposal`, `task`, `drift`, `issue`, `history`, `announcement`, `comparison`, `question`, `advisor`, `project`, `timing` and `hook`. The verbs mean the same for every object: `show <id>` reads one thing, `list` reads several, `new` creates and prints the identity of what it created, `edit <id>` changes the content, `move <id> <state>` takes a card to another state (the state names are the Trama Model's, in lowercase with a dash for a space: `code-to-be-fixed`), `check` reports errors and warnings, `delete <id>` deletes a card for good and exists only for `task`. An object has only the verbs of the reference below; `hook` is the only exception.
- The positional arguments are only the identity of a card (or its short number), the reference of a Model element and the state of arrival of `move`. Every other datum, the filters of the reads included, goes in `--input`: there is no other option. The options that every command takes, in any position, are `--root <dir>`, `--json`, `--input <json>`, `--help` and `-h`.
- `--input -` reads the JSON from standard input, accepting a leading UTF-8 byte order mark; any other value is the JSON text itself. No command reads standard input without `--input -`, except the `hook` commands. The input is a JSON object with camelCase fields. Each command checks it with its zod schema before doing anything else: an unknown field, a wrong type, a value outside its list or a missing required field is a usage error (exit 2) that lists every problem with the path of its field (for example `options[1].text`), and nothing changes. A command with required fields and no `--input` gives the usage error; a command without fields accepts only `{}`. Identities in the fields follow the rules of the arguments.
- Without `--root`, the CLI walks up from the current directory to the first folder containing `.trama/`.
- Default output is Markdown: compact for agents and readable for people. `--json` prints the same data as one JSON document, for the extension and for scripts. `question new` always prints JSON. Errors go to standard error.
- `--help` (or `-h`) after a command's name prints its usage line, its description, each field of its input with type, whether it is required, its default and its description, an example of `--input` and the fields of the output of `--json`, and exits with 0, doing nothing else: it reads no standard input, does not contact the editor and opens no question round. `--help --json` prints the JSON Schemas of its input and output. `trama --help` lists the objects with their verbs and `trama <object> --help` the commands of an object; the `hook` commands are left out of the list but have their own `--help`. A command that exists never answers `Unknown command`: wrong arguments give that command's usage error. An old command name (`init`, `skills update`, `system`, `feature`, `machine`, `state`, `event`, `requirements`, `paths`, `search`, `validate`, `analyze`, `board`, `ids rewrite`, and the other names the object-verb form replaced) has no alias: it gives a usage error that points to `trama --help`.
- Element arguments use the reference syntax from the format spec: `order`, `order/Paid`, `order/Paid/user.CANCEL`, `user.CANCEL`.
- A Proposal, Task or Drift argument may be the whole identity, a prefix that only one card of that kind has, the whole file or folder name, or the card's **short number**. A prefix that matches several cards is refused and the message lists their identities. Digits alone cite only a numbered card (`12` or `0012`), never a random identity made only of digits.
- **Short numbers.** Every live Proposal, Task and Drift has, besides its permanent identity, a temporary number written with the letter of its kind: `P3` for a Proposal, `T3` for a Task, `D3` for a Drift (`t3` works too). It is unique per kind and the lowest free one is given when the working copy first reads the card; a Proposal has one from the start, also as a Draft. A card is live while it is a Proposal not yet approved, rejected or discarded, a Drift not yet resolved, or a Task in To do or In progress. When a card closes (a decided Proposal, a resolved Drift, a Task in Done) it loses its number, which becomes free; a Task that leaves Done takes the lowest free number, not necessarily the one it had. A closed card is cited only by its identity. Exception: a Task of a design (linked to a Proposal, even when it is the only one) keeps its number in Done while a Task of the same design is in To do or In progress, and is cited by it as a live card; all the design's Tasks lose their numbers together on the first read that finds them all Done. A Done Task without a number never takes one, even when its design reopens.
- A command that names a card accepts its short number wherever it accepts an identity, including decision commands (`approve`, `reject`, `discard`, `drift move`). An argument made of `P`, `T` or `D` followed only by digits is always a short number, never the start of an identity. It is refused, changing nothing, with a message that says why, when the letter is not the kind the command expects (`T3` given to a Proposal command: it is a Task) or when no live card has that number. The command turns the number into the permanent identity before it writes anything: file and folder names, front matter (`requires`, `proposal`, `drift`, `task`, `origin`, `refs`), the branch `trama/<id>`, instructions sent to the agent and texts written in files use the identity, never the number.
- Where output names a card (`project show`, `list`, `show`, `next`, command messages, the Board's cards and buttons) it shows the short number if the card has one and, only if it has none, the identity. Never both. With `--json`, every command that describes a Proposal, Task or Drift carries both `id` (the permanent identity) and `number` (`"T3"`; no number for a closed card).
- Numbers belong to a working copy, not to the project. They are kept in `.trama/short-numbers/assigned`, one line per live card, `<kind> <identity> <number>` with kind `proposal`, `task` or `drift`. The folder is not versioned: it has its own `.gitignore` containing `*`, written with the first `assigned`. The file is written to a temporary file and renamed, so the panel and a command running together never read half of it; a rename refused as busy (`EPERM`, `EACCES` or `EBUSY`, as on Windows while another process holds the file) is retried for up to one second, and then the error is given and the temporary file is removed. If `assigned` is missing, unreadable, has a line that makes no sense or repeats a number of the same kind, the working copy renumbers the live cards from zero in creation order; no command fails because of it. A card that arrives from another branch or worktree takes its number on the first read.
- **Claims of the files a Run writes.** In a Run launched by Trama (`TRAMA_RUN=1`), the write tools (`write`, `edit`, `apply_patch`, `ast_edit`) claim the project files they name before they run. A sub-agent's claim is kept in `.trama/claims/`, one file per path. Another sub-agent of the Run that writes a claimed file is stopped with a message naming the holder (`claimed by sub-agent <id> of this run`); the holder, or a sub-agent under it, renews the claim. The main agent is stopped by a live claim and never claims; the advisors neither claim nor are stopped. A call naming several paths claims all of them or none. A claim lasts two hours without renewal and is released when its sub-agent ends without continuing (`willContinue` not true) or when its terminal ends. If the claim store cannot be read or written, the write is stopped with the path and the reason. The folder is not versioned: it has its own `.gitignore` containing `*`.
- Exit codes: `0` success; `1` domain failure (validation errors, unknown element, stale Proposal); `2` usage error.
- Commands that create a file print its ID and path. The agent may edit the file's prose directly afterwards.
- **PowerShell.** The examples use POSIX syntax. Pass JSON on standard input with a pipe and `--input -`, for example `Get-Content -Raw round.json | trama question new --input -`, not with `<` or a heredoc, and never as the text of `--input`: Windows PowerShell 5.1 strips the inner quotes of the arguments it passes to external programs. On Windows PowerShell 5.1, set `$OutputEncoding` and `[Console]::OutputEncoding` to UTF-8 first, or non-ASCII characters arrive as `?`.

## Command reference

Every command is declared once, in the registry of `src/cli`, and this reference is generated from it with `bun run docs:cli`: the objects and verbs, the positional arguments, each field of the input with its type, whether it is required and its default, the fields of the output of `--json`, and how the command runs. `trama <command> --help` prints the same for one command, and `trama <command> --help --json` its JSON Schemas.

<!-- commands:start (generated by `bun run docs:cli` from the command registry; do not edit by hand) -->

### `model`

#### `trama model show [<ref>]`

Without a reference, the System: description, Actors and Features. With a Feature, a Machine, an Actor, a State (`machine/State`), a Transition (`machine/State/owner.EVENT`) or an Event (`owner.EVENT`), its view followed by the Requirements that apply to it. `requirements` lists the Areas and `requirements/<area>` shows a whole Area. On a State, `to` gives the simple paths from it to another State of the same Machine, the shortest first. Read-only; it never reads the code.

- `<ref>` (optional): A reference: `order`, `order/Paid`, `order/Paid/user.CANCEL`, `user.CANCEL`, `requirements` or `requirements/<area>`.

Input (`--input`):

- `to`: `string not empty`, optional. Only on a State: the name of another State of the same Machine; prints the simple paths from the State to it.
- `max`: `integer ≥ 1`, optional. Only with `to`: the most paths to print (default 20).

```sh
trama model show order/Paid --input - <<'JSON'
{"to":"Shipped","max":5}
JSON
```

Output (`--json`):

The System (no reference):

- name: string, required
- description: string, required
- actors: { id: string, description: string, events: string[] }[], required
- features: { id: string, name: string, description: string, machines: string[] }[], required

A Feature:

- id: string, required
- name: string, required
- description: string, required
- machines: { id: string, description: string }[], required
- flows: { event: string, machine: string }[], required

A Machine:

- id: string, required
- feature: string, required
- name: string, required
- description: string, required
- states: object[], required. The State tree.
- events: { name: string, description: string, receivers: { machine: string, state: string, target: string, prose: string }[] }[], required

An Actor:

- id: string, required
- name: string, required
- description: string, required
- events: { name: string, description: string, receivers: { machine: string, state: string, target: string, prose: string }[] }[], required

A State:

- machine: string, required
- name: string, required
- description: string, required
- initial: boolean, required
- final: boolean, required
- parent: string | null, required
- children: string[], required
- outgoing: object[], required
- incoming: object[], required

A Transition:

- ref: string, required
- machine: string, required
- state: string, required
- event: string, required
- transitions: { target: string, prose: string }[], required

An Event:

- ref: string, required
- owner: string, required
- ownerKind: "machine" | "actor", required
- description: string, required
- receivers: { machine: string, state: string, target: string, prose: string }[], required. The Transitions that react to the Event.

A State with `to`: the simple paths to another State:

- machine: string, required
- from: string, required
- to: string, required
- limited: boolean, required
- paths: object[][], required

`requirements`: the Areas:

- areas: object[], required

`requirements/<area>`: an Area in full:

- id: string, required
- title: string, required
- description: string, required
- sections: object[], required

`requirements/<area>#<section>`: one section:

- area: string, required
- section: object, required

Runs at once; read-only.

#### `trama model list`

Case-insensitive match over the names and the prose of the whole Model and its Requirements; each hit with its reference. Read-only.

Input (`--input`):

- `text`: `string not empty`, required. The text to look for.

```sh
trama model list --input - <<'JSON'
{"text":"cancel"}
JSON
```

Output (`--json`):

- query: string, required
- hits: { ref: string, kind: string, text: string }[], required

Runs at once; read-only.

#### `trama model check [<machine>]`

Reports the consistency errors of the Model and of the Requirements and, apart, the warnings: States that cannot be reached, dead ends, Events nobody receives and fragments larger than 12 KB. With a Machine, the warnings of the Model are only its own. Only errors change the exit code (1). It never checks the code.

- `<machine>` (optional): Limit the warnings of the Model to this Machine.

Output (`--json`):

- valid: boolean, required. False when there is any error.
- errors: { file: string, line: integer, message: string }[], required
- warnings: { machine: string | null, kind: string, subject: string, message: string }[], required

Runs at once; read-only.

### `proposal`

#### `trama proposal new`

Every new Proposal starts as a Draft; hand it over with `proposal move <id> open` when it is finished. `kind` is `change` (default), `import` (existing code), `resolution` (a resolution of Drifts), `setup` (the first Proposal of an empty Model) or `handoff` (work given to the people of the team, with issues instead of Tasks; refused, creating nothing, when Team is not available). `label` is the short label (1 to 30 characters, one line), required before a Proposal with Tasks, or a handoff (its epic), is handed over. `requires` lists the Proposals it depends on. `prepared` applies only to a resolution born from the answer to a Drift's prepared question. `announcement` is the ID printed by `trama announcement new`; `request` binds the Proposal to the written design request it comes from. `reworks` names the rejected Proposal this one redoes (Rework with feedback): when it exists, is rejected and is not already redone, the new Proposal takes its place (same creation instant) and replaces it in the `requires` of every Draft or open Proposal, which the result lists; otherwise the Proposal is created without the link and `reworksNote` says why. `reworks` and `request` cannot be given together.

Input (`--input`):

- `title`: `string not empty`, required. A short title: at most five words.
- `body`: `string`, optional. The text of the Proposal, in Markdown.
- `kind`: `"change" | "import" | "resolution" | "setup" | "handoff"`, optional. The kind of Proposal. Default `change`.
- `label`: `string`, optional. The short label of the Proposal: 1 to 30 characters, one line.
- `requires`: `string not empty[]`, optional. The Proposals this one requires: IDs or short numbers.
- `prepared`: `boolean`, optional. A resolution born from the answer to a Drift's prepared question. Only with kind `resolution`.
- `announcement`: `string not empty`, optional. The announcement of this Proposal.
- `request`: `string not empty`, optional. The written design request this Proposal comes from.
- `reworks`: `string not empty`, optional. The rejected Proposal this one redoes: ID or short number. Not with `request`.

```sh
trama proposal new --input - <<'JSON'
{"title":"Order cancel","body":"# Order cancel\n\nA paid order can be cancelled.","label":"Order cancel","announcement":"a1b2c3d4"}
JSON
```

Output (`--json`):

- id: string, required
- number: string | null, required
- status: string, required
- path: string, required
- request: string | null, required
- reworks: string | null, required. The ID of the rejected Proposal now bound, or null.
- note: string, optional. About the announcement, when it was not known.
- requestNote: string, optional. About the design request, when it was not bound.
- reworksNote: string, optional. Why the Proposal does not redo the one named in `reworks`, when it was not bound.
- requiresChanged: string[], optional. The Draft or open Proposals whose `requires` now names this Proposal instead of the rejected one.

Runs at once; writes in `.trama/`, counts as the agent's activity, sends messages to the editor.

#### `trama proposal show <id>`

The Proposal's text, its status, what it requires, the files it changes, its Tasks (each with the images tied to it, as `images` in `--json`), the scope it covers and the validation of the Model and Requirements with it applied. Read-only.

- `<id>`: The Proposal: its ID, a unique prefix or its short number.

Output (`--json`):

- id: string, required
- number: string | null, required
- status: string, required
- title: string, required
- tasks: { id: string, images: string[] }[], optional

Runs at once; read-only.

#### `trama proposal list`

Without `all`, only the Drafts and the open Proposals. Read-only.

Input (`--input`):

- `all`: `boolean`, optional. Every Proposal, the decided ones included.

```sh
trama proposal list --input - <<'JSON'
{"all":true}
JSON
```

Output (`--json`):

- proposals: { id: string, number: string | null, status: string, title: string }[], required

Runs at once; read-only.

#### `trama proposal edit <id>`

Every use sends an open Proposal back to Draft and says so; hand it over again with `proposal move <id> open`. Without input it only returns an open Proposal to Draft, touching no file. `rebase` records again the starting version of each file the Proposal holds, so a stale Proposal is no longer stale, and marks the Draft refining until it is handed over again; only an ordinary change Proposal not attached to a Drift can be rebased. `label` writes or changes the short label. `edit` makes each path (a Model file, `specs.yaml`, a Requirement fragment such as `requirements/<area>/<fragment>.md`, a Task as `tasks/<slug>.md`, or an issue of a handoff as `issues/<slug>.md`) editable inside the Proposal and prints the path to write for each; a new Task or issue takes a new identity, unique among the Tasks and the issues, and one is rewritten by the full name printed. `delete` marks each path for deletion, an issue file as `issues/<identity>-<slug>.md`. The Manager's changes to the fields of an issue (`manager`) are never written by this command. `drifts` records or replaces the decisions of a resolution on open Drifts; for a unified Drift with differences each entry also gives `difference`, the `drift` of the open difference it decides, one entry per difference and only for the differences the developer answered (an entry for such a Drift without `difference`, or with it for any other Drift, is refused). `removeDrifts` takes Drifts out of its list: a Drift as an ID or short number, or `{ drift, difference }` for one difference. `images` ties images to the Tasks of the Proposal, a list of `{ task, path }` (`path` is a local `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` or `.svg` file, absolute or relative to the project root), and `removeImages` takes them away, a list of `{ task, name }`. The file is copied into `.trama/task-images/<Task identity>/` (not versioned), and a change returns an open Proposal to Draft.

- `<id>`: The Proposal: its ID, a unique prefix or its short number.

Input (`--input`):

- `label`: `string`, optional. The short label: 1 to 30 characters, one line.
- `rebase`: `boolean`, optional. Record again the starting version of each file the Proposal holds, so it is no longer stale; marks it refining until handed over again. Only an ordinary change Proposal not attached to a Drift.
- `edit`: `string not empty[]`, optional. Paths to make editable inside the Proposal.
- `delete`: `string not empty[]`, optional. Paths to mark for deletion.
- `drifts`: `{ drift: string not empty, difference?: string not empty, decision: "proposal" | "dismissed" | "fix-code", option?: integer ≥ 1, note?: string }[]`, optional. The decisions to record on Drifts. Only in a resolution.
- `removeDrifts`: `string not empty | { drift: string not empty, difference: string not empty }[]`, optional. Drifts to take out of the list: IDs or short numbers, which takes out every entry of the Drift; `{ drift, difference }` takes out the entry of one difference.
- `images`: `{ task: string not empty, path: string not empty }[]`, optional. Images to tie to Tasks of the Proposal. The file is copied into `.trama/task-images/<Task identity>/` (not versioned), and a change returns an open Proposal to Draft.
- `removeImages`: `{ task: string not empty, name: string not empty }[]`, optional. Images to take away from Tasks of the Proposal.

```sh
trama proposal edit P3 --input - <<'JSON'
{"edit":["order/order.md","tasks/cancel.md"],"label":"Order cancel"}
JSON
```

Output (`--json`):

- id: string, required
- number: string | null, required
- status: string, required
- returnedToDraft: boolean, required
- label: string | null, required
- paths: { path: string, edit: string }[], required. The path to write, for each path of `edit`.
- drifts: { drift: string }[], required
- images: string[], required. The path of each image copy made, in the order of `images`.

Runs at once; writes in `.trama/`, counts as the agent's activity.

#### `trama proposal move <id> <state>`

`open` hands a valid Draft over to the developer: it checks the Model and Requirements with the Proposal applied and prints the warnings and `proposal show` of the Proposal; a setup Proposal on an empty Model is approved at once. A handoff is also refused, naming each problem, when Team is not available, it has no issue, an issue has no title or an empty body, an assignee or a reviewer is not a member of the team (read from the editor, as `trama team show` does: when the editor does not answer the hand-over is refused with the reason) or both are the same person, an estimate is not a number of days from 0.5 in steps of 0.5, a dependency names an issue outside the handoff and the handoffs it requires or the dependencies make a cycle, a reference does not exist, the label is missing or over 30 characters, or it has `tasks/`; the coverage of what it changes and estimates over 3 days are only warnings. `approved` accepts an open Proposal and applies it in this folder; a handoff, only while Team is available and a GitHub Project is linked, creates its issue cards in `.trama/issues/` in the same step, and no Task. `rejected` rejects an open Proposal. `discarded` discards a Draft. Approving and rejecting a Proposal attached to an open Drift is refused: the decision is on the Drift. `skillsDir` (with `approved`, and with `open` for a setup Proposal) adds the configured skills folder where the `trama-req-*` skills are regenerated. `feedback` (only with `rejected`) is the text for the agent. Approving, rejecting and discarding are the developer's decisions.

- `<id>`: The Proposal: its ID, a unique prefix or its short number.
- `<state>`: Where the Proposal goes. One of `open`, `approved`, `rejected`, `discarded`.

Input (`--input`):

- `skillsDir`: `string not empty`, optional. The configured skills folder to regenerate, besides the ones found. Only toward `approved` or `open`.
- `feedback`: `string`, optional. The reason for the agent. Only toward `rejected`.

```sh
trama proposal move P3 approved --input - <<'JSON'
{"skillsDir":".agents/skills"}
JSON
```

Output (`--json`):

- id: string, required
- number: string | null, required
- status: string, required
- warnings: object[], optional
- show: string, optional. Toward `open`: the text of `proposal show`.
- resolved: { drift: string }[], optional. Toward `approved`: the Drifts a resolution decided.
- issues: string[], optional. Toward `approved`: the identities of the issue cards a handoff created.

Runs at once; writes in `.trama/`, counts as the agent's activity, sends messages to the editor.

### `task`

#### `trama task new`

A Task that is not technical references at least one Model element (`refs`, which may add Requirement sections); a technical Task references only Requirements, if any. `proposal` links it to the design it comes from; with `drift` the design is that of the origin Task, and a different `proposal` is refused. `announcement` is the ID printed by `trama announcement new`.

Input (`--input`):

- `title`: `string not empty`, required. A short title: at most five words.
- `refs`: `string not empty[]`, optional. Model elements and Requirement sections the Task is about.
- `technical`: `boolean`, optional. A Technical Task: it references no Model element. Default false.
- `drift`: `string not empty`, optional. The Drift this Task fixes: its ID or short number.
- `proposal`: `string not empty`, optional. The Proposal the Task comes from: its ID or short number.
- `body`: `string`, optional. The text of the Task, in Markdown.
- `announcement`: `string not empty`, optional. The announcement of this Task.

```sh
trama task new --input - <<'JSON'
{"title":"Order cancel","refs":["order/Paid"],"body":"Cancel a paid order.","announcement":"a1b2c3d4"}
JSON
```

Output (`--json`):

- id: string, required
- number: string | null, required
- path: string, required
- note: string, optional. About the announcement, when it was not known.

Runs at once; writes in `.trama/`, counts as the agent's activity.

#### `trama task show <id>`

Everything needed to carry the Task out, with no pointers to other commands or skills: the Model elements it references in full, and the Requirements that apply. Names each Drift or Task that blocks it. An `Images` block lists the absolute paths of the images tied to the Task, and `--json` carries them as `images`. Read-only.

- `<id>`: The Task: its ID, a unique prefix or its short number.

Output (`--json`):

- id: string, required
- number: string | null, required
- title: string, required
- column: "todo" | "doing" | "done", required
- body: string, required
- images: string[], required. The absolute paths of the images tied to the Task; empty when it has none.

Runs at once; read-only.

#### `trama task list`

Without `runnable`, every Task by column, filtered by `column` and `tasks`. With `runnable: true`, the next runnable Task (in To do, not blocked), or with `max` the Tasks for the free places of a parallel run: up to `max` of them, none concerning the same thing as another or as a Task In progress the agent has taken. `tasks` keeps only the named Tasks, `proposals` only those of the named Proposals and `notProposals` all but those (the Tasks with no Proposal included); the two never go together. When none is runnable it says so and lists the Tasks in To do with what blocks them. With `heldBack: true` it adds `## Held back`: the runnable Tasks the free-places rule left out because they concern the same thing as a chosen Task or a Task the agent has taken, each with the Tasks it overlaps; blocked Tasks and Tasks left out only for lack of places are not there. With `groups: true` it prints the runnable Tasks in groups instead: each `## Group <n>` holds Tasks that concern the same thing, directly or through other Tasks of the group, or name the same project file, with what they share; the largest group comes first, and `max` counts groups. Runnable Tasks that concern a Task the agent has taken are held back as above, and blocked Tasks take no part. With `scope: true` it adds the scope of a scan: with `runnable`, the exact references of the runnable Tasks (the pre-flight), the ones already compared on this code apart; without it, the scope of the Tasks named in `tasks`, which is then required. Moves nothing.

Input (`--input`):

- `column`: `"todo" | "doing" | "done"`, optional. Only the Tasks of this column. Not with `runnable`.
- `runnable`: `boolean`, optional. The runnable Tasks instead of every Task.
- `max`: `integer ≥ 1`, optional. With `runnable`: up to this many Tasks, for a parallel run; with `groups`, up to this many groups.
- `tasks`: `string not empty[]`, optional. Only these Tasks: IDs or short numbers; each must exist.
- `proposals`: `string not empty[]`, optional. With `runnable`: only the Tasks of these Proposals.
- `notProposals`: `string not empty[]`, optional. With `runnable`: every Task but those of these Proposals.
- `scope`: `boolean`, optional. Add the scope of the scan.
- `heldBack`: `boolean`, optional. With `runnable`, without `scope`: add the runnable Tasks kept out because they concern the same thing as a chosen or taken Task.
- `groups`: `boolean`, optional. With `runnable`: the runnable Tasks in groups for a parallel run: Tasks that concern the same thing, directly or through others, or name a common project file. `max` then counts groups. Not with `scope` or `heldBack`.

```sh
trama task list --input - <<'JSON'
{"runnable":true,"max":3,"proposals":["a1b2c3d4"]}
JSON
```

Output (`--json`):

Without `runnable`:

- tasks: { id: string, number: string | null, title: string, column: "todo" | "doing" | "done" }[], required

`runnable`; `heldBack` with `heldBack: true`:

- next: { id: string, number: string | null, title: string } | null, required
- waiting: { id: string, number: string | null, title: string, column: "todo" | "doing" | "done" }[], required
- heldBack: { id: string, number: string | null, title: string, overlaps: { id: string, number: string | null }[] }[], optional

`runnable` with `max`; `heldBack` with `heldBack: true`:

- batch: { id: string, number: string | null, title: string }[], required
- waiting: { id: string, number: string | null, title: string, column: "todo" | "doing" | "done" }[], required
- heldBack: { id: string, number: string | null, title: string, overlaps: { id: string, number: string | null }[] }[], optional

`runnable` with `groups`:

- groups: { tasks: { id: string, number: string | null, title: string }[], refs: string[], files: string[] }[], required
- heldBack: { id: string, number: string | null, title: string, overlaps: { id: string, number: string | null }[] }[], required

`scope` with `runnable`:

- refs: { ref: string }[], required
- alreadyCompared: { ref: string }[], required
- tasks: { id: string, number: string | null, title: string }[], required

Runs at once; read-only.

#### `trama task move <id> <column>`

Run as the agent (in the terminal Trama started, or in an omp Chat conversation, which counts as the terminal it replaces), a move to `doing` takes the Task and a move to `todo` or `done` clears that; without a recognised `TRAMA_TERMINAL` the move to `doing` is refused with an error saying that only an agent launched by Trama can take a Task, and the Task is neither taken nor moved. A move to `doing` is also refused, changing nothing, when the Task is blocked. Run as the developer, a move of a Task the agent has taken is refused, except to `doing`, which takes it back: the mark goes and the Task stays In progress. `unchanged` (a note saying what was checked) closes a fix Task into Done without changes when the code already does what the Drift's Model or Requirement says, and dismisses its Drift; for the fix Task of differences of a unified Drift, it closes those differences without changes (each keeps its chosen option and note) and the Drift keeps its state; it applies only to `done`. `progress` (0 to 100, in steps of 10) does not move anything: with `doing`, it only declares how far along the agent is on a Task it has taken, in place of the previous percentage. A declaration is accepted only from the terminal or conversation that holds the Task (its sub-agents included); one from another terminal or conversation, from an agent without a recognised `TRAMA_TERMINAL`, from the developer or on a Task not taken changes nothing and prints a note, with exit 0.

- `<id>`: The Task: its ID, a unique prefix or its short number.
- `<column>`: Where the Task goes. One of `todo`, `doing`, `done`.

Input (`--input`):

- `unchanged`: `string not empty`, optional. Only toward `done`: closes a fix Task without changes, with the note of what was checked.
- `progress`: `integer ≥ 0, ≤ 100`, optional. Only toward `doing`: declares the percentage of the Task the agent has taken, 0 to 100 in steps of 10; the Task is not moved, taken or released. Not with `unchanged`.

```sh
trama task move T3 doing --input - <<'JSON'
{"progress":40}
JSON
```

Output (`--json`):

- id: string, required
- number: string | null, required
- column: "todo" | "doing" | "done", required
- unchanged: string | null, optional
- drift: string | null, optional
- progress: number | null, optional
- note: string, optional

Runs at once; writes in `.trama/`, counts as the agent's activity.

#### `trama task check <id>`

Reads the Task. If the agent has not taken it (a Task in To do or Done, or an In progress one the developer holds), answers `not-taken`, without contacting the editor and changing nothing. A Task the agent has taken with no known holder is answered `unknown-holder`, also without contacting the editor and changing nothing. Otherwise it asks an open editor window of the project, found as `trama question new` does, to run at once the execution check of that Task and waits up to 5 seconds: the window answers `alive`, with the holder, or `released`, with the reason, after putting the Task back in To do with the notice on its Board, or `unknown-holder` when the window does not recognise the holder. Without a reachable editor, or without an answer in time, it answers `unavailable`. It does not take or move the Task, writes no file, does not count as the agent's activity and anyone can run it. Exits with 0 for every outcome; a Task that does not exist is an error as in `task show`.

- `<id>`: The Task: its ID, a unique prefix or its short number.

Output (`--json`):

- task: string, required. The permanent identity of the Task.
- result: "alive" | "released" | "not-taken" | "unknown-holder" | "unavailable", required
- holder: string, optional. Who holds the Task, with `alive`.
- reason: string, optional. Why the Task was put back in To do, with `released`.

Runs and waits for the editor; read-only.

#### `trama task delete <id>`

Deletes the Task, its percentage and its images, with no confirmation and no way back. Only a Task in To do is deleted, blocked or not, and also one that went back to To do after the agent took it. It is refused, changing nothing and saying why, when the Task is In progress or Done, when an open Drift names it as an origin, or when it is the Task that fixes the code of a Drift in Code to be fixed. Writes nothing in History and does not count among the Tasks finished since the last global scan; its short number becomes free. Run it as the agent only when the developer asks for it explicitly in the conversation.

- `<id>`: The Task: its ID, a unique prefix or its short number.

Output (`--json`):

- id: string, required. The permanent identity of the deleted Task.
- title: string, required

Runs at once; writes in `.trama/`.

### `drift`

#### `trama drift new`

`happens` (what the code does, in terms of behaviour) and `should` (what the Model or Requirement says) are short Markdown; `where` is required and says where in the code the difference was seen (read that code before filing; files and code names go only there). `options` are from two to five fix options, the first being the one you recommend; without options the Drift is accepted only with an attached `proposal`. `task` names the Task you were implementing when you found the difference (the origin). `previous` is the resolved Drift this one follows. `merge: true` marks a Drift from a merge, found by the scan after a Merge in Solo mode in a file the merge brought: the code may be right. It is written only when true and never changes. `announcement` is the ID printed by `trama announcement new`. `unifies` (Unify Drifts) names at least two open Drifts, by ID or short number, that this Drift gathers, and then `differences` is required: one difference for each Drift gathered, or for each difference of a gathered unified Drift, in their creation order, each `{ drift, title, refs, happens, should, where, options?, proposal?, linked? }`. `drift` is the Drift the difference comes from (ID or short number); the title, refs, sides, where in the code and fix options are what that Drift said, rewritten only where a linked difference requires it; without `options` a difference needs the Proposal attached to its Drift (which stays when `proposal` is omitted) or a new Draft or open Proposal that no open Drift holds in `proposal`; `linked` lists the `drift` of the other differences whose fix is entangled with this one (symmetric). The unified Drift decides nothing: the developer decides it difference by difference with Resolve. In the same step each gathered Drift becomes resolved as `unified` into the new Drift, keeps its fields and loses its short number and prepared question; its attached Proposal stays attached, held by its difference, unless `proposal` attaches a new one to that difference in its place: the replaced one is then discarded without feedback. The new Drift takes the origins and precedents of the gathered Drifts by itself, so `task` and `previous` are refused with `unifies`, and so are `refs`, `happens`, `should`, `where`, `options` and `proposal` at the top level; `differences` without `unifies` is refused too. It is from a merge when at least one of the Drifts it gathers is. It is refused, writing nothing and naming every problem in a line, when `unifies` has fewer than two Drifts or a repeated one; a Drift is missing, not open, in a resolution being written or open, or a unified Drift with a decided difference; `differences` has not exactly one entry for each difference the gathered Drifts give, in order; a difference breaks the rules of a Drift's sections and options or has neither options nor `proposal`; a `linked` name is not another difference of the same Drift; or a `proposal` is neither the one attached to its Drift (or difference) nor a Draft or open one attached to no open Drift. On success it prints `Unified <ID> into <new ID>` for each gathered Drift; with `--json` it adds `unifies` and `differences`. With `dryRun: true` nothing is written: it prints the Tasks a Drift with these `refs` and this `task` (or these `unifies`, origins included) would block, by number or identity and title; only `refs` and `task` (or `unifies`) are needed then.

Input (`--input`):

- `title`: `string not empty`, optional. A short title: at most five words. Required unless `dryRun`.
- `refs`: `string not empty[]`, optional. The Model elements and Requirement sections the Drift is about. Required, except with `unifies`, where each difference has its own.
- `happens`: `string`, optional. What the code does, in terms of behaviour. Required unless `dryRun`. Not with `unifies`.
- `should`: `string`, optional. What the Model or Requirement says. Required unless `dryRun`. Not with `unifies`.
- `where`: `string`, optional. Where in the code the difference was seen. Required unless `dryRun`. Not with `unifies`.
- `options`: `{ title: string, text: string }[]`, optional. From 2 to 5 fix options, the recommended one first; none only with `proposal`. Not with `unifies`.
- `task`: `string not empty`, optional. The Task being implemented when the Drift was found: its ID or short number. Not with `unifies`.
- `proposal`: `string not empty`, optional. The Draft or open Proposal that goes with the Drift: its ID or short number. Not with `unifies`.
- `previous`: `string not empty`, optional. The resolved Drift this one follows: its ID or short number. Not with `unifies`.
- `merge`: `boolean`, optional. True for a Drift from a merge: its Where in the code is in a file the merge brought. Default false; written only when true.
- `announcement`: `string not empty`, optional. The announcement of this Drift.
- `unifies`: `string not empty[]`, optional. Unify Drifts: the open Drifts, by ID or short number, this Drift gathers and closes as `unified`. At least two, none repeated, none in a resolution being written or open. With `differences`.
- `differences`: `{ drift: string not empty, title: string not empty, refs: string not empty[], happens: string, should: string, where: string, options?: { title: string, text: string }[], proposal?: string not empty, linked?: string not empty[] }[]`, optional. With `unifies`: one difference for each difference the gathered Drifts give, in their creation order.
- `dryRun`: `boolean`, optional. Write nothing: print the Tasks the Drift would block.

```sh
trama drift new --input - <<'JSON'
{"title":"Late refund","refs":["order/Paid"],"happens":"A paid order cannot be refunded after a day.","should":"A paid order can be refunded at any time.","where":"src/order.ts","options":[{"title":"Remove the limit","text":"Refunds work at any time."},{"title":"Warn instead","text":"Late refunds ask for confirmation."}],"task":"a1b2c3d4","announcement":"e5f6a7b8"}
JSON
```

Output (`--json`):

Either:

- id: string, required
- number: string | null, required
- path: string, required
- previous: string[], required
- unified: string[], required. The Drifts a unified Drift gathered, by identity.
- unifies: string[], optional. With `unifies`: the Drifts gathered, by identity.
- differences: { drift: string }[], optional. With `unifies`: the differences of the new Drift.
- note: string, optional. About the announcement, when it was not known.

`dryRun`:

- tasks: { id: string, number: string | null, title: string }[], required

Runs at once; writes in `.trama/`, counts as the agent's activity, sends messages to the editor.

#### `trama drift show <id>`

Both sides, the fix options, where in the code, the references with the Requirements that apply, the attached Proposal and, when the Drift has a prepared question, its status (`valid`, `stale: <reason>` or `unreadable`), the question, each option with its decision and the recommended one. Read-only.

- `<id>`: The Drift: its ID, a unique prefix or its short number.

Output (`--json`):

- id: string, required
- number: string | null, required
- title: string, required
- status: string, required
- job: string | null, required
- prepared: { valid: boolean } | null, required

Runs at once; read-only.

#### `trama drift list`

With `all: true`, every Drift. `refs` keeps only the Drifts that concern the same thing as one of the given references, as the Task blocks do; a reference that does not resolve is refused. `job` keeps the Drifts filed by that job (`TRAMA_JOB`). `currentJob: true` keeps the Drifts filed by the job of this command (its `TRAMA_JOB`); without `TRAMA_JOB` it lists nothing, says so and exits with 0, and together with `job` it is a usage error. `unprepared: true` keeps the open Drifts that have no valid prepared question and are in no resolution being written or open. The filters combine. Read-only.

Input (`--input`):

- `all`: `boolean`, optional. Every Drift, not only the open ones.
- `refs`: `string not empty[]`, optional. Only the Drifts that concern the same thing as one of these references.
- `job`: `string not empty`, optional. Only the Drifts filed by this job.
- `currentJob`: `boolean`, optional. Only the Drifts filed by the job of this command (`TRAMA_JOB`); nothing when there is none. Not together with `job`.
- `unprepared`: `boolean`, optional. Only the open Drifts without a valid prepared question, outside every resolution being written or open.

```sh
trama drift list --input - <<'JSON'
{"all":true,"refs":["order/Paid"],"unprepared":true}
JSON
```

Output (`--json`):

- drifts: { id: string, number: string | null, title: string, status: string, job: string | null, prepared: { valid: boolean } | null }[], required

Runs at once; read-only.

#### `trama drift edit <id>`

At least one of `prepared` and `proposal`. `proposal` attaches a Draft or open Proposal that no other open Drift holds to an open Drift that has none (the rules of `drift new`); a Drift that already has one refuses it. `prepared` writes the Drift's **prepared question**, the one Resolve Drifts would ask the developer, replacing the earlier one: `question` is one question of `trama question new` (its `id` is the Drift's permanent identity, `multi` is `false`) and `decisions` has one decision for each of its options, in the same order. The `fix-code` decisions (`option` counted from 1) name every fix option of the Drift once, plus exactly one `proposal` or `dismissed`; a Drift without fix options has exactly one `proposal` and one `dismissed`. A `proposal` decision needs an attached Proposal, also one given in the same command. Trama records the fingerprint of the Model and Requirements text the Drift's references have now and the instant, so a later change of that text makes the question stale. A unified Drift with differences takes `prepared` as `{ questions: [{ difference, question, decisions }] }`, the **prepared round**: one question for each open difference to write or replace (`difference` is its `drift`, as ID or short number, and the `id` of its question), the others being kept; the checks are those above made on that difference, with its own fix options and the Proposal attached to it, and the fingerprint is that of the references of the difference. It takes `proposal` as `{ difference, proposal }`, the Proposal to attach to one open difference that has none. A single `prepared.question` on such a Drift, and `questions` or a Proposal ID on any other, are usage errors. A wrong input is a usage error naming the field, and nothing is written.

- `<id>`: The Drift: its ID, a unique prefix or its short number.

Input (`--input`):

- `prepared`: `{ question?: object, decisions?: { decision: "fix-code" | "proposal" | "dismissed", option?: integer ≥ 1 }[], questions?: { difference: string not empty, question: object, decisions: { decision: "fix-code" | "proposal" | "dismissed", option?: integer ≥ 1 }[] }[] }`, optional. The prepared question, or the prepared round of a unified Drift with differences, and what each option does.
- `proposal`: `string not empty | { difference: string not empty, proposal: string not empty }`, optional. The Draft or open Proposal to attach: its ID or short number; for a unified Drift with differences, `{ difference, proposal }`.

```sh
trama drift edit D3 --input - <<'JSON'
{"prepared":{"question":{"id":"a1b2c3d4","question":"A paid order cannot be refunded after a day. What should change?","context":"The Model says a paid order can be refunded at any time.","options":[{"label":"Remove the limit","description":"Refunds work at any time.","details":"Fix the code to match the Model."},{"label":"Keep the code","description":"Late refunds stay refused."}],"recommended":0,"multi":false},"decisions":[{"decision":"fix-code","option":1},{"decision":"dismissed"}]}}
JSON
```

Output (`--json`):

- id: string, required
- number: string | null, required
- proposal: string | null, required
- prepared: { valid: boolean } | null, required

Runs at once; writes in `.trama/`.

#### `trama drift move <id> <state>`

Carries out a decision of the developer. `code-to-be-fixed` keeps what should happen: it creates the Fix Task and takes `option` (the number of the chosen fix option, from 1; required when the Drift has options, and in an interactive terminal without it the options are shown as a menu) and the optional `note`; it sets aside the attached Proposal (an open one is rejected, a Draft discarded). `proposal-accepted` approves the attached Proposal, and `skillsDir` adds the configured skills folder where the `trama-req-*` skills are regenerated. `dismissed` closes the Drift without changes. `option` and `note` toward the other two are refused. A resolved Drift is not resolved again, and a Drift `unified` into another is decided there. A unified Drift with differences is decided difference by difference with Resolve: `code-to-be-fixed` and `proposal-accepted` are refused, and `dismissed` closes every open difference without changes (the decided ones keep their outcome), refused when an open difference has an attached Proposal.

- `<id>`: The Drift: its ID, a unique prefix or its short number.
- `<state>`: How the Drift is resolved. One of `code-to-be-fixed`, `proposal-accepted`, `dismissed`.

Input (`--input`):

- `option`: `integer`, optional. Only toward `code-to-be-fixed`: the number of the chosen fix option, from 1.
- `note`: `string`, optional. Only toward `code-to-be-fixed`: free text kept with the choice.
- `skillsDir`: `string not empty`, optional. Only toward `proposal-accepted`: the configured skills folder to regenerate, besides the ones found.

```sh
trama drift move D3 code-to-be-fixed --input - <<'JSON'
{"option":1,"note":"Keep the log."}
JSON
```

Output (`--json`):

- id: string, required
- number: string | null, required
- resolution: string | null, required
- task: string | null, required
- option: number | null, required
- note: string | null, required
- proposal: string, optional
- proposalSetAside: string, optional

Runs at once; writes in `.trama/`.

### `issue`

#### `trama issue list`

Prints the issues of `.trama/issues/` grouped by handoff, each with its identity, title, state (`publishing`, `not-published` or `published`) and GitHub number. The order is the order of publication: the issues an issue depends on come first. `handoff` keeps the issues of one handoff (its identity, a unique prefix or its short number) and `state` those in one state. Read-only. Fails with the reason of Manager mode when Team is not available.

Input (`--input`):

- `handoff`: `string not empty`, optional. Only the issues of this handoff: its ID, a unique prefix or its short number.
- `state`: `"publishing" | "not-published" | "published"`, optional. Only the issues in this state.

```sh
trama issue list --input - <<'JSON'
{"state":"not-published"}
JSON
```

Runs at once; read-only.

#### `trama issue show <id>`

Prints one issue with every field and, under `## GitHub body`, the body Trama composes for GitHub (`**Reviewer:**` and `**Depends on:**` lines, the body the agent wrote and, except with Solo mode on, the folded block of references): the same text the Team view previews and the agent publishes. For a published issue whose references changed since it was published or last commented on, `## Changed since publishing` gives, for each changed reference, the text it had (when git has it; otherwise only the reference is named) and the text it has. `--json` has the same fields, `githubBody` and `changed`. It also accepts an issue of a handoff that is not approved yet, by its identity: its fields are then the agent's with the Manager's changes applied. Read-only. Fails with the reason of Manager mode when Team is not available.

- `<id>`: The issue: its ID or a unique prefix.

Output (`--json`):

- id: string, required. The permanent identity of the issue.
- title: string, required
- handoff: string, required. The identity of the handoff the issue comes from.
- state: "publishing" | "not-published" | "published", required
- number: number | null, required. GitHub's number, once published.
- url: string | null, required. GitHub's address, once published.
- dependsOn: string[], required. The identities of the issues it depends on.
- approved: boolean, required. False for an issue of a handoff that is not approved yet.
- label: string | null, required. The handoff's label: the epic.
- body: string, required. What the agent wrote for GitHub, without the title and without the lines Trama adds.
- refs: string[], required
- estimate: number | null, required. Days.
- assignee: string | null, required. GitHub handle, without `@`.
- reviewer: string | null, required. GitHub handle, without `@`.
- sprint: string | null, required
- fields: object, required
- created: string | null, required
- published: string | null, required
- unset: string[], required. The fields GitHub did not take.
- reason: string | null, required. Why the issue is not published.
- updated: string | null, required. When the last Comment update was recorded.
- texts: object, required. The text fingerprint of each reference when the issue was published or last updated.
- githubBody: string, required. The body to publish on GitHub, composed by Trama.
- changed: { ref: string, earlier: string | null, current: string | null }[], required. The references of a published issue whose text is not what it was when the issue was published or last commented: the text they had (null when git does not have it) and the text they have (null when the reference no longer exists).

Runs at once; read-only.

#### `trama issue move <id> <state>`

`published` with `number` and `url` records that the agent created the issue on GitHub, right after creating it: Trama records the moment and the fingerprint of the text of each reference of the issue, so it can later tell whether the Model changed under it. `not-published` with `reason` records that GitHub refused it. `publishing` is refused: only Trama moves an issue there, when it asks the agent to publish. An issue that is already `published` is refused. Fails with the reason of Manager mode when Team is not available.

- `<id>`: The issue: its ID or a unique prefix.
- `<state>`: Where the issue goes. One of `publishing`, `not-published`, `published`.

Input (`--input`):

- `number`: `integer ≥ 1`, optional. Only toward `published`: the number GitHub gave the issue.
- `url`: `string not empty`, optional. Only toward `published`: the address of the issue on GitHub.
- `reason`: `string not empty`, optional. Only toward `not-published`: why GitHub did not create the issue.

```sh
trama issue move a1b2c3d4 published --input - <<'JSON'
{"number":12,"url":"https://github.com/acme/web/issues/12"}
JSON
```

Output (`--json`):

- id: string, required. The permanent identity of the issue.
- title: string, required
- handoff: string, required. The identity of the handoff the issue comes from.
- state: "publishing" | "not-published" | "published", required
- number: number | null, required. GitHub's number, once published.
- url: string | null, required. GitHub's address, once published.
- dependsOn: string[], required. The identities of the issues it depends on.
- reason: string | null, required

Runs at once; writes in `.trama/`, counts as the agent's activity.

#### `trama issue edit <id>`

`unset` lists the keys of the fields of the Project GitHub did not take (`assignee`, `reviewer`, `estimate`, `sprint` or `fields.<name>`) and replaces the earlier list; `updated: true` records that the agent wrote the Comment of an update on the issue, with the moment and the fingerprint of the text of its references now. Only a published issue is edited, and nothing else of an issue changes from the command line. Fails with the reason of Manager mode when Team is not available.

- `<id>`: The issue: its ID or a unique prefix.

Input (`--input`):

- `unset`: `string not empty[]`, optional. The keys of the fields GitHub did not take: `assignee`, `reviewer`, `estimate`, `sprint` or `fields.<name>`. An empty list says every field was taken.
- `updated`: `true`, optional. Records a Comment update.

```sh
trama issue edit a1b2c3d4 --input - <<'JSON'
{"unset":["sprint"]}
JSON
```

Output (`--json`):

- id: string, required. The permanent identity of the issue.
- title: string, required
- handoff: string, required. The identity of the handoff the issue comes from.
- state: "publishing" | "not-published" | "published", required
- number: number | null, required. GitHub's number, once published.
- url: string | null, required. GitHub's address, once published.
- dependsOn: string[], required. The identities of the issues it depends on.
- unset: string[], required
- updated: string | null, required

Runs at once; writes in `.trama/`, counts as the agent's activity.

#### `trama issue fields`

Reads, with the GitHub command line (`gh`), the fields of the GitHub Project linked in the Team view, each with its options, and the iterations of its sprint field with their dates, marking the sprint field (the first iteration field), the estimate field (the first number field whose name contains `estimate` or `days`, without case, which publication fills with the issue's estimate) and the current sprint (the one that contains today). Read-only, on GitHub and in the project. Fails, with exit code 1, when no Project is linked (`No GitHub Project is linked: link one in the Team view.`), when `gh` is not installed, is not logged in or cannot read Projects, with the reason the Team view shows, and with the reason of Manager mode when Team is not available.

Output (`--json`):

- project: { owner: string, number: number, title: string }, required. The linked GitHub Project.
- fields: { id: string, name: string, type: string, options?: { id: string, name: string }[], sprint: boolean, estimate: boolean }[], required
- iterations: { id: string, title: string, startDate: string, duration: number, current: boolean }[], required. The iterations of the sprint field, oldest first.

Runs and waits for the editor; read-only.

### `team`

#### `trama team show`

Prints the members of the current project's team, ordered by name: for each, name, `@handle`, level, skills, capacity per sprint in days and the absences that end today or later. The people live only in the Manager's editor, so the command asks the editor window that launched the agent, through the endpoint and secret of `trama question new`: it works only in an agent started by Trama. It has no input and never writes. Fails, with exit code 1, with `trama team show needs the editor: only an agent started by Trama can read the team.` without the editor's endpoint and a recognised terminal, with `The editor did not answer: open the project in the editor with Trama.` when the editor stays silent for 10 seconds, and with the reason of Manager mode when Team is not available. A team with no one prints `No one in this project's team.` (`--json`: `[]`) and exits with 0.

Runs and waits for the editor; read-only.

### `history`

#### `trama history new`

`tasks` names the Tasks the entry tells, by ID or short number: each must be Done and not closed without changes. The file always carries the IDs. Refused, writing nothing, with every problem listed, when the title is empty or on several lines, the summary is empty, on several lines or longer than 280 characters, no Task is named, or a Task does not exist, is not Done or was closed without changes. Prints the new entry's ID.

Input (`--input`):

- `title`: `string`, required. One line.
- `summary`: `string`, required. One line of at most 280 characters, inline Markdown only.
- `body`: `string`, optional. The full text, in Markdown. Default empty.
- `tasks`: `string[]`, required. The Tasks the entry names, at least one.

```sh
trama history new --input - <<'JSON'
{"title":"Order cancellation","summary":"Customers can cancel a paid order.","body":"Longer text.","tasks":["a1b2c3d4"]}
JSON
```

Output (`--json`):

- id: string, required
- title: string, required
- file: string, required

Runs at once; writes in `.trama/`.

#### `trama history edit <id>`

`title`, `summary` and `body` replace their field. `tasks` adds Tasks to those the entry already names, by ID or short number, and never removes one. Refused, leaving the file as it was, when a new value or a new Task is not valid. The entry's date is the instant of the command, even when nothing changes.

- `<id>`: The entry: its ID.

Input (`--input`):

- `title`: `string`, optional. The new title, one line.
- `summary`: `string`, optional. The new summary, one line of at most 280 characters.
- `body`: `string`, optional. The new full text, in Markdown.
- `tasks`: `string[]`, optional. Tasks to add to those the entry names: Done and not closed without changes.

```sh
trama history edit a1b2c3d4 --input - <<'JSON'
{"summary":"Customers can cancel a paid order and get a refund.","tasks":["a1b2c3d4"]}
JSON
```

Output (`--json`):

- id: string, required
- title: string, required
- file: string, required

Runs at once; writes in `.trama/`.

#### `trama history list`

Each entry with its identity, date and title. Read-only.

Runs at once; read-only.

#### `trama history show <id>`

The title, dates, summary and text of the entry, and the Tasks it names with their state. Read-only.

- `<id>`: The entry: its ID.

Output (`--json`):

- id: string, required
- title: string, required
- created: string, required
- updated: string, required
- summary: string, required
- body: string, required
- file: string, required
- tasks: { id: string, number: string, exists: boolean, cleared: boolean, title: string | null, column: "todo" | "doing" | "done" | null, unchanged: string | null, copy: { title: string, proposal: string | null, tag: string | null, finished: string | null, refs: string[] } | null }[], required

Runs at once; read-only.

### `announcement`

#### `trama announcement new`

Announce a card (`proposal`, `task` or `drift`) as soon as you know you will create it, so the Board shows a ghost of it; pass the printed ID as `announcement` when you create the card. Announce a final check or a scan with `kind: check` and its `phase` (`verifying` or `scanning`): it stays in In progress until `trama announcement move <id> delivered` or `failed`. `phase` is required for a check and refused for the other kinds. With `phase: scanning`, a scan check Trama announced at launch for this terminal and still waiting is taken instead of creating one. The announcement belongs to the agent terminal (`TRAMA_TERMINAL`); only an agent started by Trama can announce, so without the variable the command is refused with an error and writes nothing. Prints the announcement's ID. Never wait for the ghost to show.

Input (`--input`):

- `kind`: `"proposal" | "task" | "drift" | "check"`, required. What is announced: `proposal`, `task`, `drift` or `check`.
- `title`: `string not empty`, required. A short title: at most five words for a card; for a check, what the work is.
- `phase`: `"verifying" | "scanning"`, optional. Only for a check: `verifying` or `scanning`.

```sh
trama announcement new --input - <<'JSON'
{"kind":"check","title":"Final check after all Tasks","phase":"verifying"}
JSON
```

Output (`--json`):

- id: string, required
- kind: "proposal" | "task" | "drift" | "check", required
- title: string, required
- phase: "verifying" | "scanning", optional

Runs at once; writes in `.trama/`, counts as the agent's activity.

#### `trama announcement edit [<id>]`

Declares `note`, one short line about what you are doing and why, so the developer reads it on the ghost. With the announcement's ID the note goes only to that announcement, of any kind, comparisons included; without an ID it goes to every announcement still waiting that belongs to your terminal (`TRAMA_TERMINAL`), comparisons excepted; an agent without a terminal has no announcements. Line breaks become spaces and the ends are trimmed; an empty note is a usage error and saves nothing. A note over 120 characters is saved cut to the first 119 followed by `…`, and the output says so. An announcement keeps its last 6 notes, each with the instant it arrived; a note equal to the previous one only renews that instant. A note changes nothing else (phase, title, delivery or withdrawal) and does not count as the agent's activity. With no announcement to go to the command says so and exits with 0; an unknown ID is an error and saves nothing.

- `<id>` (optional): The announcement to write the note on; without it, every announcement waiting for your terminal except comparisons.

Input (`--input`):

- `note`: `string`, required. One short line: what you are doing and why, for the developer. Cut to 120 characters.

```sh
trama announcement edit a1b2c3 --input - <<'JSON'
{"note":"Compares the order Machine with its code before the Tasks run."}
JSON
```

Output (`--json`):

- announcements: string[], required. The IDs of the announcements the note went to.
- truncated: boolean, required. True when the note was cut.

Runs at once; writes in `.trama/`.

#### `trama announcement move <id> <state>`

`scanning` moves a check from Verifying to Scanning, and `history` from Verifying or Scanning to History, when the final run writes its History; a check only moves forward, so a backward move is refused and changes nothing, and a check already in that phase is left as it is and the command says so. `delivered` delivers a finished check and removes its ghost; `failed` does exactly the same, and only the phase timings tell the two outcomes apart. An ID that is unknown, already delivered or withdrawn, or not a check is not an error: the command says no check was found and changes nothing. Nothing tells whether a check is the final one of a run, so the command does not check that.

- `<id>`: The announcement of the check.
- `<state>`: Where the check goes. One of `scanning`, `history`, `delivered`, `failed`.

Output (`--json`):

`scanning` or `history`:

- id: string, required
- outcome: "changed" | "unchanged" | "missing", required

`delivered` or `failed`:

- id: string, required
- found: boolean, required
- outcome: "done" | "failed", optional

Runs at once; writes in `.trama/`, counts as the agent's activity.

### `comparison`

#### `trama comparison new <machine>`

Announces the comparison and prints its ID first, then the references to compare (`refs` limits them to those of the Machine; without it, the whole Machine), their States, Events and Transitions, the Requirements that apply, the analysis, the open Tasks and Drifts on the same thing, the resolved or dismissed Drifts on the same references and, when published issues have references there, the section `## Published issues` with the instruction for the Drifts on those references. Keep the ID: `comparison move` takes it. Without `TRAMA_TERMINAL` the briefing is the same but no announcement, and so no ghost, is made: the comparison data stay in a file of their own that `comparison move <id> delivered` deletes.

- `<machine>`: The Machine to compare.

Input (`--input`):

- `refs`: `string not empty[]`, optional. Only these references, which must be of the Machine.

```sh
trama comparison new order --input - <<'JSON'
{"refs":["order/Paid"]}
JSON
```

Output (`--json`):

- announcement: string, required
- machine: string, required
- scope: string[], required
- warnings: object[], required
- openTasks: { id: string, number: string | null, title: string, column: string }[], required
- openDrifts: { id: string, number: string | null, title: string, refs: string[] }[], required
- closedDrifts: { id: string, number: string | null, title: string, resolution: string | null, note: string | null }[], required
- publishedIssues: { number: number, title: string, status: string, refs: string[] }[], required. The published issues, not `Not planned`, whose references fall in the comparison, with where each was at the last read of GitHub (`Open` as published without one).

Runs at once; writes in `.trama/`, counts as the agent's activity.

#### `trama comparison move <id> <state>`

The input is what the comparison found: an optional `design` (the Proposal every Task is linked to), `tasks` (each `title`, `refs`, `body`, optional `technical`) and `drifts` (each `title`, `refs`, `happens`, `should`, `where`, `options` as a list of `{title, text}`, and optional `previous`, `proposal`, `merge`: `true` for a Drift from a merge, as in `drift new`); both lists may be empty. Every card follows the rules of `task new` and `drift new`. All cards are checked before any is written: if one is not valid nothing is written and every problem is listed per card. Otherwise the cards are created in order, the comparison is delivered and it is recorded as compared on this code.

- `<id>`: The comparison: the ID printed by `comparison new`.
- `<state>`: Where the comparison goes. One of `delivered`.

Input (`--input`):

- `design`: `string`, optional. The Proposal every Task is linked to.
- `tasks`: `any[]`, required. The Tasks found; may be empty.
- `drifts`: `any[]`, required. The Drifts found; may be empty.

```sh
trama comparison move a1b2c3d4 delivered --input - <<'JSON'
{"tasks":[{"title":"Order cancel","refs":["order/Paid"],"body":"Cancel a paid order."}],"drifts":[]}
JSON
```

Output (`--json`):

- comparison: string, required
- delivered: boolean, required
- tasks: { id: string, number: string | null, title: string }[], required
- drifts: { id: string, number: string | null, title: string, previous: string | null }[], required

Runs at once; writes in `.trama/`, counts as the agent's activity, sends messages to the editor.

### `question`

#### `trama question new`

Reads one complete question round from `--input -` (or the JSON text), shows it in the editor's Trama panel, waits for the developer and prints the result as JSON, always, also when it fails. The developer sees only the round (each question, its context, its options and their own answers), never the agent's conversation, so every question with its context and options must be understandable on its own, and the texts use no first person (write "Trama" or "the agent", never "I" or "we"). The whole round is checked before any question is shown. Every question has 2 or more options, an in-range recommendation and an explicit `multi`. Completed and initially unavailable results exit 0; question failures and cancellation exit 1; a malformed round exits 2. `unavailable` means the editor is not reachable, or the command ran outside a terminal or conversation launched by Trama: stop and tell the developer.

Input (`--input`):

- `questions`: `{ id: string, question: string, context?: string, options: { label: string, description: string, details?: string }[] (at least 2), recommended: integer ≥ 0, multi: boolean }[] (at least 1)`, required. The questions of the round, asked together.

```sh
trama question new --input - <<'JSON'
{"questions":[{"id":"route","question":"Choose the route","options":[{"label":"Fast","description":"Fewer checks"},{"label":"Safe","description":"More checks"}],"recommended":1,"multi":false}]}
JSON
```

Output (`--json`):

Completed:

- status: "answered", required
- answers: object, required. By question ID.

The editor is not available:

- status: "unavailable", required
- reason: string, required

Failed:

- error: { code: "invalid-input" | "editor-interrupted" | "cancelled" | "question-failed", message: string }, required

Runs and waits for the editor; read-only.

### `advisor`

#### `trama advisor show`

Says whether this session belongs to a Run launched by Trama with the Advisor Scanner on: it reads only `TRAMA_ADVISOR_SCANNER`, which is `1` in that Run's terminal and absent elsewhere. Any other value counts as off. Trama's advisors ask it before anything else and stay silent when the answer is no. It does not read `.trama/`, does not contact the editor, does not count as the agent's activity and exits with 0 either way. Read-only.

Output (`--json`):

- advisorScanner: boolean, required. True when the Advisor Scanner is on for this session.

Runs at once; read-only.

### `project`

#### `trama project new`

Creates `.trama/` in `--root` (or the current directory; it never walks up) with `model/system.md`, `model/actors/`, `requirements/` with the five starting Areas, `proposals/`, `tasks/` and `drifts/`, and installs the agent skills, embedded in the binary, and omp's sub-agent definitions. It refuses, creating nothing, when `.trama/` already exists or when a file to install exists with different content, unless `force` is true; identical files are not a conflict. With `solo` (`folders` or `files`) it first writes Solo mode (`.trama/solo/mode.json` and the block in `.git/info/exclude`, so no file of Trama is ever visible to git) and creates nothing at all, failing with `Solo mode needs a git repository.`, when the folder is not in a git repository or the write fails. With `manager: true` it writes Manager mode (`.trama/manager/mode.json`) after every file of the project; when `origin` is not a repository on GitHub, or the write fails, the project stays, Manager mode stays off and the output says why (`managerError`).

Input (`--input`):

- `skillsDir`: `string not empty`, optional. The folder of the agent skills, relative to the project root. Default `.agents/skills`.
- `force`: `boolean`, optional. Overwrite skill files, sub-agent definitions and advisor instructions that differ from Trama's. Default false.
- `solo`: `"off" | "folders" | "files"`, optional. Solo mode of this working copy: `off`, `folders` (keeps `.trama/`, the skills folder and `.omp/` out of git) or `files` (keeps only the files Trama writes there). The block goes in `.git/info/exclude`, never committed. Needs a git repository.
- `manager`: `boolean`, optional. Manager mode of this working copy: `true` records it in `.trama/manager/mode.json` (local, never committed; refused when `origin` is not a repository on GitHub), `false` deletes that file. Never deletes the people or the files of Team's work.

```sh
trama project new --input - <<'JSON'
{"skillsDir":".agents/skills"}
JSON
```

Output (`--json`):

- path: string, required
- skillsDir: string, required
- skills: string[], required. The skill files installed.
- agents: string[], required. The omp definitions written.
- areas: string[], required. The Requirement Areas created.
- solo: "off" | "folders" | "files", required. Solo mode now.
- tracked: string[], required. Trama's files git already tracks under the paths Solo mode keeps out of git, relative to the project root; their changes still enter commits. Empty when Solo mode is off.
- manager: boolean, required. Manager mode as recorded.
- managerRepository: string | null, required. The GitHub repository `<owner>/<repo>` of `origin`, or null when origin is not on GitHub.
- managerError: string | null, required. Why Manager mode was asked for and not written, or null; the project is created either way.

Runs at once; writes in `.trama/`.

#### `trama project edit`

Writes this version's agent skills into the project's skill folder, replacing older or edited copies, and lists the files it changed; deletes the retired `trama-fix` skill; adds the starting Requirement Areas when the project has none; moves single-file Areas into Area folders; regenerates the `trama-req-*` skills; and rewrites omp's sub-agent definition and the advisor instructions. With `solo` alone it changes only Solo mode and installs nothing: it records the choice in `.trama/solo/mode.json` and rewrites the block in `.git/info/exclude` (`off` removes both). With `solo` and `skillsDir` the block covers that skills folder; without `skillsDir` it covers `.agents/skills`. `solo` other than `off` needs a git repository, otherwise it fails with `Solo mode needs a git repository.` and writes nothing. The result carries `solo` and `tracked`, Trama's files git already tracks, whose changes still enter commits. With Solo mode on, the skills update also writes the block again when it is missing or different. With `manager` (alone, or with `solo`, without `skillsDir`) it changes only Manager mode and installs nothing: `true` writes `.trama/manager/mode.json`, and fails with `Manager Mode needs a repository on GitHub (the origin remote).` writing nothing when `origin` is not a repository on GitHub; `false` deletes that file and nothing else. The result carries `manager` and `managerRepository`.

Input (`--input`):

- `skillsDir`: `string not empty`, optional. The folder of the agent skills, relative to the project root. Default `.agents/skills`.
- `solo`: `"off" | "folders" | "files"`, optional. Solo mode of this working copy: `off`, `folders` (keeps `.trama/`, the skills folder and `.omp/` out of git) or `files` (keeps only the files Trama writes there). The block goes in `.git/info/exclude`, never committed. Needs a git repository.
- `manager`: `boolean`, optional. Manager mode of this working copy: `true` records it in `.trama/manager/mode.json` (local, never committed; refused when `origin` is not a repository on GitHub), `false` deletes that file. Never deletes the people or the files of Team's work.

```sh
trama project edit --input - <<'JSON'
{"skillsDir":".agents/skills"}
JSON
```

Output (`--json`):

- skillsDir: string, optional. The skills folder; absent when only `solo` was given.
- changed: string[], optional. The skill files this run wrote.
- removed: string[], optional. The retired skill folders deleted.
- removedAgents: string[], optional
- agents: string[], optional
- agentsChanged: string[], optional. The omp definitions and advisor instructions this run actually wrote.
- areas: string[], optional. The starting Areas created.
- conversion: object, optional. The Areas moved to the folder format and those left as they were.
- generated: object, optional. The regeneration of the Requirement skills.
- solo: "off" | "folders" | "files", required. Solo mode now.
- tracked: string[], required. Trama's files git already tracks under the paths Solo mode keeps out of git, relative to the project root; their changes still enter commits. Empty when Solo mode is off.
- manager: boolean, required. Manager mode as recorded.
- managerRepository: string | null, required. The GitHub repository `<owner>/<repo>` of `origin`, or null when origin is not on GitHub.

Runs at once; writes in `.trama/`.

#### `trama project show`

The Board as text. Draft Proposals are marked `(draft)` in **In writing**, apart from **To decide**, which shows handed-over Proposals and open Drifts; an open resolution Proposal and the Drifts it lists are one card. Each Task is listed in its column with the Proposal it comes from. Read-only.

Output (`--json`):

- inWriting: object[], required. Draft Proposals.
- toDecide: { proposals: object[], drifts: object[] }, required
- todo: object[], required
- doing: object[], required
- done: object[], required
- solo: "off" | "folders" | "files", required. Solo mode of this working copy: `off`, `folders` or `files`.
- manager: boolean, required. Manager mode as recorded.
- managerRepository: string | null, required. The GitHub repository `<owner>/<repo>` of `origin`, or null when origin is not on GitHub.

Runs at once; read-only.

### `timing`

#### `trama timing list`

Phases, machine comparisons, Tasks and queue waits of the newest jobs, newest first. Read-only.

Input (`--input`):

- `last`: `integer ≥ 1`, optional. How many jobs. Default 5.

```sh
trama timing list --input - <<'JSON'
{"last":3}
JSON
```

Output (`--json`):

- jobs: object[], required

Runs at once; read-only.

#### `trama timing new`

Records in the timings of the job a choice of the parallel run: `release` (Tasks started together although the free-places rule keeps them apart), `order` (the first Task waits for the others to be Done) or `conflict` (the sub-agent of the first Task stopped because it clashed with the others). `tasks` names at least two existing Tasks; `reason` is one line. Writes only from a Trama terminal: elsewhere it writes nothing, says so and exits with 0.

Input (`--input`):

- `kind`: `"release" | "order" | "conflict"`, required. `release`, `order` or `conflict`.
- `tasks`: `string not empty[] (at least 2)`, required. At least two Tasks: IDs, unique prefixes or short numbers; the first is the one the choice is about.
- `reason`: `string not empty`, required. Why, in one line.

```sh
trama timing new --input - <<'JSON'
{"kind":"release","tasks":["a1b2c3d4","e5f6g7h8"],"reason":"They touch different files."}
JSON
```

Output (`--json`):

- recorded: boolean, required
- kind: "release" | "order" | "conflict", required
- tasks: string[], required
- reason: string, required

Runs at once; writes in `.trama/`.

### `hook`

#### `trama hook idle`

Run by the hook Trama makes omp load when its main session settles or ends, not by people. It takes the terminal from `TRAMA_TERMINAL`, finds the editor of the project and tells it that the agent of that terminal is idle: the editor then ends the run, releases the Tasks the terminal had taken and withdraws its announcements. It waits at most one second, prints nothing and exits with 0 also without an editor, a project or `TRAMA_TERMINAL`.

Runs as an agent hook; read-only.

#### `trama hook start <pid>`

Run by the hook Trama makes omp load, once, at the first start of its main session, not by people. It takes the terminal from `TRAMA_TERMINAL`, finds the editor of the project and tells it the process of the agent of that terminal, so the run check can watch it. It starts no process and does not read the start time of the process: the editor does that afterwards, in the background, so the command never waits for it. It is not a sign of life and is never repeated. It waits at most one second, prints nothing and exits with 0 also without an editor, a project or `TRAMA_TERMINAL`, or with a process that is not a positive integer (then it sends nothing); only a wrong use exits with 2.

- `<pid>`: The process of the agent (omp), a positive integer.

Runs as an agent hook; read-only.

<!-- commands:end -->

## Project

`trama project new` creates `.trama/` in `--root` (or the current directory) with `model/system.md`, `model/actors/`, `requirements/` with five Areas (`ui`, `tech`, `quality`, `data`, `rules`), each a folder holding only its `area.md` and no fragment, `proposals/`, `tasks/` and `drifts/`, and installs the agent skills (embedded in the binary) into `skillsDir`, default `.agents/skills`. It never walks up. It fails, creating nothing, if `.trama/` already exists or if any skill file to install already exists with different content; `force: true` overwrites those. Identical files are not a conflict.

`trama project edit` writes this version's agent skills into an existing project's `skillsDir` (default `.agents/skills`), replacing older or edited copies, and lists the files it changed. It deletes the folder of the retired `trama-fix` skill, whatever it holds, from `.agents/skills` and `skillsDir`, and lists the folders it deleted. It creates the five starting Areas if the project has no `requirements/` folder, and converts every Area still written as one file, `requirements/<area>.md`, into `requirements/<area>/area.md` (description, title, introduction) and `requirements/<area>/main.md` (the same description and title with every section), deleting the old file; an Area whose folder already exists is left alone. It reports the Areas converted and those left, with why. Then it regenerates the `trama-req-*` skills and reports their mode (one skill per fragment, or one index skill per Area), the budget used out of 4,000 characters and any switch. The extension runs it from **Trama: Update Agent Skills**.

`project new` and `project edit` also write the definition of the scan's analysis sub-agent into the project's `.omp/agents/trama-analysis.md` with `model: "@slow"`. It names an omp role, never a concrete model, so it can be versioned; the editor passes the developer's `trama.scan` model with `--slow` when it is set.

`project new` and `project edit` also write the definition of the Task implementer sub-agent into `.omp/agents/trama-implementer.md`, with the description `Implements one Trama Task and reports how it ended.` and no `model` line: omp then runs it on the model of the main process (the `--model` of the run), so the implementer never needs a model of its own. Like `trama-analysis.md`, it is a conflict: `project new` refuses a different copy unless `force` is true, and `project edit` and the check when Trama opens replace it without asking, writing only when the content differs.

`project edit` also reports, in `agentsChanged` of its `--json`, the omp definitions and advisor instructions it actually wrote (`agents` lists all of them, written or not). The extension's check when Trama opens runs the same steps on the same files, but writes a file only when its content differs and neither creates the starting Areas nor converts single-file Areas.

`project new` and `project edit` also write `.omp/WATCHDOG.yml`, the advisor instructions of the Advisor Scanner: a shared `instructions` text and two `advisors` entries (`Trama turn reviewer` and `Trama final reviewer`), each with the tools `read`, `grep`, `glob`, `bash` and no model. It is written whatever `trama.agent` is and with the Advisor Scanner off, and it is handled like `trama-analysis.md`: `project new` lists it among the conflicting files and refuses to overwrite a different copy unless `force` is true, and `project edit` replaces a different copy and says so. Consequence: an omp session started by hand in the project with the advisor on does not create omp's default advisor, because the file lists advisors, and Trama's two advisors run only `trama advisor show` and then stay silent: they know a Run from the `TRAMA_ADVISOR_SCANNER` sign that Trama puts in the terminal of every Run launched with the Advisor Scanner on, which also reaches its sub-agents.

The extension initialises and updates the skills with these two commands, passing the folder it is configured with as `skillsDir` and `force: true` after the developer confirms.

`trama ids rewrite` no longer exists: a card still named `NNNN-<slug>` stays readable, but it is no longer converted to a permanent identity.

## Exploring

`trama model show`, `trama model list` and `trama model check` are read-only and never read the code.

- `model show` without a reference: the System description; Actors with their Events; Features with their Machines.
- A Feature: its description; Machines, each with the first line of its description; the Events that reach Machines of this Feature, as `owner.EVENT → receiving Machine`. An owner may be an Actor or a Machine of another Feature. Actors are only ever owners: what the System does in response to a Machine's Event toward the outside world is prose in that Event's description, never a graph edge.
- A Machine: its description; the State tree with markers; every Transition; owned Events and who receives them. An Actor: its description and its Events with who receives them.
- A State (`machine/State`): description; parent and sub-States; outgoing Transitions, including those inherited from parents; incoming Transitions. With `{ "to": "<State>", "max": N }` it prints instead the simple paths from the State to another State of the same Machine, shortest first, default `max` 20: a State with sub-States stands for any of its sub-States, parents pass their Transitions down, and entering a State with sub-States enters its initial sub-State.
- A Transition (`machine/State/owner.EVENT`): where it leads and its prose. An Event (`owner.EVENT`): its owner and description and every Transition that reacts to it (`machine/State → Target: prose`).
- Every view of a Model element ends with the Requirements attached to the element or to what contains it, each with the skill to load. `requirements` lists every Area with its description, sections and the skills to load; `requirements/<area>` shows the Area in full and `requirements/<area>#<section>` (for example `requirements/ui#order/Paid`) one section. The skills named are those the current mode generates: the fragment's skill, or the Area's index skill.
- `model list` is a case-insensitive match over the names and prose of the whole Model and its Requirements; each hit with its reference.
- `model check` reports the errors of the Model and its Requirements and, apart, the warnings: States that cannot be reached, non-final dead ends, Events nobody receives and, for the whole System, every Requirement fragment larger than 12 KB, with path and size. With a Machine, the warnings of the Model are only its own. Only errors change the exit code.

## Proposals

| Command | Effect |
|---|---|
| `proposal new` with `{ title, body?, kind?, label?, requires?, announcement?, request? }` | Creates `proposals/<id>-<slug>/proposal.md` with `status: draft` and `created`, the UTC creation instant in ISO 8601. The id is eight random lowercase letters and digits, unique among Proposals; a Task or a Drift may use the same string. A card still named `NNNN-<slug>` (at least four digits) stays addressable by that number and has no `created`. An id argument may be the whole identity, a prefix that only one card of that kind has, or the whole file or folder name; digits alone cite only a numbered card. `kind` is `change` (default), `import` (ADR 0008), `resolution` or `setup`: one value, so a Proposal is of one kind only. `requires` writes it on top of those draft, open or approved Proposals (refused for a rejected or discarded one). `request` binds it to the written design request `.trama/requests/<id>.md` it comes from, recorded as `request`; when that file does not exist the Proposal is created unbound and the output says the request was not found. `label` is the short label, 1 to 30 characters on one line, trimmed, refused before anything is created when invalid; a Draft with Tasks must have one before the hand-over accepts it, and open Proposals written before the label existed are not blocked. It shows as `Label:` under the title of `proposal show`, and as `label` in its `--json`. A Proposal is never an automatic resolution: `automatic` and `job` are unknown fields, a usage error, and an old file with `automatic: true` is read without error, the field ignored. |
| `proposal new` with `kind: "resolution"` and `prepared` | Creates a resolution Proposal marked `prepared: true`: it was born from the answer to a Drift's prepared question (Async Drift Resolver), written by Trama or by the agent launched with the answer. `prepared` is valid only with `kind: "resolution"`: any other combination is a usage error that creates nothing, and validation refuses it on any other kind. It is written at creation and stays as history after the decision. It changes neither approval nor rejection; it only changes who it stops: a prepared resolution awaiting a decision does not stop Resolve (`Proposal <id> resolving Drifts awaits a decision` names the oldest resolution in writing or open without it), so several can wait together. `proposal list`, `proposal show`, `project show`, the Snapshot and their `--json` carry it as `prepared`. |
| `proposal new` with `kind: "setup"` | The first Proposal of an empty Model; a usage error, creating nothing, when the Model has a Feature or an Actor. |
| `proposal edit <id>` with `{ label?, rebase?, edit?, delete?, drifts?, removeDrifts?, images?, removeImages? }` | Every use returns an open Proposal to Draft, with a notice, so the agent registers before every change; without input it only does that, touching no file. `rebase: true` records again the starting version of each file the Proposal holds, on the Model as it is now, so a stale Proposal is no longer stale; the Draft is marked `refining` until it is handed over again. Only an ordinary change Proposal not attached to an open Drift, and a Draft or open one, can be rebased; any other is refused, changing nothing. `edit` lists paths: each is a Model file relative to `.trama/model/`, `specs.yaml`, a Requirement file `requirements/<area>/area.md` or `requirements/<area>/<fragment>.md`, new or existing, or a Task `tasks/<slug>.md`. `requirements/<area>.md` and deeper paths are refused, saying why. For each it copies the current file into the Proposal and records its hash in `base`, or creates an empty file marked `new` if it does not exist, and prints the path to write (one per line; `--json`: `paths`, a list of `{ path, edit }`). Re-registering keeps the original hash and contents. `delete` lists paths to mark for deletion: each is added to `delete` and its hash recorded in `base`. `label` writes or changes the short label, with the rules of `proposal new`. `drifts` records or replaces, in a resolution, the decision on open Drifts (`{ drift, decision, option?, note? }`, `decision` being `proposal`, `dismissed` or `fix-code`; `option` and `note` only with `fix-code`), and `removeDrifts` takes Drifts out of the list. All of it runs under the Proposal's lock, in that order. `images` is a list of `{ task, path }` that ties images to the Tasks of the Proposal: `task` is the full name `tasks/<identity>-<slug>.md` or the identity of a Task of the Proposal, and `path` a local `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` or `.svg` file, absolute or relative to the project root. `removeImages` is a list of `{ task, name }` that takes images away. The file is copied into `.trama/task-images/<Task identity>/`, which is not versioned, and the change returns an open Proposal to Draft. |
| `proposal move <id> open` | The only hand-over command: sets a Draft to `status: open` after the checks of the Model and Requirements with the Proposal applied, unregistered files, the Drift list of a resolution, including each `fix-code` Drift whose code can no longer be fixed. A refusal leaves it Draft and names every problem. A success prints, after its outcome, the warnings of the validation (none when there are none) and then the same text as `proposal show <id>`; with `--json` that text is the `show` field. Staleness or waiting for required approvals do not prevent the hand-over. A `setup` Proposal handed over while the Model has no Feature and no Actor is approved at once, as `approved` would do, and prints the same text after the outcome of that approval; when that approval refuses it (stale, requiring Proposals not approved yet, a Task that cannot be created), it stays Open and the output says why. `skillsDir` as in `approved`. When the Proposal is bound to a written design request, a successful hand-over deletes `.trama/requests/<id>.md` and says so; a file already gone does not make it fail, and a refused hand-over deletes nothing. |
| `proposal move <id> discarded` | Discards only a Draft, setting `status: discarded`; no feedback, no changes to dependents. A Draft attached to an open Drift is refused, changing nothing, as `approved` and `rejected` refuse it: the message names the Drift, and the Drift is decided with `drift move` (fixing its code sets the Draft aside). The agent may run it only when the developer explicitly asks in the conversation; otherwise it asks the developer to decide. |
| `proposal show <id>` | Description; stale or not; for a Draft rebased and not handed over yet, `Refining: rebased, not handed over yet` (`refining` in `--json`); for each touched file, what is added, removed or changed, and for a Requirement file its Area and fragment (or `area.md`); for an ordinary Proposal not yet approved: its **`## Tasks`** (identity, title, `(technical)`, references), its **`## Created on approval`** (each `Remove code of <ref>` with the reference it points at), and its **`## Scope`**, computed now: one reference per line in the form `refs` takes (`order/Paid`, `requirements/ui#order/Paid`), each with why it is there (`changed`, `removed, its container` or `leads into a change`) and what covers it (a Task's identity, `already present`, `removal`, or `not covered`). With `--json`: `tasks`, `removals` and `scope` (a list of `{ ref, reason, coveredBy }`). Once approved, an older Proposal shows its saved **`## Scan scope`** (`--json`, `scanScope`), as before. It makes the same checks as the hand-over. In `--json`, each Task of `tasks` carries its images as `images`, a list of `{ name, path }` with absolute paths. |
| `proposal list` with `{ all? }` | Draft and open Proposals (all statuses with `all`), marking drafts `(draft)`, refining ones `(refining)`, imports, stale ones and required Proposals not approved yet. |
| `proposal move <id> approved` with `{ skillsDir? }` | Open Proposals only. Refuses Drafts as still being written. Fails if a required Proposal is not approved, or the Proposal is stale or invalid; otherwise applies it in this folder, sets `status: approved` and regenerates the `trama-req-*` skills in `.agents/skills` and the `skillsDir` folder (relative to the project root) that holds `trama-design`. The extension passes its `trama.skillsDir` setting; from a terminal, pass the folder you configured. A Drift's attached Proposal is accepted with `drift move <id> proposal-accepted`, which also applies it in this folder. An agent may approve or reject a Proposal only when the developer explicitly asks for that decision in the conversation; otherwise it asks the developer to decide. |
| `proposal move <id> rejected` with `{ feedback? }` | Open Proposals only. Sets `status: rejected`. With non-blank feedback it is appended under `## Feedback`; without it, or with blank text, nothing is appended. Drafts are refused as still being written. An agent may reject a Proposal only when the developer explicitly asks for that decision in the conversation; otherwise it asks the developer to decide. |

These are decisions for the developer: `proposal move … approved`, `proposal move … rejected`, `proposal move … discarded` and `drift move`. An agent may run any of them only when the developer explicitly asks for that decision in the conversation; otherwise it stops and asks the developer to decide. Requests to design, scan, implement Tasks or prepare a Drift resolution do not authorize the decision. Trama applies the same argument, state, reference, dependency, validity and conflict checks regardless of who runs the command; `TRAMA_AGENT` does not block it.

## Tasks

| Command | Effect |
|---|---|
| `task new` with `{ title, refs?, technical?, drift?, proposal?, body?, announcement? }` | Creates a Task in `todo`. A Task references at least one Model element and may add Requirements (`requirements/ui#order/Paid`); a Technical Task may reference only Requirements. `proposal` links the Task to the Proposal (the design) it comes from; the Proposal must exist, in any status; a Technical Task keeps no link, because it is never part of a design. The Scan files its Tasks with it. Fails if a reference or the Proposal does not resolve. |
| `task list` with `{ column?, runnable?, max?, tasks?, proposals?, notProposals?, scope?, heldBack?, groups? }` | Without `runnable`, the Tasks grouped by column, flat, filtered by `column` and `tasks` (each must exist): every Task is listed, with its Proposal ID when it has one, so the agent can always find the Tasks in `todo`. A Task the agent has taken is marked `(agent working)`, here and in `task show` and `project show`. A blocked Task is marked `(blocked by Drift <id>)` once for each Drift that blocks it, or `(waiting for Task <id>)` when it waits for the Task that fixes its Drift, in the same places. With `runnable: true` it prints the next runnable Task, `Next Task: <id> <title>`, and moves nothing: `tasks` restricts consideration to that set (deduplicated, each must exist); `proposals` keeps the Tasks of any of the named Proposals; `notProposals` keeps every other Task, the ones with no Proposal included; the two never go together and a Proposal that does not exist is refused; `tasks` intersects with them. With `max` (an integer of 1 or more) it prints instead the batch of runnable Tasks, at most `max`, one per line, with the same filters; duplicates are removed; Tasks retain creation order, blocking and concern-grouping rules, and a Task that concerns a Task In progress the agent has taken is left out. A batch asked by an agent records the queue wait. With `groups: true` (with `runnable`; not with `scope` or `heldBack`) it prints the runnable Tasks in groups for a parallel run: each `## Group <n>` lists its Tasks, one per line as `- <number, or identity when it has none> <title>`, then `Shared:` with the references and the project files that tie them together. Tasks are linked when they concern the same thing (see above) or both name a project file that exists, given in backticks relative to the project root in the body; the links are followed transitively, the largest group comes first, then the one with the oldest Task, and `max` counts groups. Blocked Tasks take no part; a runnable Task that concerns a Task the agent has taken is held back, as with `heldBack`, and listed under `## Held back` when there is one (`--json`: `groups`, a list of `{ tasks: [{ id, number, title }], refs, files }`, and `heldBack`). With no runnable Task it prints `No Task is runnable.`. With `scope: true` it adds the scope of a scan: with `runnable`, the exact references of the runnable Tasks in To do, each once, with a Requirement section counted as its element and no added Transitions, `General` sections or Areas; a reference that a recorded comparison already covers, with the same code and the same text (see Comparisons), is printed under `## Already compared` and is not compared again (`--json` gives `{ refs: [{ ref }], alreadyCompared: [{ ref }], tasks: [{ id, number, title }] }`); without `runnable`, the union of the Model references named by the Tasks in `tasks` (required then), plus Transitions that enter named States or react to named Events, as `## Scan scope` with `changed` and `leads into a change` (`--json` prints a list of `{ ref, reason }`; an empty scope prints `_Nothing to scan._`). With `runnable` and `heldBack: true` it adds `## Held back` (`--json`: `heldBack`, a list of `{ id, number, title, overlaps }`): the runnable Tasks the free-places rule left out because they concern the same thing as a chosen Task or a Task the agent has taken, each with the Tasks it overlaps (`overlaps`, as `{ id, number }`); blocked Tasks and Tasks left out only for lack of places are not there. It takes the same filters, moves nothing and is a usage error without `runnable`. |
| `task show <id>` | The Task, with the blocked and `(agent working)` marks, a line `Blocked by Drift <id>: <title>` or `Waiting for Task <id>: <title>` for each blocker, and everything needed to carry the Task out, with no pointers to other commands or to skills. A Machine reference includes the State tree and the Events with who receives them, the same facts as `model show <machine>`. A State reference includes the outgoing Transitions, including those inherited from the States that contain it, marked as inherited. An Event reference includes the Transitions that react to it, the same facts as `model show <owner.EVENT>`. A reference to a whole Area includes the text of every section. Then the Requirements attached to the referenced elements (or to what contains them), and every General section that has text, written in full. An `Images` block lists the images tied to the Task, each with its name and absolute path; `--json` carries them as `images`, a list of `{ name, path }`. |
| `task move <id> todo\|doing\|done` | Moves the Task to another column. Run as the agent (`TRAMA_AGENT` set), a move to `doing` takes the Task for the agent and a move to `todo` or `done` clears that. Run without it, a move to `doing` of a Task the agent has taken takes it back: the mark goes and the Task stays in `doing`, the developer's; any other move of such a Task is refused, and the refusal points to `trama task move <id> doing`. A move to `doing` by the agent is refused, and changes nothing, when the Task is blocked (also when it is already in `doing`): the refusal names each blocking Drift (ID and title) or the fix Task, and says the developer must decide. Moves of the developer, and of the agent to `todo` or `done`, are never refused for that reason. The Board has no way to move a Task: moving stays here. |
| `task move <id> done` with `{ unchanged }` | Closes a fix Task without changes, when the code already does what the Drift's Model or Requirement says, with a note saying what was checked. From `todo` or `doing`, by the agent or the developer, it moves the Task to `done` and its Drift to `dismissed` in the same step, and the output says the Drift is dismissed. Refused, changing nothing, when the Task fixes no Drift, its Drift is neither in code to be fixed nor already dismissed by this Task, the note is empty, the Task is already `done`, or the column is not `done`. A Task closed without changes is marked `(no changes)` in the lists, carries a `no changes` badge on the Board, and is not counted by the Scan button. Any move out of `done` forgets the note; the Drift stays dismissed. For the fix Task of differences of a unified Drift (one or several linked differences fixed together), the Task is accepted only when those differences (`task` is this Task) are still fixed in the code or already closed by it; they get `decision: dismissed`, keeping `task`, `option`, `note` and `resolvedBy`, and the unified Drift keeps its state. A Task of that kind is not deleted, from To do or with Clear, while it is the fix Task of a difference still fixed in the code, and the origin of an open difference is not deleted either. |

### Runs over several Tasks

Run all sends the agent to the skill `trama-implement` over several Tasks. The agent runs `trama task list` with `runnable` and `max: <N>`, where `<N>` is the concurrent sub-agent limit in the instruction, for up to `<N>` Tasks, and starts them as sub-agent places free up: each time a sub-agent comes back, the agent asks for the free places and starts the Tasks it names at once. The run is over when no sub-agent works and the command says that no Task is runnable. The limit is 20 when the instruction gives none. Run all considers every Task in "todo", and the editor checks the same eligibility again just before delivery; if a Task in scope was taken while the request waited, it sends nothing.

When the agent has sub-agents, it gives each Task of the batch to its own sub-agent, in the same folder, as soon as a place is free; a sub-agent that comes back, also one stopped by a Drift, frees its place at once. Without sub-agents, or with one place, it implements the Tasks itself, one after the other, asking for the next Task before each one. A sub-agent never asks for Tasks, never runs the full suite, the linter or the build, and never scans. The same holds for the other skills: `trama-scan` gives each Machine to a sub-agent, and `trama-design` explores with sub-agents before its first round of questions; at most the limit in the instruction (20 by default) at once in every case.

A run skips the Tasks that are blocked and goes on past a Drift: the Drift the agent files leaves its Task in `doing`, blocks only the Tasks that concern the same thing, and does not end the run. A Task that waits for the Task fixing its Drift becomes runnable once that Task is `done`, so the fixing Task runs first and the waiting one right after it. The agent reads each Task once, from `task show`. While writing a Task it may run the tests it added or changed for that Task and the existing tests of the behaviour that Task changes. The project's tests, linter and build run once, at the end of the run; a Task asked by name is its own run. If that check fails, the agent fixes the code and runs the check again, without reading the Model again, before the report, and the Tasks stay in the column they are in. The run's report says what the agent implemented, the Drifts it filed, and the Tasks left in `todo`, each with the Drift or the fix Task it waits for. Asked for one named Task, the agent still stops at once when the move to `doing` is refused because the Task is blocked, and takes no other Task.

After the final check passes, when the run moved at least one Task to `done` and no Task of its scope is blocked, the agent runs `trama task list` with `tasks` and `scope: true` for the Tasks it moved to `done`. If the scope is empty, there is no scan. Otherwise, the agent follows `trama-scan` on exactly those references, not the whole System or Feature, in the same run. Tasks the scan files link to the run's design (or the design of the single Task asked for), if any; the agent reports them and does not implement them.

Durante la verifica finale e lo scan mirato l'agente tiene un controllo sulla Board (`announcement new` con `kind: check`, vedi gli annunci): `trama-implement` lo annuncia in Verifying dopo l'ultimo Task, lo passa a Scanning se `trama task list` con `tasks` e `scope` restituisce un ambito non vuoto e lo chiude prima del resoconto; con ambito vuoto lo chiude dopo la verifica. `trama-scan`, fuori da una corsa, lo annuncia in Scanning e lo chiude prima del resoconto.


On the Board, Run all is unavailable while the agent has taken a Task, when no Task is in `todo`, and when every Task in `todo` is blocked. The tooltip says why, naming the Task the agent is working on, or the Drift or fix Task of the first blocked Task; when both reasons hold it gives the agent working. The host refuses the launch in the same cases.


## Issues

The issues of Team live in `.trama/issues/` as cards (`<id>-<slug>.md`): the identity, title and body the Manager approved with the handoff, and a front matter with `handoff`, `label`, `refs`, `estimate`, `assignee`, `reviewer`, `sprint`, `fields`, `dependsOn`, `created`, `state` (`publishing`, `not-published` or `published`) and, as they come, `number`, `url`, `published`, `unset`, `reason`, `updated` and `texts` (the text fingerprint of each reference when the issue was published or last updated, the one of the comparisons). They follow the rest of `.trama/`: versioned with the project, or out of git with Solo mode on. The agent publishes them on GitHub with the `trama-handoff` skill and records each with `trama issue move` right after creating it; Trama's own `gh` calls only read. Every `trama issue` command fails, writing nothing, with the reason of Manager mode (`Manager Mode is off in this working copy.` or `Manager Mode needs a repository on GitHub (the origin remote).`) when Team is not available, and none of them is developer-only.

| Command | Effect |
|---|---|
| `trama issue list` with `{ handoff?, state? }` | The issues grouped by handoff, in the order of publication (the issues an issue depends on first); `--json` is a list of `{ id, title, handoff, state, number, url, dependsOn }` |
| `trama issue show <id>` | One issue with every field and, under `## GitHub body`, the body composed for GitHub; `--json` adds `githubBody`. It also reads an issue of a handoff that is not approved yet, by its identity |
| `trama issue move <id> published` with `{ number, url }` | Records the publication: the moment (`published`) and `texts`, the fingerprint of the text of each reference now |
| `trama issue move <id> not-published` with `{ reason }` | Records that GitHub refused the issue |
| `trama issue edit <id>` with `{ unset?, updated? }` | On a published issue, records the keys of the fields GitHub did not take (`assignee`, `reviewer`, `estimate`, `sprint`, `fields.<name>`) and, with `updated: true`, a Comment update (the moment and `texts` again) |

`trama issue move <id> publishing` is refused: only Trama moves an issue there, when it asks the agent to publish (after the approval of the handoff and with **Publish again**, whose instruction is `Use the trama-handoff skill to publish the issues of handoff <handoff id>.` in a terminal named `Publish <short number>`). Moving an issue that is already `published` is refused. The execution check moves to `not-published`, with the reason `The agent stopped before publishing it.`, every `publishing` issue whose publishing agent no longer lives.

The body published on GitHub is composed by Trama, the same in the Team view's preview and on GitHub: a first line `**Reviewer:** @<handle>` when there is a reviewer, a line `**Depends on:** #<n>, …` for the issues it depends on (one that is not published yet is named by its title), an empty line, the body the agent wrote and, except with Solo mode on, a folded `<details><summary>Trama references</summary>` block listing each reference as inline code. Nothing else is added.

The body the agent wrote has two parts, in the language of the body. The part for the person comes first, with `##` headings in this order: `Context`, `Current behaviour` (left out for new behaviour), `Expected behaviour`, `Acceptance criteria` as a task list, `Out of scope` and `How to verify`. Then come a line with only `---`, the heading `## For the agent` (for example `## Per l'agente`) and the part for the agent, with `###` headings in this order: `Where in the code` (files, symbols, short excerpts and the technical context only an agent needs), `State diagram` (a `mermaid` `stateDiagram-v2`, when the issue changes States or Transitions) and, only for a junior assignee, `Suggested steps`. The part for the agent never repeats the acceptance criteria. Trama checks none of this: the format of the issue files and the hand-over checks do not change, and the Team view previews the body as plain Markdown.

To plan a handoff, the agent counts in a person's load in a sprint the estimates of their open items of the linked GitHub Project and those of the issues of the other open handoffs (open, not Draft), read with `trama proposal list` and `trama proposal show <id>`: the `## Issues` of `proposal show` prints each issue's assignee, estimate and sprint with the Manager's changes applied.

## Team

The people of the Manager's team live only in the Manager's editor (`Team` view), never in the project. `trama team show` is how the agent reads them: it asks the editor window that launched the agent, through the same endpoint and secret as `trama question new` (`TRAMA_QUESTION_ENDPOINT` and a recognised `TRAMA_TERMINAL`), with a request that carries the secret and the project's root. The window answers only for a terminal or omp Chat conversation it opened, with the members of that project's team. It has no input and never writes, and it is not a command reserved to the developer.

| Case | Output | Exit code |
|---|---|---|
| Members | Markdown with, for each member in order of name, `## <name> (@<handle>)` and the lines `Level`, `Skills`, `Capacity` (days per sprint) and `Absences` (only those that end today or later); `--json` is a list of `{ name, handle, level, skills, capacity, absences: { from, to }[] }` | 0 |
| An empty team | `No one in this project's team.` (`--json`: `[]`) | 0 |
| Without the editor's endpoint or a recognised terminal | `trama team show needs the editor: only an agent started by Trama can read the team.` | 1 |
| The editor does not answer within 10 seconds | `The editor did not answer: open the project in the editor with Trama.` | 1 |
| Team is not available | `Manager Mode is off in this working copy.` or `Manager Mode needs a repository on GitHub (the origin remote).` | 1 |

## History

A History entry (`.trama/history/<id>-<slug>.md`) summarises a macro-feature from the finished Tasks it cites. `history new` and `history edit` are refused, writing nothing, when a title or summary is empty or multi-line, the summary is over 280 characters, a cited Task does not exist, is not Done, or was closed unchanged; `history edit` never removes a cited Task. The fields go in `--input`; the Tasks are named by ID or short number, and the file always carries the IDs. The full reference of each command is in the command reference above.

| Command | Effect |
|---|---|
| `trama history new` with `{ title, summary, body?, tasks }` | Writes a new entry and prints its identity |
| `trama history edit <id>` with `{ title?, summary?, body?, tasks? }` | Replaces the given fields and adds the named Tasks to the cited ones (`tasks` adds, it never removes); always sets `updated` |
| `trama history list` | Entries, most recent first |
| `trama history show <id>` | One entry with its cited Tasks and their state |

## Drifts

A Drift whose fix Task is closed without changes (`task move <id> done` with `{"unchanged":"<note>"}`, because the code already does what the Model or Requirement says) is **dismissed** by that Task. `drift show` then says `Dismissed by Task <id> without changes`, shows the Task's note in a **Check note** block (or says the Task left Done, so the note is gone), and `drift list` with `all` marks it `(dismissed, no changes)`. `--json` carries the same as `closedUnchanged` (`task`, `note`). A dismissed Drift does not stop the same difference from being filed again. For a unified Drift with differences, closing its fix Task without changes dismisses only the differences that Task fixes; the Drift itself stays Open or Differences decided.

`drift new` with `unifies` (Unify Drifts) gathers at least two open Drifts, named by identity or short number, into one **unified Drift** made of **differences**: it decides nothing, the developer decides it difference by difference with Resolve. It requires `differences`, a list with one `{ drift, title, refs, happens, should, where, options?, proposal?, linked? }` for each Drift gathered, or for each difference of a gathered unified Drift (which gives its differences as they are), in their creation order: `drift` is the Drift the difference comes from (identity or short number), the title, refs, sides, where in the code and fix options are what that Drift said (rewritten only where a linked difference requires it), `linked` lists the `drift` of the other differences whose fix is entangled with it (symmetric), and `proposal` is the Proposal attached to the difference: the one attached to its Drift, which stays attached, or a Draft or open one that no open Drift holds; a difference with no fix options needs one. With `unifies`, `task`, `previous`, `refs`, `happens`, `should`, `where`, `options` and `proposal` at the top level are a usage error naming the field, and so is `differences` without `unifies`. It is refused, writing nothing and naming every problem in a line, when `unifies` has fewer than two Drifts or a repeated one; when a Drift does not exist, is not open, is in a resolution being written or open (also a prepared one), or is a unified Drift with a decided difference; when `differences` has not exactly one entry for each difference the gathered Drifts give, in order; when a difference breaks a rule of a new Drift's sections and options or has neither options nor `proposal`; when a `linked` name is not another difference of the same Drift; or when a `proposal` is neither the one attached to its Drift (or difference) nor a Draft or open one attached to no open Drift. The new Drift is Open and, in the same step, each gathered Drift becomes `resolved` with `resolution: unified` and `unifiedInto`, keeps its fields, loses its short number and its prepared question, and its attached Proposal stays attached, held by its difference, unless `proposal` attaches a new one to that difference in its place, which discards the replaced one without feedback after the Drift files are written; if a write fails the files already written are restored. The unified Drift has `unifies`, one entry of `differences` in its file for each difference (`{ drift, refs, proposal?, linked?, decision?, option?, note?, task?, resolvedBy? }`, with the text in a `## Difference <drift>: <title>` block of its body), `refs` that are their union, the origins of the gathered Drifts and, as precedents, theirs plus each Drift fixed by a Task that is one of its origins (each difference keeps those of its own Drift). In the file `origin` and `previous` are one string for one value and a list for several, and both read either way; the Snapshot and `--json` carry `unifies`, `unifiedInto`, `origin` and `previous` always as lists, and `differences` (`{ drift, title, refs, sides, where, options, proposal, linked, decision, option, note, task, open }` for each; empty when absent) on `drift show` and in the Snapshot, `{ total, open }` or `null` on `drift list` and `project show`. A unified Drift blocks every Task not Done that concerns the same thing as the refs of its open differences, and their origins; a decided difference blocks nothing. A unified Drift written before the differences existed is read as one single difference and never rewritten. A `unified` Drift is a decision of nobody while its difference is open: it is no precedent, is not counted among the Drifts already resolved and refuses `drift move`; once its difference is decided it counts as resolved with that decision on the refs of the difference, so a difference closed without changes holds back filing it again, and one fixed in the code or with a Proposal may be named as `previous`, by the identity of its Drift. Approving a resolution gives each difference it lists its decision (`decision`, `option`, `note`, `task` and `resolvedBy` in the file): the `fix-code` differences get a fix Task each, except those linked to each other, directly or through other linked differences fixed in the same resolution, which share one (refs the union of theirs, the body carrying each difference's two sides, where in the code, chosen option and note; Technical when every ref is a Requirement), the origins of the fixed differences go back to To do and wait for it, and the Proposal attached to each decided difference is set aside; the Drift stays Open with the others and becomes `resolved` with `resolution: differences` (Differences decided) when the last open difference is decided. `drift move` toward `code-to-be-fixed` or `proposal-accepted` is refused with `Drift <id> has differences: decide them with Resolve`; `dismissed` closes every open difference without changes (`decision: dismissed`, the decided ones keep their outcome) and is refused, as for a Drift with an attached Proposal, when an open difference has one; Dismiss Drift in the panel does the same and discards those Proposals. `drift edit` takes `prepared` as `{ questions: [{ difference, question, decisions }] }` (the prepared round: one question for each open difference to write or replace, the others kept, each checked on its difference) and `proposal` as `{ difference, proposal }`; a single `prepared.question` on such a Drift is a usage error. `dryRun` with `unifies` needs no other field and prints the Tasks the unified Drift would block, the origins of the gathered Drifts included. `drift show` of a unified Drift with differences prints, after the title, one block for each difference (`Difference <number or identity of its Drift> <title>`, then `open` or its decision `fix code: <option title>` with the Task, `adapt model` or `dismissed`, `Linked to …`, and for an open one its sides, where in the code, fix options and attached Proposal), then an **Unifies** block and one `Follows Drift …` line for each precedent; of a gathered Drift, `Unified into <number or identity> <title>` right after the title; `drift list` and `project show` mark `(unifies <N>, <K> open)` (`(unifies <N>)` without differences), and `drift list` with `all` marks `(unified into …)`. A successful `drift new` prints a line `Unified <id> into <id>` for each gathered Drift; with `--json` it adds `unifies` and `differences`.

With the Async Drift Resolver (`trama.asyncDriftResolver`, on by default and turned off by setting it to `false`, read from the user settings only), the main agent of a scan, a Run or an import prepares, before it finishes, the question Resolve would ask about each Drift the work filed. It finds them with `trama drift list` with `job` (from `TRAMA_JOB`) and `unprepared: true`, and records each question with `trama drift edit <id>` and `{ prepared?, proposal? }` (`prepared` is `{ question, decisions }`, one decision per option: `fix-code` with `option`, `proposal` or `dismissed`). `drift show` has a **Prepared question** block (`valid`, `stale: Model or Requirements changed` or `unreadable`), and `drift list`, `show`, the Snapshot and `--json` carry `job` and `prepared`. `trama proposal new` accepts `prepared: true` with `kind: resolution`: the resolution written from an answer already given to a prepared question. The skills `trama-resolve-drifts` ("Prepared question"), `trama-scan`, `trama-implement` and `trama-import` ("Async Drift Resolver") teach the agent both parts.


## Comparisons

The input of `comparison move <id> delivered` is a JSON object with a `tasks` list and a `drifts` list, and an optional `design`, the ID of a Proposal every Task of the file is linked to (as `proposal` in `task new`). A Task has `title`, `refs` (a list of strings), and optional `body` and `technical`. A Drift has `title`, `refs`, `happens`, `should`, `where`, and `options` (a list of `{"title", "text"}`), and optional `previous` (the ID of a resolved Drift it recurs from) and `proposal` (the ID of its own Proposal). Every card is checked before anything is written: when one fails, the output lists the problems, nothing is written and the comparison stays waiting. Tasks are written before Drifts. An agent filing cards sees the editor learn who holds each of them, as with `task new` and `drift new`.

A Drift of `comparison move <id> delivered` (and `drift new`) also takes `merge: true` for a Drift from a merge, found by the scan after a Merge in Solo mode in a file listed by `git diff --name-only <base>...<incoming>`: a boolean, `false` by default, written in the Drift as `merge: true` only when true. `drift show` prints `From a merge` after the title and `drift list` and `project show` mark the Drift `(merge)`.

A successful `comparison move <id> delivered` records the comparison in the registry `.trama/compared/<fingerprint>.json`: for each reference of the comparison, and each element that contains it, it stores the text fingerprint of that element, under the code fingerprint of the moment. The folder has its own `.gitignore`, and the records of any other code fingerprint are deleted on that first write. The code fingerprint is the Git commit plus the content of the changed and untracked files, excluding `.trama`, the agents' skill folders (`.agents/skills`), `.omp/agents` and `.omp/WATCHDOG.yml`; `comparison new` announces it with the comparison, together with its references. Outside a Git repository, or for a comparison with no code fingerprint, a comparison that is withdrawn or rejected, nothing is recorded. `task list` with `runnable` and `scope` uses these records: a reference is already compared when a recorded element still has the same text fingerprint under the same code fingerprint.

`trama timing list` shows the phase timings that the agent's commands record in `.trama/timings/`. Each coordinator job has one job file, named by the UTC instant the job started and the holder that ran it (`<instant>-<terminal or chat>.jsonl`), with one JSON line per event: the check phases (`announcement new` and `announcement move`), the Tasks an agent moves to `doing` and to `done`, the machine comparisons (`comparison new` and `comparison move`), the Drifts filed on a Task, and the waits of `task list` with `runnable` and `max`. Only commands run from a Trama terminal or chat are recorded; the developer's own commands write nothing. The folder has its own `.gitignore` containing `*`; the newest 20 job files are kept, and a new job deletes the older ones. Failing to write a record never fails the command that records it. A job that has parallel choices also shows `Parallel choices`: the count per kind and one line per choice, with kind, Tasks and reason (`--json`: `parallelChoices`). `trama timing new` with `{ kind, tasks, reason }` records such a choice of the parallel execution: `kind` is `release`, `order` or `conflict`, `tasks` holds at least two existing Tasks and `reason` is one non-empty line; invalid input is a usage error and writes nothing, and outside a Trama terminal or chat the command writes nothing, says so and exits with 0.


## Resolving Drifts

No Drift resolves itself: there is no delegation, no automatic approval and no automatic Run. Resolve on one Drift (its card in the Board) takes only that Drift: the agent asks the developer the decisions and hands over a resolution to review; the Tasks that come out of it start by hand. A refused start keeps that scope until it really starts, so no other open Drift is taken with it. With the Async Drift Resolver on (read at the click from the user settings only), Resolve on a Drift with a valid prepared question starts no agent and announces no ghost: it opens that question at once as a one-question round labelled `Prepared question`, with the recommendation selected. A Fix option (its free text is the note), or closing the Drift or adopting its attached Proposal with no free text, is written and handed over by Trama as a resolution Proposal marked `prepared`, and its yellow card appears in the Backlog; free text with another option, or a refused hand-over, launches the usual agent with the answer. A skip or a lost editor writes nothing and the question stays prepared. While the question is open Run, Run all, the Resolve of other Drifts and Dismiss Drift are unavailable; a resolution awaiting a decision never stops Resolve on a Drift with a valid prepared question.

## Announcements

Announcing a card before the agent creates it makes the Board show a ghost of it meanwhile.

| Command | Effect |
|---|---|
| `trama announcement new` with `{ kind: proposal\|task\|drift, title }` | Announces a card the agent is about to create, as soon as it knows it will. Prints the announcement ID, six letters and digits. Not developer-only: the agent runs it. Writes a temporary file under `.trama/announcements/` (see the file format). The announcement belongs to the terminal in `TRAMA_TERMINAL` (the extension sets it in every agent terminal it starts, and an omp Chat conversation has the one of the terminal it replaces). Without the variable, or with a value that is not six lowercase letters and digits, the command is refused with an error saying that only an agent started by Trama can announce, and writes nothing. A `trama proposal new` without the variable creates the Proposal without an announcement and without an error. |
| `trama announcement new` with `{ kind: check, title, phase: verifying\|scanning }` | Annuncia un controllo: non una scheda, ma il lavoro che l'agente fa ancora quando nessuna scheda lo mostra (la verifica finale di una corsa, o una scansione). Stampa l'ID come gli altri annunci e copia `terminal` allo stesso modo ed è rifiutato senza `TRAMA_TERMINAL`. `phase` è obbligatorio per `check` e rifiutato per gli altri tipi. Un annuncio non ha `job`. Il ghost sta In progress. |
| `trama announcement move <id> scanning\|history` | Passa un controllo da Verifying a Scanning, o da Verifying o Scanning a History, quando parte lo scan o la scrittura della History. Su un controllo già nella fase richiesta non cambia nulla e lo dice. Non si torna indietro: un passaggio all'indietro è rifiutato senza modifiche. |
| `trama announcement move <id> delivered\|failed` | Consegna il controllo e rimuove il ghost, allo stesso modo per entrambi. La differenza fra `delivered` e `failed` finisce soltanto nei tempi delle fasi; nessuno dei due manda l'esito a un coordinatore. |
| `trama announcement edit [<id>]` with `{ note }` | Declares a note on the ghost of the work the agent is doing: one short line about what it does and why, for the developer. With `<id>` the note goes only to that announcement, of any kind, comparisons included; without it, to every announcement still waiting that belongs to the terminal in `TRAMA_TERMINAL`, comparisons excepted; an agent without a terminal has no announcements. Not developer-only: the agent runs it. |

Un ID sconosciuto, già consegnato o ritirato, o che non è un controllo, non è un errore per `announcement move`: l'uscita dice che il controllo non è stato trovato e il comando finisce con successo, senza comunicare un esito riuscito. Annunciare un controllo e cambiarne la fase non riavviano nulla: non c'è quiete che li conti come attività. Nessuno dei comandi è riservato al developer.

A note is one line of plain text: line breaks become spaces and the ends are trimmed, and an empty note is a usage error that saves nothing. A note over 120 characters (counted as Unicode characters) is saved cut to the first 119 followed by `…`, and the output says so in one line; the exit code stays 0. Each announcement keeps at most 6 notes, oldest first, each with the instant it arrived (`notes` in the announcement file, a list of `{ at, text }`, written only when there are some); past 6 the oldest is dropped, and a note equal to the previous one only renews its instant. The output has one line per announcement the note went to (identity and title); with `--json` it is `{ announcements, truncated }`. With no announcement to go to the command says `No announcement is waiting here; the note was not saved.` and exits with 0; an unknown identity is an error (exit 1) and saves nothing. A note changes neither the phase, the title, `touched`, the Draft bound to the announcement, nor its delivery or withdrawal, and it does not count as the agent's activity: it is not among the commands that register its work and it does not contact the editor, which reads the note from the announcement file. The Board snapshot carries `notes` and `announced` (the instant the announcement was born) for every announcement.

The `announcement` field of `proposal new`, `task new` and `drift new` names an announcement: when the card is created, the announcement it names is delivered and the ghost gives way to the real card. A `proposal new` with no `announcement` takes over the oldest announcement that Trama made for a design request and that no Draft has taken yet, only if it belongs to the terminal in `TRAMA_TERMINAL`, never to another terminal; with none waiting it makes an announcement of its own, so the Board shows its Draft, and that one belongs to the terminal in `TRAMA_TERMINAL`, if any. An ID that is unknown, already delivered or withdrawn, of another kind, or already bound to a Draft never prevents the card from being created; the output adds a note saying so. `proposal move <id> open` delivers the announcement bound to the Draft only when it succeeds; `proposal move <id> discarded` withdraws it with no notice.

Una Proposal creata con `announcement` non utilizzabile resta senza ghost: non prende un'altra richiesta in attesa e non crea un annuncio automatico. Questi percorsi automatici si applicano solo quando `announcement` è assente.

L’estensione sincronizza ogni volta che il pannello si aggiorna soltanto l’H1 degli annunci Writing già associati a una Draft leggibile, anche dopo modifiche dirette al titolo e durante un round di domande. Conserva tutti i metadati, incluso `touched`, e non riscrive un titolo già coincidente né ricrea annunci ritirati o consegnati.

The extension announces each agent launch itself, except a Run, as soon as its instruction is really sent: a design or Resolve Drifts announces the Proposal the agent will create, a scan announces its check in Scanning, and an import announces the work itself. The announcement belongs to the terminal where the instruction is written, or to the terminal an omp Chat conversation replaces. An instruction that waits for the developer's Enter or lands on the clipboard announces nothing. When the agent's turn ends (idle hook, end of the command Trama typed, closing of the terminal, or the end, interruption or closing of a Trama conversation in the chat), the Proposals and Drifts it delivered or filed are released, so their buttons in the Board become available again.

Only the extension withdraws announcements the agent never delivered, and each terminal only its own: the command Trama typed into an agent terminal ending (recognised by the command line the editor reports for it, compared after trimming; any other command, or an end reported without that line, withdraws nothing), that terminal closing, or its agent going idle (`hook idle`) withdraws the announcements that belong to it. At startup the extension withdraws every announcement left on disk, with no notice; the Tasks still marked as taken stay taken until their agent's end releases them or the developer runs `task move <id> doing`. There is no timer: no elapsed time and no quiet period withdraws an announcement, and read-only commands do not count as activity. The command line alone never withdraws any.

## Board

`trama project show` prints the Board. Draft Proposals are marked `(draft)` in **In writing**, separate from **To decide**. To decide shows handed-over Proposals and open Drifts; an open resolution Proposal and the open Drifts it lists are one yellow card, counted once, with the Drift rows inside it. The other open Drifts have their own cards. JSON keeps Drafts in `inWriting`, outside `toDecide`. Each Task is listed on its own, in its column, as before, with no grouping by Proposal and no design entries in the text or in `--json`. A Task linked to a Proposal carries that Proposal's tag: its short number (or, with none, its ID) and its title. `task list` stays flat.

## Question rounds

`trama question new [--root <dir>] --input -` reads one complete question round as JSON from standard input (`--input -`, in a heredoc; the command reads no standard input without it, and the JSON text itself is also accepted as the value of `--input`) and waits for its editor window. It always prints one JSON result or error on stdout; command diagnostics go to stderr. `--root` selects the project independently of the caller's current directory. In PowerShell pass the JSON with a pipe, `Get-Content -Raw round.json | trama question new --input -`, not with `<` or a heredoc.

Example round:

```json
{
  "questions": [{
    "id": "route",
    "question": "Choose the route",
    "context": "Orders above **€500** go through the slow route today.",
    "options": [
      { "label": "Fast", "description": "Fewer checks", "details": "Skips the address check; about 1% of parcels come back." },
      { "label": "Safe", "description": "More checks" }
    ],
    "recommended": 1,
    "multi": false
  }]
}
```

Every question needs a unique non-empty ID, non-empty question text, at least two options with non-empty labels and descriptions, an in-range integer recommendation and an explicit `multi` boolean. Two fields are optional: `context` on a question, the background of the decision shown under it, and `details` on an option, a longer explanation the developer can open; when present they must be non-empty once spaces are trimmed. The question, its context and the option descriptions and details are Markdown; labels are plain text. Unknown fields are refused. The whole round is validated before any question is shown. Do not add an "Other" option: the editor always offers a free-text answer.

The developer sees only the round, never the agent's conversation, so every question, with its context and options, must be understandable on its own; the texts use no first person (write "Trama" or "the agent", never "I" or "we"). `context` stays optional: leave it out when the question and the options are enough.

- **Completed:** `status: "answered"` and `answers` keyed by question ID. Each entry is `{status: "answered", selected: [...]}` with original option labels and optional `text`, or `{status: "skipped"}`. A multiple-choice answer may combine selected options and free text. Recommendation markers never appear in returned labels.
- **Initially unavailable:** `status: "unavailable"` and a `reason`. No answers are supplied, and the agent does not ask in any other way: it stops, opens no Proposal, and tells the developer to open the project in the editor with Trama. The reason is `Editor not available for this project. Do not ask in any other way: stop, tell the developer to open the project in the editor with Trama, and run the same trama question new again when they say to continue.`. It is also the answer, without looking for any window, when the command runs outside a terminal or omp Chat conversation launched by Trama (no `TRAMA_QUESTION_ENDPOINT` or no `TRAMA_TERMINAL`), and when the window answers that the `TRAMA_TERMINAL` named is not a terminal or conversation it opened and that still exists.
- **Invalid request:** `error.code: "invalid-input"` with the offending field identified in `error.message`; correct the request rather than using fallback answers.
- **Editor lost after submission:** `error.code: "editor-interrupted"` with no answers. Stop the current workflow: no partial answers, recommendations, fallback, retry, rerouting or resumption. This is not initial unavailability.
- **Caller cancellation:** abandons only that caller's round. On Linux and macOS, SIGINT or SIGTERM cancels CLI waiting. On Windows, SIGTERM never reaches the process: cancel with Ctrl+C (SIGINT), or by closing the command's output or connection. A process killed without warning counts as a disconnection as soon as the editor sees its pipe close. Any of these abandons the round.

Completed and initially unavailable results exit `0`; question failures and cancellation exit `1`; malformed requests exit `2`.

Questions open immediately in an overlay inside the editor's Trama panel, one question at a time with an index of the round. Back and the index keep what was entered; free text goes in `Your answer (optional)`; Skip skips one question, and Skip all (also behind Close) asks for confirmation and delivers at once. Otherwise the round is delivered from its summary with Send to agent, once every question is answered or skipped. Esc does nothing. Skips contain no invented answer: the agent applies its recommendation and lists the skipped decisions for review. The exception is `trama-resolve-drifts`: for a skipped question it applies no recommendation, leaves that Drift out of the resolution (it stays open) and says so in its report. There is no response deadline.

Each window owns one FIFO shared by every `trama question new` caller. Cancelling one caller does not cancel another; losing the editor interrupts both its active and queued rounds. Other windows remain independent. The endpoint in `TRAMA_QUESTION_ENDPOINT`, set by Trama in launched agent terminals and omp Chat conversations, is authoritative, and its window secret is still read from that endpoint's discovery record. Every round belongs to the terminal named in `TRAMA_TERMINAL`: without the endpoint or the terminal the command answers `unavailable` at once, with no search for a window. Requests are sent to only that window; any other project is refused.

The round is shown with the name of the tab of the terminal or conversation that asked it, and it is interrupted (the command answers `editor-interrupted`) as soon as that terminal's command ends, the terminal closes or its conversation ends or is stopped.

Routing uses private user-local sockets on Unix and a Node named pipe (`\\.\pipe\trama-question-<uuid>`) on Windows, with no PowerShell helper. Windows relies on the default permissions of `%LOCALAPPDATA%\Trama\questions` and does not check them; on Linux and macOS the socket and the record folder keep their private modes and checks. Discovery records live outside the repository and contain the project and window identities, the endpoint, focus recency and the window's random secret. Every request to an editor carries the secret of the record the editor was reached by, on every platform; a request without the right secret gets no answer and its connection closes. Questions and incomplete answers remain in memory, never in `.trama/` or discovery files.

## Agent hooks

`trama hook idle [--root <dir>]` is run by the hook Trama makes omp load (`--hook`, see `extension/src/omp/trama-hook.ts`) when omp's main session settles (`session_stop`) or ends (`session_shutdown`), not by people. It takes the terminal's identity from `TRAMA_TERMINAL`, finds the editor of the project as `trama question new` does and tells it that the agent of that terminal is idle: the editor then ends the run, releases the Tasks that terminal had taken and withdraws its announcements. It waits at most one second, writes nothing to disk and exits with `0` also without an editor, a project or `TRAMA_TERMINAL`; only a wrong use exits with `2`.

`trama hook start <pid>` is run by the same hook once, at the first `session_start` of omp's main session (or its first `agent_start` if omp gives no `session_start` before the first turn); sub-agents send nothing. It takes the terminal from `TRAMA_TERMINAL`, finds the editor as `hook idle` does and tells it the process `<pid>` of the agent (`agent-started`) and nothing else: it starts no process and does not read the process's start time, which the editor reads afterwards, in the background. It is not a sign of life and is never repeated. It exits with `0` also without an editor, a project or `TRAMA_TERMINAL`, or with a `<pid>` that is not a positive integer (then it sends nothing); only a wrong use exits with `2`.

In an omp Chat conversation of a job the process carries `TRAMA_ACP=1`: the same hook is loaded there, but it runs neither `trama hook start` nor `trama hook idle`, because Trama started that process and learns the end of the work from omp's answer to the prompt; an `agent-started` or `agent-idle` message for the identity of a conversation is ignored by the editor. In every session, in terminals and conversations alike, the hook still refuses the `ask` tool (`tool_call`), with the shared refusal (`trama question new` instead), without contacting the editor, and in a Run still claims the files the agent writes. Outside Trama's terminals and conversations no hook is installed, so nothing is refused. The local channel keeps no handler for the old `agent-alive` message: it is refused like any unknown message.

