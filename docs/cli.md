# CLI

`trama` is a single binary. It lets the agent **explore** the Model and manage Proposals, Tasks and Drifts. It never reads the user's code (ADR 0002). File formats are in [model-format.md](./model-format.md).

## Conventions

- `trama <object> <verb> [<id>] [<state>] [--input <json>]`. The objects are `model`, `proposal`, `task`, `drift`, `history`, `announcement`, `comparison`, `question`, `autopilot`, `project`, `timing` and `hook`. The verbs mean the same for every object: `show <id>` reads one thing, `list` reads several, `new` creates and prints the identity of what it created, `edit <id>` changes the content, `move <id> <state>` takes a card to another state (the state names are the Trama Model's, in lowercase with a dash for a space: `code-to-be-fixed`), `check` reports errors and warnings. An object has only the verbs of the reference below; `hook` is the only exception.
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

Every new Proposal starts as a Draft; hand it over with `proposal move <id> open` when it is finished. `kind` is `change` (default), `import` (existing code), `resolution` (a resolution of Drifts) or `setup` (the first Proposal of an empty Model). `label` is the short label (1 to 30 characters, one line), required before a Proposal with Tasks is handed over. `requires` lists the Proposals it depends on. `automatic` and `nonBlocking` apply only to a resolution (`nonBlocking` for one whose Drifts block no Task, and not with `automatic`) and `job` binds an automatic resolution Draft to its autopilot job. `announcement` is the ID printed by `trama announcement new`; `request` binds the Proposal to the written design request it comes from.

Input (`--input`):

- `title`: `string not empty`, required. A short title: at most five words.
- `body`: `string`, optional. The text of the Proposal, in Markdown.
- `kind`: `"change" | "import" | "resolution" | "setup"`, optional. The kind of Proposal. Default `change`.
- `label`: `string`, optional. The short label of the Proposal: 1 to 30 characters, one line.
- `requires`: `string not empty[]`, optional. The Proposals this one requires: IDs or short numbers.
- `automatic`: `boolean`, optional. An automatic resolution. Only with kind `resolution`.
- `nonBlocking`: `boolean`, optional. A resolution whose Drifts block no Task. Only with kind `resolution`.
- `job`: `string not empty`, optional. The autopilot job of an automatic resolution. Only with `automatic`.
- `announcement`: `string not empty`, optional. The announcement of this Proposal.
- `request`: `string not empty`, optional. The written design request this Proposal comes from.

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
- note: string, optional. About the announcement, when it was not known.
- requestNote: string, optional. About the design request, when it was not bound.

Runs at once; writes in `.trama/`, counts as the agent's activity, sends messages to the editor's coordinator.

#### `trama proposal show <id>`

The Proposal's text, its status, what it requires, the files it changes, its Tasks, the scope it covers and the validation of the Model and Requirements with it applied. Read-only.

- `<id>`: The Proposal: its ID, a unique prefix or its short number.

Output (`--json`):

- id: string, required
- number: string | null, required
- status: string, required
- title: string, required

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

Every use sends an open Proposal back to Draft and says so; hand it over again with `proposal move <id> open`. Without input it only returns an open Proposal to Draft, touching no file. `label` writes or changes the short label. `edit` makes each path (a Model file, `specs.yaml`, a Requirement fragment such as `requirements/<area>/<fragment>.md`, or a Task as `tasks/<slug>.md`) editable inside the Proposal and prints the path to write for each; a new Task takes a new identity, and a Task is rewritten by the full name printed. `delete` marks each path for deletion. `drifts` records or replaces the decisions of a resolution on open Drifts, and `removeDrifts` takes Drifts out of its list.

- `<id>`: The Proposal: its ID, a unique prefix or its short number.

Input (`--input`):

- `label`: `string`, optional. The short label: 1 to 30 characters, one line.
- `edit`: `string not empty[]`, optional. Paths to make editable inside the Proposal.
- `delete`: `string not empty[]`, optional. Paths to mark for deletion.
- `drifts`: `{ drift: string not empty, decision: "proposal" | "dismissed" | "fix-code", option?: integer ≥ 1, note?: string }[]`, optional. The decisions to record on Drifts. Only in a resolution.
- `removeDrifts`: `string not empty[]`, optional. Drifts to take out of the list: IDs or short numbers.

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

Runs at once; writes in `.trama/`, counts as the agent's activity.

#### `trama proposal move <id> <state>`

`open` hands a valid Draft over to the developer: it checks the Model and Requirements with the Proposal applied and prints the warnings and `proposal show` of the Proposal; a setup Proposal on an empty Model is approved at once. `approved` accepts an open Proposal and applies it in this folder. `rejected` rejects an open Proposal. `discarded` discards a Draft. Approving and rejecting a Proposal attached to an open Drift is refused: the decision is on the Drift. `skillsDir` (with `approved`, and with `open` for a setup Proposal) adds the configured skills folder where the `trama-req-*` skills are regenerated. `feedback` (only with `rejected`) is the text for the agent. Approving, rejecting and discarding are the developer's decisions.

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

Runs at once; writes in `.trama/`, counts as the agent's activity, sends messages to the editor's coordinator.

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

Everything needed to carry the Task out, with no pointers to other commands or skills: the Model elements it references in full, and the Requirements that apply. Names each Drift or Task that blocks it. Read-only.

- `<id>`: The Task: its ID, a unique prefix or its short number.

Output (`--json`):

- id: string, required
- number: string | null, required
- title: string, required
- column: "todo" | "doing" | "done", required
- body: string, required

Runs at once; read-only.

#### `trama task list`

Without `runnable`, every Task by column, filtered by `column` and `tasks`. With `runnable: true`, the next runnable Task (in To do, not blocked), or with `max` the Tasks for the free places of a parallel run: up to `max` of them, none concerning the same thing as another or as a Task In progress the agent has taken. `tasks` keeps only the named Tasks, `proposals` only those of the named Proposals and `notProposals` all but those (the Tasks with no Proposal included); the two never go together. When none is runnable it says so and lists the Tasks in To do with what blocks them. With `heldBack: true` it adds `## Held back`: the runnable Tasks the free-places rule left out because they concern the same thing as a chosen Task or a Task the agent has taken, each with the Tasks it overlaps; blocked Tasks and Tasks left out only for lack of places are not there. With `scope: true` it adds the scope of a scan: with `runnable`, the exact references of the runnable Tasks (the pre-flight), the ones already compared on this code apart; without it, the scope of the Tasks named in `tasks`, which is then required. Moves nothing.

Input (`--input`):

- `column`: `"todo" | "doing" | "done"`, optional. Only the Tasks of this column. Not with `runnable`.
- `runnable`: `boolean`, optional. The runnable Tasks instead of every Task.
- `max`: `integer ≥ 1`, optional. With `runnable`: up to this many Tasks, for a parallel run.
- `tasks`: `string not empty[]`, optional. Only these Tasks: IDs or short numbers; each must exist.
- `proposals`: `string not empty[]`, optional. With `runnable`: only the Tasks of these Proposals.
- `notProposals`: `string not empty[]`, optional. With `runnable`: every Task but those of these Proposals.
- `scope`: `boolean`, optional. Add the scope of the scan.
- `heldBack`: `boolean`, optional. With `runnable`, without `scope`: add the runnable Tasks kept out because they concern the same thing as a chosen or taken Task.

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

`scope` with `runnable`:

- refs: { ref: string }[], required
- alreadyCompared: { ref: string }[], required
- tasks: { id: string, number: string | null, title: string }[], required

Runs at once; read-only.

#### `trama task move <id> <column>`

Run as the agent (in the terminal Trama started, or in Cursor's chat), a move to `doing` takes the Task and a move to `todo` or `done` clears that; it is refused, changing nothing, when the Task is blocked. Run as the developer, a move of a Task the agent has taken is refused, except to `doing`, which takes it back: the mark goes and the Task stays In progress. `unchanged` (a note saying what was checked) closes a fix Task into Done without changes when the code already does what the Drift's Model or Requirement says, and dismisses its Drift; it applies only to `done`.

- `<id>`: The Task: its ID, a unique prefix or its short number.
- `<column>`: Where the Task goes. One of `todo`, `doing`, `done`.

Input (`--input`):

- `unchanged`: `string not empty`, optional. Only toward `done`: closes a fix Task without changes, with the note of what was checked.

```sh
trama task move T3 done --input - <<'JSON'
{"unchanged":"The code already cancels the order; checked in cart.ts."}
JSON
```

Output (`--json`):

- id: string, required
- number: string | null, required
- column: "todo" | "doing" | "done", required
- unchanged: string | null, optional
- drift: string | null, optional

Runs at once; writes in `.trama/`, counts as the agent's activity.

### `drift`

#### `trama drift new`

`happens` (what the code does, in terms of behaviour) and `should` (what the Model or Requirement says) are short Markdown; `where` is required and says where in the code the difference was seen (read that code before filing; files and code names go only there). `options` are from two to five fix options, the first being the one you recommend; without options the Drift is accepted only with an attached `proposal`. `critical` marks an urgent developer decision. `task` names the Task you were implementing when you found the difference (the origin). `previous` is the resolved Drift this one follows. `notBlocking` names Tasks the Drift would block and leaves free, each with a one-line `reason`: the difference does not touch it (see `dryRun`). `announcement` is the ID printed by `trama announcement new`. With `dryRun: true` nothing is written: it prints the Tasks a Drift with these `refs` and this `task` would block, by number or identity and title; only `refs` and `task` are needed then.

Input (`--input`):

- `title`: `string not empty`, optional. A short title: at most five words. Required unless `dryRun`.
- `refs`: `string not empty[]`, required. The Model elements and Requirement sections the Drift is about.
- `happens`: `string`, optional. What the code does, in terms of behaviour. Required unless `dryRun`.
- `should`: `string`, optional. What the Model or Requirement says. Required unless `dryRun`.
- `where`: `string`, optional. Where in the code the difference was seen. Required unless `dryRun`.
- `options`: `{ title: string, text: string }[]`, optional. From 2 to 5 fix options, the recommended one first; none only with `proposal`.
- `critical`: `boolean`, optional. An urgent developer decision. Default false.
- `task`: `string not empty`, optional. The Task being implemented when the Drift was found: its ID or short number.
- `proposal`: `string not empty`, optional. The Draft or open Proposal that goes with the Drift: its ID or short number.
- `previous`: `string not empty`, optional. The resolved Drift this one follows: its ID or short number.
- `notBlocking`: `{ task: string not empty, reason: string }[]`, optional. Tasks the Drift would block and leaves free.
- `announcement`: `string not empty`, optional. The announcement of this Drift.
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
- critical: boolean, required
- previous: string | null, required
- note: string, optional. About the announcement, when it was not known.

`dryRun`:

- tasks: { id: string, number: string | null, title: string }[], required

Runs at once; writes in `.trama/`, counts as the agent's activity, sends messages to the editor's coordinator.

#### `trama drift show <id>`

Both sides, the fix options, where in the code, the references with the Requirements that apply, and the attached Proposal. Read-only.

- `<id>`: The Drift: its ID, a unique prefix or its short number.

Output (`--json`):

- id: string, required
- number: string | null, required
- title: string, required
- status: string, required

Runs at once; read-only.

#### `trama drift list`

With `all: true`, every Drift. `refs` keeps only the Drifts that concern the same thing as one of the given references, as the Task blocks do; a reference that does not resolve is refused. Read-only.

Input (`--input`):

- `all`: `boolean`, optional. Every Drift, not only the open ones.
- `refs`: `string not empty[]`, optional. Only the Drifts that concern the same thing as one of these references.

```sh
trama drift list --input - <<'JSON'
{"all":true,"refs":["order/Paid"]}
JSON
```

Output (`--json`):

- drifts: { id: string, number: string | null, title: string, status: string }[], required

Runs at once; read-only.

#### `trama drift move <id> <state>`

Carries out a decision of the developer. `code-to-be-fixed` keeps what should happen: it creates the Fix Task and takes `option` (the number of the chosen fix option, from 1; required when the Drift has options, and in an interactive terminal without it the options are shown as a menu) and the optional `note`; it sets aside the attached Proposal (an open one is rejected, a Draft discarded). `proposal-accepted` approves the attached Proposal, and `skillsDir` adds the configured skills folder where the `trama-req-*` skills are regenerated. `dismissed` closes the Drift without changes. `option` and `note` toward the other two are refused. A resolved Drift is not resolved again.

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
- tasks: { id: string, number: string, exists: boolean, title: string | null, column: "todo" | "doing" | "done" | null, unchanged: string | null }[], required

Runs at once; read-only.

### `announcement`

#### `trama announcement new`

Announce a card (`proposal`, `task` or `drift`) as soon as you know you will create it, so the Board shows a ghost of it; pass the printed ID as `announcement` when you create the card. Announce a final check or a scan with `kind: check` and its `phase` (`verifying` or `scanning`): it stays in In progress until `trama announcement move <id> delivered` or `failed`. `phase` is required for a check and refused for the other kinds. With `phase: scanning`, a scan check Trama announced at launch for this terminal or chat and still waiting is taken instead of creating one. `job` (only for a check) names the autopilot job the check belongs to; it defaults to the terminal's own (`TRAMA_JOB`). Prints the announcement's ID. Never wait for the ghost to show.

Input (`--input`):

- `kind`: `"proposal" | "task" | "drift" | "check"`, required. What is announced: `proposal`, `task`, `drift` or `check`.
- `title`: `string not empty`, required. A short title: at most five words for a card; for a check, what the work is.
- `phase`: `"verifying" | "scanning"`, optional. Only for a check: `verifying` or `scanning`.
- `job`: `string not empty`, optional. Only for a check: the autopilot job it belongs to.

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
- job: string, optional

Runs at once; writes in `.trama/`, counts as the agent's activity.

#### `trama announcement move <id> <state>`

`scanning` moves a check from Verifying to Scanning, and `history` from Verifying or Scanning to History, when the final run writes its History; a check only moves forward, so a backward move is refused and changes nothing, and a check already in that phase is left as it is and the command says so. `delivered` delivers a finished check and removes its ghost, and tells the editor's coordinator it succeeded; `failed` does the same but tells it the check failed. An ID that is unknown, already delivered or withdrawn, or not a check is not an error: the command says no check was found, changes nothing, and reports no outcome to the coordinator. Nothing tells whether a check is the final one of a run, so the command does not check that.

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

Runs at once; writes in `.trama/`, counts as the agent's activity, sends messages to the editor's coordinator.

### `comparison`

#### `trama comparison new <machine>`

Announces the comparison and prints its ID first, then the references to compare (`refs` limits them to those of the Machine; without it, the whole Machine), their States, Events and Transitions, the Requirements that apply, the analysis, the open Tasks and Drifts on the same thing, and the resolved or dismissed Drifts on the same references. `candidates: true` adds the Tasks a Drift on each reference would block. Keep the ID: `comparison move` takes it.

- `<machine>`: The Machine to compare.

Input (`--input`):

- `refs`: `string not empty[]`, optional. Only these references, which must be of the Machine.
- `candidates`: `boolean`, optional. Add the Tasks a Drift on each reference would block.

```sh
trama comparison new order --input - <<'JSON'
{"refs":["order/Paid"],"candidates":true}
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
- candidates: object | null, required

Runs at once; writes in `.trama/`, counts as the agent's activity.

#### `trama comparison move <id> <state>`

The input is what the comparison found: an optional `design` (the Proposal every Task is linked to), `tasks` (each `title`, `refs`, `body`, optional `technical`) and `drifts` (each `title`, `refs`, `happens`, `should`, `where`, `options` as a list of `{title, text}`, and optional `critical`, `previous`, `proposal`, `notBlocking` as a list of `{task, reason}`); both lists may be empty. Every card follows the rules of `task new` and `drift new`. All cards are checked before any is written: if one is not valid nothing is written and every problem is listed per card. Otherwise the cards are created in order, the comparison is delivered and it is recorded as compared on this code.

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

Runs at once; writes in `.trama/`, counts as the agent's activity, sends messages to the editor's coordinator.

### `question`

#### `trama question new`

Reads one complete question round from `--input -` (or the JSON text), shows it in the editor's Trama panel, waits for the developer and prints the result as JSON, always, also when it fails. The whole round is checked before any question is shown. Every question has 2 or more options, an in-range recommendation and an explicit `multi`. Completed and initially unavailable results exit 0; question failures and cancellation exit 1; a malformed round exits 2. `unavailable` means the editor is not reachable: stop and tell the developer.

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

### `autopilot`

#### `trama autopilot show`

Asks the project's coordinator in the editor and reads the answer: the delegation's mode, the phase of the coordination, the reason it waits or failed, the collection and its Proposal when there are any, and the permanent IDs of the Drifts and Tasks authorized. `status` tells an unavailable coordinator (`unavailable`) from a delegation that is off (`disabled`); neither shows an authorization. With `job` (or `TRAMA_JOB` in the terminal Trama started) it returns the scope currently authorized for that job and no other; without a job it shows the state for the developer, with no `drifts` or `tasks` an agent could use. Read-only. Reread it before each choice: the delegation can change while the agent works.

Input (`--input`):

- `job`: `string`, optional. The job whose authorized scope is wanted. Default: `TRAMA_JOB`.

```sh
trama autopilot show --input - <<'JSON'
{"job":"job-1"}
JSON
```

Output (`--json`):

- status: "unavailable" | "disabled" | "available", required
- mode: string, optional. `disabled`, `enabled` or `yolo`.
- phase: string, optional
- reason: string, optional. Why the coordination waits or failed.
- collection: string, optional. The collection being resolved.
- proposal: string, optional. The resolution Proposal of the collection.
- remoteWindow: boolean, optional. Work is active in another editor window.
- lastFailedScan: string, optional
- failures: string[], optional
- drifts: string[], required. Permanent IDs of the Drifts authorized for the job.
- tasks: string[], required. Permanent IDs of the Tasks authorized for the job.

Runs and waits for the editor; read-only.

#### `trama autopilot move <job> <state>`

Tells the project's coordinator that a Drift or a Task of the job could not be resolved or implemented, or that its check failed: it excludes the case from the next automatic steps and shows `reason`. Give exactly one of `task` and `drift`, by permanent ID; the coordinator checks that the case belongs to the job. It changes no Drift or Task on disk and retries nothing. Fails, with no success assumed, when no coordinator accepts it.

- `<job>`: The autopilot job the case belongs to.
- `<state>`: What happened to the case. One of `failed`.

Input (`--input`):

- `task`: `string`, optional. The Task that failed. Not with `drift`.
- `drift`: `string`, optional. The Drift that could not be resolved. Not with `task`.
- `reason`: `string`, required. Why, in one line.

```sh
trama autopilot move job-1 failed --input - <<'JSON'
{"task":"a1b2c3d4","reason":"The final check failed after this Task."}
JSON
```

Output (`--json`):

- message: string, required

Runs and waits for the editor; sends messages to the editor's coordinator.

### `project`

#### `trama project new`

Creates `.trama/` in `--root` (or the current directory; it never walks up) with `model/system.md`, `model/actors/`, `requirements/` with the five starting Areas, `proposals/`, `tasks/` and `drifts/`, and installs the agent skills, embedded in the binary, and omp's sub-agent definitions. It refuses, creating nothing, when `.trama/` already exists or when a file to install exists with different content, unless `force` is true; identical files are not a conflict.

Input (`--input`):

- `skillsDir`: `string not empty`, optional. The folder of the agent skills, relative to the project root. Default `.agents/skills` (`.claude/skills` for Claude Code).
- `force`: `boolean`, optional. Overwrite skill files, sub-agent definitions and advisor instructions that differ from Trama's. Default false.

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

Runs at once; writes in `.trama/`.

#### `trama project edit`

Writes this version's agent skills into the project's skill folder, replacing older or edited copies, and lists the files it changed; deletes the retired `trama-fix` skill; adds the starting Requirement Areas when the project has none; moves single-file Areas into Area folders; regenerates the `trama-req-*` skills; and rewrites omp's sub-agent definition and the advisor instructions.

Input (`--input`):

- `skillsDir`: `string not empty`, optional. The folder of the agent skills, relative to the project root. Default `.agents/skills` (`.claude/skills` for Claude Code).

```sh
trama project edit --input - <<'JSON'
{"skillsDir":".agents/skills"}
JSON
```

Output (`--json`):

- skillsDir: string, required
- changed: string[], required. The skill files this run wrote.
- removed: string[], required. The retired skill folders deleted.
- removedAgents: string[], required
- agents: string[], required
- areas: string[], required. The starting Areas created.
- conversion: object, required. The Areas moved to the folder format and those left as they were.
- generated: object, required. The regeneration of the Requirement skills.

Runs at once; writes in `.trama/`.

#### `trama project show`

The Board as text. Draft Proposals are marked `(draft)` in **In writing**, apart from **To decide**, which shows handed-over Proposals and open Drifts; an open resolution Proposal and the Drifts it lists are one card. Each Task is listed in its column with the Proposal it comes from. Read-only.

Output (`--json`):

- inWriting: object[], required. Draft Proposals.
- toDecide: { proposals: object[], drifts: object[] }, required
- todo: object[], required
- doing: object[], required
- done: object[], required

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

Records in the timings of the job a choice of the parallel run: `release` (Tasks started together although the free-places rule keeps them apart), `order` (the first Task waits for the others to be Done) or `conflict` (the sub-agent of the first Task stopped because it clashed with the others). `tasks` names at least two existing Tasks; `reason` is one line. Writes only from a Trama terminal or chat: elsewhere it writes nothing, says so and exits with 0.

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

#### `trama hook cursor`

Run by Cursor's `beforeSubmitPrompt`, `stop`, `sessionEnd`, `preToolUse` and `afterShellExecution` hooks, not by people or agents. It hands every live editor window of the project the hook name, the conversation and the project folder, and answers Cursor with `{}`, `{"continue":true}` or the refusal of Cursor's question tool. Whatever happens, even without an editor or a project, it answers and exits with 0.

Input: none. Reads the hook's JSON on standard input.

Runs as an agent hook; read-only.

#### `trama hook copilot`

Run by VS Code's `UserPromptSubmit`, `Stop` and `PreToolUse` hooks. It hands the editor of the project the hook name, the session and whether a prompt starts a Trama skill, never the prompt, waits at most one second, prints `{}` (or the refusal of the question tool) and exits with 0 even without an editor, a project or valid input.

Input: none. Reads the hook's JSON on standard input.

Runs as an agent hook; read-only.

#### `trama hook idle`

Run by the hook Trama makes omp load when its main session settles or ends, not by people. It takes the terminal from `TRAMA_TERMINAL`, finds the editor of the project and tells it that the agent of that terminal is idle: the editor then ends the run, releases the Tasks the terminal had taken and withdraws its announcements. It waits at most one second, prints nothing and exits with 0 also without an editor, a project or `TRAMA_TERMINAL`.

Runs as an agent hook; read-only.

#### `trama hook claude-question-tool`

Run by the `PreToolUse` hook Trama makes Claude Code load for its `AskUserQuestion` tool. It refuses the tool with the shared refusal, which says to ask only with `trama question new`, reads nothing, never contacts the editor and exits with 0.

Output (`--json`):

- hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: string }, required

Runs as an agent hook; read-only.

<!-- commands:end -->

## Project

`trama project new` creates `.trama/` in `--root` (or the current directory) with `model/system.md`, `model/actors/`, `requirements/` with five Areas (`ui`, `tech`, `quality`, `data`, `rules`), each a folder holding only its `area.md` and no fragment, `proposals/`, `tasks/` and `drifts/`, and installs the agent skills (embedded in the binary) into `skillsDir`, default `.agents/skills`. It never walks up. It fails, creating nothing, if `.trama/` already exists or if any skill file to install already exists with different content; `force: true` overwrites those. Identical files are not a conflict.

`trama project edit` writes this version's agent skills into an existing project's `skillsDir` (default `.agents/skills`), replacing older or edited copies, and lists the files it changed. It deletes the folder of the retired `trama-fix` skill, whatever it holds, from `.agents/skills`, `.claude/skills`, `.github/skills` and `skillsDir`, and lists the folders it deleted. It creates the five starting Areas if the project has no `requirements/` folder, and converts every Area still written as one file, `requirements/<area>.md`, into `requirements/<area>/area.md` (description, title, introduction) and `requirements/<area>/main.md` (the same description and title with every section), deleting the old file; an Area whose folder already exists is left alone. It reports the Areas converted and those left, with why. Then it regenerates the `trama-req-*` skills and reports their mode (one skill per fragment, or one index skill per Area), the budget used out of 4,000 characters and any switch. The extension runs it from **Trama: Update Agent Skills**.

`project new` and `project edit` also write the definition of the scan's analysis sub-agent into the project's `.omp/agents/trama-analysis.md` with `model: "@slow"`. It names an omp role, never a concrete model, so it can be versioned; the editor passes the developer's model with `--slow` (see the [extension README](../extension/README.md#terminal-agents-and-model-roles)).

`project new` and `project edit` also write `.omp/WATCHDOG.yml`, the advisor instructions of the Advisor Scanner: a shared `instructions` text and two `advisors` entries (`Trama turn reviewer` and `Trama final reviewer`), each with the tools `read`, `grep`, `glob`, `bash` and no model. It is written whatever `trama.agent` is and with the Advisor Scanner off, and it is handled like `trama-analysis.md`: `project new` lists it among the conflicting files and refuses to overwrite a different copy unless `force` is true, and `project edit` replaces a different copy and says so. Consequence: an omp session started by hand in the project with the advisor on does not create omp's default advisor, because the file lists advisors, and Trama's two advisors stay silent.

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
| `proposal new` with `{ title, body?, kind?, label?, requires?, automatic?, nonBlocking?, job?, announcement?, request? }` | Creates `proposals/<id>-<slug>/proposal.md` with `status: draft` and `created`, the UTC creation instant in ISO 8601. The id is eight random lowercase letters and digits, unique among Proposals; a Task or a Drift may use the same string. A card still named `NNNN-<slug>` (at least four digits) stays addressable by that number and has no `created`. An id argument may be the whole identity, a prefix that only one card of that kind has, or the whole file or folder name; digits alone cite only a numbered card. `kind` is `change` (default), `import` (ADR 0008), `resolution` or `setup`: one value, so a Proposal is of one kind only. `requires` writes it on top of those draft, open or approved Proposals (refused for a rejected or discarded one). `request` binds it to the written design request `.trama/requests/<id>.md` it comes from, recorded as `request`; when that file does not exist the Proposal is created unbound and the output says the request was not found. `label` is the short label, 1 to 30 characters on one line, trimmed, refused before anything is created when invalid; a Draft with Tasks must have one before the hand-over accepts it, and open Proposals written before the label existed are not blocked. It shows as `Label:` under the title of `proposal show`, and as `label` in its `--json`. |
| `proposal new` with `kind: "resolution"`, `automatic` and `job` | Creates a resolution Proposal marked `automatic: true` in its history and binds the Draft to the current authorized collection in the local host's memory using the job identity. `automatic` is valid only with `kind: "resolution"`, and `job` only with `automatic`: any other combination is a usage error that creates nothing. The hand-over rejects file changes to the Model or Requirements and any Drift decision other than `fix-code` with option 1 and no note. The marker and job binding do not authorize approval. |
| `proposal new` with `kind: "resolution"` and `nonBlocking` | Creates a resolution Proposal marked `nonBlocking: true`, whose Drifts block no Task: the experimental Drift blocker files it at the end of a scan, a Run or an import. `nonBlocking` is valid only with `kind: "resolution"`, and not with `automatic`: either combination is a usage error that creates nothing. Validation refuses `nonBlocking` on any other kind and on an automatic resolution. The flag changes neither approval nor rejection, so the developer decides it like any manual resolution. `proposal list` and `project show` mark it `(blocks nothing)`, the Board shows a `blocks nothing` badge on its card, and `list`, `show`, `project show` and their `--json` carry it as `nonBlocking`. |
| `proposal new` with `kind: "setup"` | The first Proposal of an empty Model; a usage error, creating nothing, when the Model has a Feature or an Actor. |
| `proposal edit <id>` with `{ label?, edit?, delete?, drifts?, removeDrifts? }` | Every use returns an open Proposal to Draft, with a notice, so the agent registers before every change; without input it only does that, touching no file. `edit` lists paths: each is a Model file relative to `.trama/model/`, `specs.yaml`, a Requirement file `requirements/<area>/area.md` or `requirements/<area>/<fragment>.md`, new or existing, or a Task `tasks/<slug>.md`. `requirements/<area>.md` and deeper paths are refused, saying why. For each it copies the current file into the Proposal and records its hash in `base`, or creates an empty file marked `new` if it does not exist, and prints the path to write (one per line; `--json`: `paths`, a list of `{ path, edit }`). Re-registering keeps the original hash and contents. `delete` lists paths to mark for deletion: each is added to `delete` and its hash recorded in `base`. `label` writes or changes the short label, with the rules of `proposal new`. `drifts` records or replaces, in a resolution, the decision on open Drifts (`{ drift, decision, option?, note? }`, `decision` being `proposal`, `dismissed` or `fix-code`; `option` and `note` only with `fix-code`), and `removeDrifts` takes Drifts out of the list. All of it runs under the Proposal's lock, in that order. |
| `proposal move <id> open` | The only hand-over command: sets a Draft to `status: open` after the checks of the Model and Requirements with the Proposal applied, unregistered files, the Drift list of a resolution, including each `fix-code` Drift whose code can no longer be fixed. A refusal leaves it Draft and names every problem. A success prints, after its outcome, the warnings of the validation (none when there are none) and then the same text as `proposal show <id>`; with `--json` that text is the `show` field. Staleness or waiting for required approvals do not prevent the hand-over. A `setup` Proposal handed over while the Model has no Feature and no Actor is approved at once, as `approved` would do, and prints the same text after the outcome of that approval; when that approval refuses it (stale, requiring Proposals not approved yet, a Task that cannot be created), it stays Open and the output says why. `skillsDir` as in `approved`. When the Proposal is bound to a written design request, a successful hand-over deletes `.trama/requests/<id>.md` and says so; a file already gone does not make it fail, and a refused hand-over deletes nothing. |
| `proposal move <id> discarded` | Discards only a Draft, setting `status: discarded`; no feedback, no changes to dependents. A Draft attached to an open Drift is refused, changing nothing, as `approved` and `rejected` refuse it: the message names the Drift, and the Drift is decided with `drift move` (fixing its code sets the Draft aside). The agent may run it only when the developer explicitly asks in the conversation; otherwise it asks the developer to decide. |
| `proposal show <id>` | Description; stale or not; for each touched file, what is added, removed or changed, and for a Requirement file its Area and fragment (or `area.md`); for an ordinary Proposal not yet approved: its **`## Tasks`** (identity, title, `(technical)`, references), its **`## Created on approval`** (each `Remove code of <ref>` with the reference it points at), and its **`## Scope`**, computed now: one reference per line in the form `refs` takes (`order/Paid`, `requirements/ui#order/Paid`), each with why it is there (`changed`, `removed, its container` or `leads into a change`) and what covers it (a Task's identity, `already present`, `removal`, or `not covered`). With `--json`: `tasks`, `removals` and `scope` (a list of `{ ref, reason, coveredBy }`). Once approved, an older Proposal shows its saved **`## Scan scope`** (`--json`, `scanScope`), as before. It makes the same checks as the hand-over. |
| `proposal list` with `{ all? }` | Draft and open Proposals (all statuses with `all`), marking drafts `(draft)`, imports, stale ones and required Proposals not approved yet. |
| `proposal move <id> approved` with `{ skillsDir? }` | Open Proposals only. Refuses Drafts as still being written. Fails if a required Proposal is not approved, or the Proposal is stale or invalid; otherwise applies it in this folder, sets `status: approved` and regenerates the `trama-req-*` skills in `.agents/skills`, `.claude/skills`, `.github/skills` and the `skillsDir` folder (relative to the project root) that holds `trama-design`. The extension passes its `trama.skillsDir` setting; from a terminal, pass the folder you configured. A Drift's attached Proposal is accepted with `drift move <id> proposal-accepted`, which also applies it in this folder. An agent may approve or reject a Proposal only when the developer explicitly asks for that decision in the conversation; otherwise it asks the developer to decide. |
| `proposal move <id> rejected` with `{ feedback? }` | Open Proposals only. Sets `status: rejected`. With non-blank feedback it is appended under `## Feedback`; without it, or with blank text, nothing is appended. Drafts are refused as still being written. An agent may reject a Proposal only when the developer explicitly asks for that decision in the conversation; otherwise it asks the developer to decide. |

These are decisions for the developer: `proposal move … approved`, `proposal move … rejected`, `proposal move … discarded` and `drift move`. An agent may run any of them only when the developer explicitly asks for that decision in the conversation; otherwise it stops and asks the developer to decide. Requests to design, scan, implement Tasks or prepare a Drift resolution do not authorize the decision. Trama applies the same argument, state, reference, dependency, validity and conflict checks regardless of who runs the command; `TRAMA_AGENT` and `CURSOR_AGENT` do not block it.

## Tasks

| Command | Effect |
|---|---|
| `task new` with `{ title, refs?, technical?, drift?, proposal?, body?, announcement? }` | Creates a Task in `todo`. A Task references at least one Model element and may add Requirements (`requirements/ui#order/Paid`); a Technical Task may reference only Requirements. `proposal` links the Task to the Proposal (the design) it comes from; the Proposal must exist, in any status; a Technical Task keeps no link, because it is never part of a design. The Scan files its Tasks with it. Fails if a reference or the Proposal does not resolve. |
| `task list` with `{ column?, runnable?, max?, tasks?, proposals?, notProposals?, scope?, heldBack? }` | Without `runnable`, the Tasks grouped by column, flat, filtered by `column` and `tasks` (each must exist): every Task is listed, with its Proposal ID when it has one, so the agent can always find the Tasks in `todo`. A Task the agent has taken is marked `(agent working)`, here and in `task show` and `project show`. A blocked Task is marked `(blocked by Drift <id>)` once for each Drift that blocks it, or `(waiting for Task <id>)` when it waits for the Task that fixes its Drift, in the same places. With `runnable: true` it prints the next runnable Task, `Next Task: <id> <title>`, and moves nothing: `tasks` restricts consideration to that set (deduplicated, each must exist); `proposals` keeps the Tasks of any of the named Proposals; `notProposals` keeps every other Task, the ones with no Proposal included; the two never go together and a Proposal that does not exist is refused; `tasks` intersects with them. With `max` (an integer of 1 or more) it prints instead the batch of runnable Tasks, at most `max`, one per line, with the same filters; duplicates are removed; Tasks retain creation order, blocking and concern-grouping rules, and a Task that concerns a Task In progress the agent has taken is left out. A batch asked by an agent records the queue wait. With `scope: true` it adds the scope of a scan: with `runnable`, the exact references of the runnable Tasks in To do, each once, with a Requirement section counted as its element and no added Transitions, `General` sections or Areas; a reference that a recorded comparison already covers, with the same code and the same text (see Comparisons), is printed under `## Already compared` and is not compared again (`--json` gives `{ refs: [{ ref }], alreadyCompared: [{ ref }], tasks: [{ id, number, title }] }`); without `runnable`, the union of the Model references named by the Tasks in `tasks` (required then), plus Transitions that enter named States or react to named Events, as `## Scan scope` with `changed` and `leads into a change` (`--json` prints a list of `{ ref, reason }`; an empty scope prints `_Nothing to scan._`). With `runnable` and `heldBack: true` it adds `## Held back` (`--json`: `heldBack`, a list of `{ id, number, title, overlaps }`): the runnable Tasks the free-places rule left out because they concern the same thing as a chosen Task or a Task the agent has taken, each with the Tasks it overlaps (`overlaps`, as `{ id, number }`); blocked Tasks and Tasks left out only for lack of places are not there. It takes the same filters, moves nothing and is a usage error without `runnable`. |
| `task show <id>` | The Task, with the blocked and `(agent working)` marks, a line `Blocked by Drift <id>: <title>` or `Waiting for Task <id>: <title>` for each blocker, and everything needed to carry the Task out, with no pointers to other commands or to skills. A Machine reference includes the State tree and the Events with who receives them, the same facts as `model show <machine>`. A State reference includes the outgoing Transitions, including those inherited from the States that contain it, marked as inherited. An Event reference includes the Transitions that react to it, the same facts as `model show <owner.EVENT>`. A reference to a whole Area includes the text of every section. Then the Requirements attached to the referenced elements (or to what contains them), and every General section that has text, written in full. |
| `task move <id> todo\|doing\|done` | Moves the Task to another column. Run as the agent (`TRAMA_AGENT` set, or `CURSOR_AGENT=1` in Cursor's chat), a move to `doing` takes the Task for the agent and a move to `todo` or `done` clears that. Run without it, a move to `doing` of a Task the agent has taken takes it back: the mark goes and the Task stays in `doing`, the developer's; any other move of such a Task is refused, and the refusal points to `trama task move <id> doing`. A move to `doing` by the agent is refused, and changes nothing, when the Task is blocked (also when it is already in `doing`): the refusal names each blocking Drift (ID and title) or the fix Task, and says the developer must decide. Moves of the developer, and of the agent to `todo` or `done`, are never refused for that reason. The Board has no way to move a Task: moving stays here. |
| `task move <id> done` with `{ unchanged }` | Closes a fix Task without changes, when the code already does what the Drift's Model or Requirement says, with a note saying what was checked. From `todo` or `doing`, by the agent or the developer, it moves the Task to `done` and its Drift to `dismissed` in the same step, and the output says the Drift is dismissed. Refused, changing nothing, when the Task fixes no Drift, its Drift is neither in code to be fixed nor already dismissed by this Task, the note is empty, the Task is already `done`, or the column is not `done`. A Task closed without changes is marked `(no changes)` in the lists, carries a `no changes` badge on the Board, and is not counted by the Scan button. Any move out of `done` forgets the note; the Drift stays dismissed. |

### Runs over several Tasks

Run all sends the agent to the skill `trama-implement` over several Tasks. The agent runs `trama task list` with `runnable` and `max: <N>`, where `<N>` is the concurrent sub-agent limit in the instruction, for up to `<N>` Tasks, and starts them as sub-agent places free up: each time a sub-agent comes back, the agent asks for the free places and starts the Tasks it names at once. The run is over when no sub-agent works and the command says that no Task is runnable. The limit is 20 when the instruction gives none. Run all considers every Task in "todo", and the editor checks the same eligibility again just before delivery; if a Task in scope was taken while the request waited, it sends nothing.

When the agent has sub-agents, it gives each Task of the batch to its own sub-agent, in the same folder, as soon as a place is free; a sub-agent that comes back, also one stopped by a Drift, frees its place at once. Without sub-agents, or with one place, it implements the Tasks itself, one after the other, asking for the next Task before each one. A sub-agent never asks for Tasks, never runs the full suite, the linter or the build, and never scans. The same holds for the other skills: `trama-scan` gives each Machine to a sub-agent, and `trama-design` explores with sub-agents before its first round of questions; at most the limit in the instruction (20 by default) at once in every case.

A run skips the Tasks that are blocked and goes on past a Drift: the Drift the agent files leaves its Task in `doing`, blocks only the Tasks that concern the same thing, and does not end the run. A Task that waits for the Task fixing its Drift becomes runnable once that Task is `done`, so the fixing Task runs first and the waiting one right after it. The agent reads each Task once, from `task show`. While writing a Task it may run the tests it added or changed for that Task and the existing tests of the behaviour that Task changes. The project's tests, linter and build run once, at the end of the run; a Task asked by name is its own run. If that check fails, the agent fixes the code and runs the check again, without reading the Model again, before the report, and the Tasks stay in the column they are in. The run's report says what the agent implemented, the Drifts it filed, and the Tasks left in `todo`, each with the Drift or the fix Task it waits for. Asked for one named Task, the agent still stops at once when the move to `doing` is refused because the Task is blocked, and takes no other Task.

After the final check passes, when the run moved at least one Task to `done` and no Task of its scope is blocked, the agent runs `trama task list` with `tasks` and `scope: true` for the Tasks it moved to `done`. If the scope is empty, there is no scan. Otherwise, the agent follows `trama-scan` on exactly those references, not the whole System or Feature, in the same run. Tasks the scan files link to the run's design (or the design of the single Task asked for), if any; the agent reports them and does not implement them.

Durante la verifica finale e lo scan mirato l'agente tiene un controllo sulla Board (`announcement new` con `kind: check`, vedi gli annunci): `trama-implement` lo annuncia in Verifying dopo l'ultimo Task, lo passa a Scanning se `trama task list` con `tasks` e `scope` restituisce un ambito non vuoto e lo chiude prima del resoconto; con ambito vuoto lo chiude dopo la verifica. `trama-scan`, fuori da una corsa, lo annuncia in Scanning e lo chiude prima del resoconto.


On the Board, Run all is unavailable while the agent has taken a Task, when no Task is in `todo`, and when every Task in `todo` is blocked. The tooltip says why, naming the Task the agent is working on, or the Drift or fix Task of the first blocked Task; when both reasons hold it gives the agent working. The host refuses the launch in the same cases.


## History

A History entry (`.trama/history/<id>-<slug>.md`) summarises a macro-feature from the finished Tasks it cites. `history new` and `history edit` are refused, writing nothing, when a title or summary is empty or multi-line, the summary is over 280 characters, a cited Task does not exist, is not Done, or was closed unchanged; `history edit` never removes a cited Task. The fields go in `--input`; the Tasks are named by ID or short number, and the file always carries the IDs. The full reference of each command is in the command reference above.

| Command | Effect |
|---|---|
| `trama history new` with `{ title, summary, body?, tasks }` | Writes a new entry and prints its identity |
| `trama history edit <id>` with `{ title?, summary?, body?, tasks? }` | Replaces the given fields and adds the named Tasks to the cited ones (`tasks` adds, it never removes); always sets `updated` |
| `trama history list` | Entries, most recent first |
| `trama history show <id>` | One entry with its cited Tasks and their state |

## Drifts

A Drift whose fix Task is closed without changes (`task move <id> done` with `{"unchanged":"<note>"}`, because the code already does what the Model or Requirement says) is **dismissed** by that Task. `drift show` then says `Dismissed by Task <id> without changes`, shows the Task's note in a **Check note** block (or says the Task left Done, so the note is gone), and `drift list` with `all` marks it `(dismissed, no changes)`. `--json` carries the same as `closedUnchanged` (`task`, `note`). A dismissed Drift does not stop the same difference from being filed again.

A Drift leaves free only the Tasks named by `notBlocking`. `drift show` lists them after **Where in the code**, under **Not blocking**, each with its number or identity, its title (`(no longer exists)` for a Task that is gone) and its reason; `drift list`, `project show` and the `--json` of Drifts carry the same as `notBlocking`. A Task that no longer exists stays in the list and counts for nothing.


## Comparisons

The input of `comparison move <id> delivered` is a JSON object with a `tasks` list and a `drifts` list, and an optional `design`, the ID of a Proposal every Task of the file is linked to (as `proposal` in `task new`). A Task has `title`, `refs` (a list of strings), and optional `body` and `technical`. A Drift has `title`, `refs`, `happens`, `should`, `where`, and `options` (a list of `{"title", "text"}`), and optional `critical`, `previous` (the ID of a resolved Drift it recurs from), `proposal` (the ID of its own Proposal) and `notBlocking` (a list of `{"task", "reason"}`, naming the Tasks it does not block). Every card is checked before anything is written: when one fails, the output lists the problems, nothing is written and the comparison stays waiting. Tasks are written before Drifts. An agent filing cards sees the editor learn who holds each of them, as with `task new` and `drift new`.

A successful `comparison move <id> delivered` records the comparison in the registry `.trama/compared/<fingerprint>.json`: for each reference of the comparison, and each element that contains it, it stores the text fingerprint of that element, under the code fingerprint of the moment. The folder has its own `.gitignore`, and the records of any other code fingerprint are deleted on that first write. The code fingerprint is the Git commit plus the content of the changed and untracked files, excluding `.trama`, the agents' skill folders (`.agents/skills`, `.claude/skills`, `.github/skills`), `.omp/agents` and `.omp/WATCHDOG.yml`; `comparison new` announces it with the comparison, together with its references. Outside a Git repository, or for a comparison with no code fingerprint, a comparison that is withdrawn or rejected, nothing is recorded. `task list` with `runnable` and `scope` uses these records: a reference is already compared when a recorded element still has the same text fingerprint under the same code fingerprint.

`trama timing list` shows the phase timings that the agent's commands record in `.trama/timings/`. Each coordinator job has one job file, named by the UTC instant the job started and the holder that ran it (`<instant>-<terminal or chat>.jsonl`), with one JSON line per event: the check phases (`announcement new` and `announcement move`), the Tasks an agent moves to `doing` and to `done`, the machine comparisons (`comparison new` and `comparison move`), the Drifts filed on a Task, and the waits of `task list` with `runnable` and `max`. Only commands run from a Trama terminal or chat are recorded; the developer's own commands write nothing. The folder has its own `.gitignore` containing `*`; the newest 20 job files are kept, and a new job deletes the older ones. Failing to write a record never fails the command that records it. A job that has parallel choices also shows `Parallel choices`: the count per kind and one line per choice, with kind, Tasks and reason (`--json`: `parallelChoices`). `trama timing new` with `{ kind, tasks, reason }` records such a choice of the experimental parallel execution: `kind` is `release`, `order` or `conflict`, `tasks` holds at least two existing Tasks and `reason` is one non-empty line; invalid input is a usage error and writes nothing, and outside a Trama terminal or chat the command writes nothing, says so and exits with 0.


## Drift autopilot

| Command | Effect |
|---|---|
| `trama autopilot show` with `{ job? }` (or `TRAMA_JOB`) | Read-only status from the local editor coordinator. Reports the current mode and coordination phase, any wait/error reason, the active collection and Proposal identities when present, and whether work is active in another editor window. It also reports permanent Drift and Task IDs currently authorized for the queried job. Also reports the last scan of the project that failed or was interrupted, as information only: it changes no phase, and a later successful developer-started scan clears it. Without a recognized `job`, output is for the developer and does not grant an agent usable delegation. Distinguishes an unavailable coordinator from disabled delegation; neither is an authorization. It never changes the setting. |
| `trama autopilot move <job> failed` with `{ task, reason }` or `{ drift, reason }` | Tells the coordinator that a Task or a Drift of the job failed or does not apply; exactly one of `task` and `drift`. The coordinator checks that the case belongs to the job before excluding it from the next automatic steps and showing the reason. It changes no Drift or Task file and retries nothing; with no coordinator that accepts it, the command fails. |

The setting `trama.driftAutoPilot` is application-scoped, `disabled` by default, and read only from the user's application setting. `disabled` is manual; `enabled` delegates non-critical Drifts; `yolo` includes critical Drifts. Automatic resolution still requires an open Drift with an applicable first Fix option, outside another Draft/open resolution and not excluded after failure. A successful developer-started scan, a changed Drift, or an explicit Resolve Drifts request makes failed cases eligible for evaluation again. The coordinator waits for Trama-tracked scans and Runs across project windows; external agent scans are not part of that barrier. A window that takes over the coordination waits for a new scan's end or an explicit Resolve Drifts request before it resumes; owning the role alone resumes nothing.

This is a two-step workflow: the resolution agent submits a restricted automatic resolution Draft, and the host rechecks it and uses ordinary approval checks. Only after approval and normal resolution-agent completion may the host launch a separate Run limited to that resolution's fix Tasks and their incomplete origins. When the Drifts need several resolutions, the agent submits them as a chain (each one `requires` the earlier ones), and the host approves each one in dependency order as it is submitted; a Draft or open resolution outside that collection still blocks approval. Neither choosing a Fix nor submitting a resolution is approval or code execution. The agent must not approve or implement from the resolution workflow.

Every Run, scan or resolution first reserves its project with the editor coordinator, and gives the reservation back whether its send started or not. While a reservation is open, no other send of the project starts and no automatic step starts. A reservation is not a running job.

Manual Resolve Drifts keeps its question round and hands over a resolution for developer review. In `enabled`, critical cases and exceptions remain manual; in `yolo`, critical cases may be delegated, but missing/inapplicable options remain manual. A button request may ask for manual handling of exceptions; it does not make them automatic. Failed cases stay excluded until a successful developer-started scan, a Drift edit, or another explicit Resolve Drifts request; the Board links each failure to its Drift or Task. There is no additional cycle, time or spending limit: subsequent scans can start further cycles until the developer disables delegation or interrupts work.

Resolve on one Drift (its card in the Board) takes only that Drift: a manual round or resolution names only it, and an automatic collection, when the delegation allows it, names only it too. A refused start keeps that scope until it really starts, so no other open Drift is taken with it.
## Announcements

Announcing a card before the agent creates it makes the Board show a ghost of it meanwhile.

| Command | Effect |
|---|---|
| `trama announcement new` with `{ kind: proposal\|task\|drift, title }` | Announces a card the agent is about to create, as soon as it knows it will. Prints the announcement ID, six letters and digits. Not developer-only: the agent runs it. Writes a temporary file under `.trama/announcements/` (see the file format). When `TRAMA_TERMINAL` holds a terminal ID (the extension sets it in every agent terminal it starts), the announcement belongs to that terminal; without it, or with a value that is not six lowercase letters and digits, it belongs to none, and with `CURSOR_AGENT=1` it carries `chat: cursor` (made by Cursor's chat agent). |
| `trama announcement new` with `{ kind: check, title, phase: verifying\|scanning, job? }` | Annuncia un controllo: non una scheda, ma il lavoro che l'agente fa ancora quando nessuna scheda lo mostra (la verifica finale di una corsa, o una scansione). Stampa l'ID come gli altri annunci e copia `terminal` o `chat` allo stesso modo. `phase` è obbligatorio per `check` e rifiutato per gli altri tipi; `job` lega facoltativamente il controllo al lavoro coordinato che lo ha avviato. Il ghost sta in In progress. |
| `trama announcement move <id> scanning\|history` | Passa un controllo da Verifying a Scanning, o da Verifying o Scanning a History, quando parte lo scan o la scrittura della History. Su un controllo già nella fase richiesta non cambia nulla e lo dice. Non si torna indietro: un passaggio all'indietro è rifiutato senza modifiche. |
| `trama announcement move <id> delivered\|failed` | Consegna il controllo e rimuove il ghost. Con `delivered` comunica al coordinatore l'esito riuscito, con `failed` l'esito fallito. |

Un ID sconosciuto, già consegnato o ritirato, o che non è un controllo, non è un errore per `announcement move`: l'uscita dice che il controllo non è stato trovato e il comando finisce con successo, senza comunicare un esito riuscito. Annunciare un controllo e cambiarne la fase non riavviano nulla: non c'è quiete che li conti come attività. Nessuno dei comandi è riservato al developer.

The `announcement` field of `proposal new`, `task new` and `drift new` names an announcement: when the card is created, the announcement it names is delivered and the ghost gives way to the real card. A `proposal new` with no `announcement` takes over the oldest announcement that Trama made for a design request and that no Draft has taken yet, only if it belongs to the terminal in `TRAMA_TERMINAL`, never to another terminal; with none waiting it makes an announcement of its own, so the Board shows its Draft, and that one belongs to the terminal in `TRAMA_TERMINAL`, if any. An ID that is unknown, already delivered or withdrawn, of another kind, or already bound to a Draft never prevents the card from being created; the output adds a note saying so. `proposal move <id> open` delivers the announcement bound to the Draft only when it succeeds; `proposal move <id> discarded` withdraws it with no notice.

Una Proposal creata con `announcement` non utilizzabile resta senza ghost: non prende un'altra richiesta in attesa e non crea un annuncio automatico. Questi percorsi automatici si applicano solo quando `announcement` è assente.

L’estensione sincronizza ogni volta che il pannello si aggiorna soltanto l’H1 degli annunci Writing già associati a una Draft leggibile, anche dopo modifiche dirette al titolo e durante un round di domande. Conserva tutti i metadati, incluso `touched`, e non riscrive un titolo già coincidente né ricrea annunci ritirati o consegnati.

The extension announces each agent launch itself, except a Run, as soon as its instruction is really sent: a design or Resolve Drifts announces the Proposal the agent will create (an automatic collection names the Drifts it gathered, and its Proposal is titled `Resolve Drifts`), a scan announces its check in Scanning, and an import announces the work itself. In a terminal the announcement belongs to that terminal; in an editor chat it belongs to the chat of the project. An instruction that waits for the developer's Enter or lands on the clipboard announces nothing. When the agent's turn ends (idle hook, end of the command Trama typed, closing of the terminal, or the end, interruption or closing of a Trama conversation in the chat), the Proposals and Drifts it delivered or filed are released, so their buttons in the Board become available again.

Only the extension withdraws announcements the agent never delivered, and each terminal only its own: the command Trama typed into an agent terminal ending (recognised by the command line the editor reports for it, compared after trimming; any other command, or an end reported without that line, withdraws nothing), that terminal closing, or its agent going idle (`hook idle`) withdraws the announcements that belong to it. An announcement made by the editor's chat is withdrawn, with notice, when a Trama conversation of the project ends its turn (`AGENT_STOPPED`) or is interrupted (`AGENT_INTERRUPTED`), and without notice when it is closed (`CONVERSATION_CLOSED`). At startup the extension withdraws every announcement left on disk, with no notice; the Tasks still marked as taken stay taken until their agent's end releases them or the developer runs `task move <id> doing`. There is no timer: no elapsed time and no quiet period withdraws an announcement, and read-only commands do not count as activity. The command line alone never withdraws any.

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

- **Completed:** `status: "answered"` and `answers` keyed by question ID. Each entry is `{status: "answered", selected: [...]}` with original option labels and optional `text`, or `{status: "skipped"}`. A multiple-choice answer may combine selected options and free text. Recommendation markers never appear in returned labels.
- **Initially unavailable:** `status: "unavailable"` and a `reason`. No answers are supplied, and the agent does not ask in any other way: it stops, opens no Proposal, and tells the developer to open the project in the editor with Trama. Outside Cursor's sandbox the reason is `Editor not available for this project. Do not ask in any other way: stop, tell the developer to open the project in the editor with Trama, and run the same trama question new again when they say to continue.`. Inside Cursor's sandbox (`CURSOR_SANDBOX` set) it is `Editor not reachable from Cursor's sandbox. Run the same trama question new once more outside the sandbox; if the editor is still unavailable, stop and tell the developer to open the project in the editor with Trama.`: the agent runs the same command once more outside the sandbox, asking Cursor for permission, and stops the same way if it is unavailable there too. In Cursor's Linux sandbox the editor's discovery records are found under the real user ID taken from `CURSOR_ORIG_UID`.
- **Invalid request:** `error.code: "invalid-input"` with the offending field identified in `error.message`; correct the request rather than using fallback answers.
- **Editor lost after submission:** `error.code: "editor-interrupted"` with no answers. Stop the current workflow: no partial answers, recommendations, fallback, retry, rerouting or resumption. This is not initial unavailability.
- **Caller cancellation:** abandons only that caller's round. On Linux and macOS, SIGINT or SIGTERM cancels CLI waiting. On Windows, SIGTERM never reaches the process: cancel with Ctrl+C (SIGINT), or by closing the command's output or connection. A process killed without warning counts as a disconnection as soon as the editor sees its pipe close. Any of these abandons the round.

Completed and initially unavailable results exit `0`; question failures and cancellation exit `1`; malformed requests exit `2`.

Questions open immediately in an overlay inside the editor's Trama panel, one question at a time with an index of the round. Back and the index keep what was entered; free text goes in `Your answer (optional)`; Skip skips one question, and Skip all (also behind Close) asks for confirmation and delivers at once. Otherwise the round is delivered from its summary with Send to agent, once every question is answered or skipped. Esc does nothing. Skips contain no invented answer: the agent applies its recommendation and lists the skipped decisions for review. The exception is `trama-resolve-drifts`: for a skipped question it applies no recommendation, leaves that Drift out of the resolution (it stays open) and says so in its report. There is no response deadline.

Each window owns one FIFO shared by every `trama question new` caller. Cancelling one caller does not cancel another; losing the editor interrupts both its active and queued rounds. Other windows remain independent. The endpoint in `TRAMA_QUESTION_ENDPOINT`, set by Trama in launched agent terminals, is authoritative, and its window secret is still read from that endpoint's discovery record; otherwise discovery selects the most recently focused live window for the selected project. Requests are sent to only that window; any other project is refused.

Eseguito dalla shell dell'agente chat di Cursor (`CURSOR_AGENT=1`), `trama question new` raggiunge la finestra del progetto attiva più di recente e presenta il round nel normale overlay locale, senza dipendere dagli hook della conversazione.

Routing uses private user-local sockets on Unix and a Node named pipe (`\\.\pipe\trama-question-<uuid>`) on Windows, with no PowerShell helper. Windows relies on the default permissions of `%LOCALAPPDATA%\Trama\questions` and does not check them; on Linux and macOS the socket and the record folder keep their private modes and checks. Discovery records live outside the repository and contain the project and window identities, the endpoint, focus recency and the window's random secret. Every request to an editor carries the secret of the record the editor was reached by, on every platform; a request without the right secret gets no answer and its connection closes. Questions and incomplete answers remain in memory, never in `.trama/` or discovery files.

## Cursor hooks

`trama hook cursor` is run by Cursor's `beforeSubmitPrompt`, `stop`, `sessionEnd` and `afterShellExecution` hooks, not by people or agents. The last one runs only for shell command lines that contain `trama` (the hooks file gives it `"matcher": "trama"`). It reads the JSON Cursor passes on stdin, takes the project from the first folder of `workspace_roots` that holds `.trama/model/system.md`, and hands every live editor window of that project, found through the same discovery records as `trama question new`, the hook name, the conversation ID, the project folder and, for `stop` and `sessionEnd`, Cursor's `status` or `reason`. Each window is contacted on its own, so a slow or silent window holds back none of the others. Of the prompt it passes only whether it starts with `Use the trama-` or `/trama-`, never its text. Of a shell command it passes only whether the line runs a Trama command that registers the agent's work (`announcement new`, `announcement move`, `comparison new`, `proposal new`, `task move <id> doing` or `question new`, the program named as a bare `trama`, as a path ending in `/trama` or `\trama.exe`, quoted or not); reads such as `task list` or `model list` do not count, and the command and its output are never passed. It waits at most one second for `beforeSubmitPrompt` and at most five seconds for the other hooks, writes nothing to disk, prints only `{"continue": true}` for `beforeSubmitPrompt` and `{}` otherwise, and exits with `0` in every case, also without an editor, without a Trama project or with invalid input.

The editor follows a conversation from its first prompt naming a Trama skill, or from its first shell command that registers the agent's work, whoever wrote it, and turns its hooks into the `cursor-chat` Events: every later prompt is `PROMPT_SUBMITTED`; `stop` with `completed` is `AGENT_STOPPED`, with `aborted` or `error` `AGENT_INTERRUPTED`; `sessionEnd` with `window_close` or `user_close` is `CONVERSATION_CLOSED` and ends the following, other reasons produce nothing. A shell command produces no Event of its own. Other conversations are ignored. The list lives only in the editor's memory and is lost when it restarts.

## Copilot hooks

`trama hook copilot` is run by VS Code's `UserPromptSubmit` and `Stop` hooks. It reads the hook JSON from stdin, uses `cwd` when it contains `.trama/model/system.md`, and hands the editor found through `trama question new`'s local discovery the hook name, session ID, project folder and only whether a prompt starts with `Use the trama-` or `/trama-`. It does not pass prompt text, waits at most one second, prints `{}` and exits `0` even without an editor, project or valid input.

The editor identifies a conversation on its first Trama prompt and treats every subsequent prompt as `PROMPT_SUBMITTED`; `Stop` emits `AGENT_STOPPED` only for an identified conversation in that same project. The editor keeps this recognition in memory. Copilot chat commands do not identify themselves as agent commands, so this hook releases originless Tasks at turn end but does not mark Tasks taken.

## Agent hooks

`trama hook idle [--root <dir>]` is run by the hook Trama makes omp load (`--hook`, see `extension/src/omp/trama-hook.ts`) when omp's main session settles (`session_stop`) or ends (`session_shutdown`), not by people. It takes the terminal's identity from `TRAMA_TERMINAL`, finds the editor of the project as `trama question new` does and tells it that the agent of that terminal is idle: the editor then ends the run, releases the Tasks that terminal had taken and withdraws its announcements. It waits at most one second, writes nothing to disk and exits with `0` also without an editor, a project or `TRAMA_TERMINAL`; only a wrong use exits with `2`.

In the same terminals, `trama hook claude-question-tool` is run by the `PreToolUse` hook Trama makes Claude Code load for its `AskUserQuestion` tool, and omp refuses its `ask` tool in-process (`tool_call`). Both refuse the agent's own question tool with the shared refusal (`trama question new` instead), in every session, main and sub-agents, without contacting the editor: `claude-question-tool` reads nothing, writes one `hookSpecificOutput` JSON object with `permissionDecision: "deny"` to standard output and exits with `0`. Outside Trama's terminals no hook is installed, so nothing is refused.

