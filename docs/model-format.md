# Model file format

Everything Trama stores lives in `.trama/` at the root of the user's repository, as plain Markdown files versioned with git. Requirements are described at the end of this file.

```
.trama/
  model/
    system.md                  # the System
    actors/
      user.md                  # one file per Actor
    checkout/                  # one folder per Feature
      feature.md
      order.md                 # one file per Machine
      payment.md
  requirements/
    ui/                        # one folder per Area of Requirements
      area.md                  # the Area's description, title and introduction
      main.md                  # fragments: the Area's sections
  proposals/
    0007-refunds/
      proposal.md
      model/checkout/order.md  # full new version of every touched file
      requirements/ui/main.md
  tasks/
    0012-cancel-refund.md
  drifts/
    0003-refund-after-shipping.md
```

## IDs

- A **Feature ID** is its folder name. A **Machine ID** and an **Actor ID** are file names without `.md`.
- All three kinds share **one namespace across the System**: `checkout` cannot be both a Feature and a Machine. Moving a Machine to another Feature therefore breaks no reference.
- IDs are kebab-case: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`.
- `system.md`, `feature.md` and `actors/` are reserved names.
- Windows reserves some device names (`con`, `prn`, `aux`, `nul`, `com1` to `com9`, `lpt1` to `lpt9`): they are refused as IDs on every platform, so the project opens anywhere. A name that only contains one of them (`console`, `com-port`) is valid.
- Features cannot be nested: a Machine file lives exactly one level below `model/`.

The list of Features and of their Machines comes from the folder structure and is never repeated inside a file, so the two can never disagree.

## `system.md` and `feature.md`

An H1 with the display name, then free prose.

```markdown
# Shop

An online shop selling printed books to private customers.
```

## Actor file

```markdown
# User

A person browsing and buying from the shop.

## Events

### CANCEL
The user asks to cancel an order.
```

The only H2 allowed is `## Events`. An Actor has no States and no Transitions: it only emits. Nothing in the Model points *to* an Actor; what happens outside the System after a Machine's Event is prose in that Event's description.

## Machine file

```markdown
# Order

An order placed by a customer, from composition to delivery.

## States

### Draft (initial)
The customer is still choosing what to buy.
- `cart.CONFIRM` → Awaiting payment: only if the cart is not empty.

### Awaiting payment
- `payment.SUCCEEDED` → Paid
- `payment.DECLINED` → Cancelled: tells the customer by email.

### Paid
- `user.CANCEL` → Cancelled: only if nothing has been prepared yet; refunds the customer.
- `user.CANCEL` → Refunding: once preparation has started.

#### Preparing (initial)
- `warehouse.PACKAGE_READY` → Ready to ship

#### Ready to ship
- `courier.PICKED_UP` → Shipped

### Refunding
- `payment.REFUNDED` → Cancelled

### Shipped (final)

### Cancelled (final)

## Events

### CONFIRMED
Emitted when the order leaves Draft.
```

### Structure

- Exactly one H1: the Machine's display name. Prose between the H1 and the first H2 is the Machine's description.
- The only H2s allowed are `## States` (required) and `## Events` (optional), in that order.
- Under `## States`, an H3 is a top-level State. Deeper headings (H4 to H6) are sub-States of the nearest shallower State heading. Heading levels cannot be skipped. This gives at most four levels of States.

### States

- The heading text is the State's name, optionally followed by one marker: `(initial)` or `(final)`.
- State names are unique within a Machine, compared case-insensitively. They cannot contain `/`, `:`, `(`, `)`, `→` or a backtick.
- Every level that has States (the Machine's top level, and the children of every State that has sub-States) has **exactly one** `(initial)` State.
- A `(final)` State has no sub-States and no outgoing Transitions. A Machine may have none.
- Prose under a State heading, up to its first Transition or sub-State, is the State's description.

### Transitions

A list item directly under a State (before any sub-State heading) that **starts with a backtick code span** is a Transition. Any other list item is prose.

```
- `<event-ref>` → <Target State>[: <prose>]
```

- `<event-ref>` is `<owner>.<EVENT>`, where `<owner>` is a Machine or Actor ID. Write the bare `<EVENT>` for an Event owned by the same Machine.
- `->` is accepted as an alternative to `→`; `→` is the standard form.
- `<Target State>` names a State of the same Machine, at any depth.
- The prose after `:` holds the condition and the consequence in free text, with no variables. It may continue on indented lines.
- The same Event may appear on several Transitions from the same State; their prose tells them apart. The order in which they are written has no meaning.
- A Transition on a State with sub-States applies to all of its sub-States. Entering a State with sub-States enters its `(initial)` sub-State, recursively.
- There are no Transitions without an Event. Timers are Events of a `time` Actor.

### Events

- Under `## Events`, each H3 is an Event the Machine emits. The prose says when it is emitted.
- Event names are `UPPER_SNAKE_CASE` and unique within their owner.

## Validation

`trama validate` reports these as errors. It checks only the internal consistency of the Model and its Requirements, never code (ADR 0002).

| Rule |
|---|
| Invalid or duplicate ID across Features, Machines and Actors |
| Machine file not directly inside a Feature folder |
| Missing H1, more than one H1, unknown or misordered H2, skipped heading level |
| Machine without `## States` or with no States |
| Duplicate State name within a Machine; forbidden character in a State name |
| Not exactly one `(initial)` State per level |
| `(final)` State with sub-States or outgoing Transitions |
| Malformed Transition list item |
| Transition to an unknown State |
| Event reference to an unknown owner, or to an Event the owner does not declare |
| Event name not `UPPER_SNAKE_CASE`, or duplicated within its owner |
| A `.md` file directly in `requirements/` (run `trama skills update` to convert it), an Area folder that is not kebab-case or holds subfolders or other files, an Area without `area.md` |
| `area.md` without a `description` or an H1, or with `##` sections; a fragment whose name is not kebab-case, without a `description` or an H1, or with prose before its first section |
| A section title that is not `General` or a reference to an existing element; a section that appears twice in the same Area, in one fragment or in two |

`trama validate` also prints **warnings**, apart from the errors; they never change the exit code nor prevent a hand-over: a fragment larger than 12 KB (12,288 bytes of the file, front matter included), with its path and size, and, with `--proposal`, the switch of the Requirement skills between fragment mode and index mode that the Proposal would cause. `trama proposal submit` prints the same warnings.

`trama analyze` reports **warnings**, not errors:
- States unreachable from the initial State;
- non-final States with no way out, including Transitions inherited from their parents;
- Events that nobody receives;
- Requirement fragments larger than 12 KB, with path and size.

## Proposal

`proposals/<NNNN-slug>/proposal.md`:

```markdown
---
status: draft           # draft | open | approved | rejected | discarded; absent means open
kind: import            # optional: import (written by trama-import); absent means an ordinary change
requires:               # optional: draft, open or approved Proposals this one is written on top of
  - "0006"
base:
  checkout/order.md: 3f2a…   # sha256 of the file when the Proposal first touched it
  requirements/ui/main.md: 9b1c…  # Requirement files are touched the same way
  checkout/refund.md: new
delete:
  - checkout/legacy.md
request: 2026-10-04T19-05-12 # optional: the written design request it was born from; kept after the request is consumed
scanScope: # history only: written by Trama before scope became live, in approved Proposals; never written now
  - ref: order/Paid
    reason: changed # or "removed, its container", or "leads into a change"
  - ref: order/Awaiting payment/payment.SUCCEEDED
    reason: leads into a change
---
# Refunds

Why this change is needed, in prose.

## Feedback
Written by the developer on rejection, only when they gave some.
```

- Next to `proposal.md`, a `model/` folder holds the **full new version** of every touched Model file, at the same path it has under `.trama/model/`, and a `requirements/` folder does the same for touched Requirement files, at `requirements/<area>/area.md` and `requirements/<area>/<fragment>.md`. Applying it writes new fragments and deletes those marked for deletion; validation sees the whole Area, the changed fragments and those left as they are. `trama proposal show` labels each Requirement change with its Area and fragment.
- **Draft and open**: a new Proposal is a `draft` while the agent writes it. The developer cannot approve or reject it and the Board does not count it as awaiting a decision; the agent hands it over, which makes it `open`. A Proposal file without `status` is `open`.
- **Submitting** checks the Model and Requirements with the Proposal applied, including required Proposals, and refuses every validation error or unregistered file without leaving Draft. Staleness and waiting for required approvals do not prevent submission. Only a Draft can be submitted.
- **Editing after submission**: register the file before each change. Registering, rewriting or marking a file for deletion returns an open Proposal to Draft, even if the content ends up unchanged; submit again when finished.
- **Requires**: a Proposal that lists `requires` is written, diffed and validated on top of the draft and open Proposals it requires, directly or through them, applied in order. Its `base` hashes refer to that state, so approving a required Proposal does not make it stale. It cannot be approved while any required Proposal is a draft, open, rejected, discarded or missing, or while two Proposals require each other; a rejected or discarded requirement leaves it blocked. `trama proposal new` refuses to require a rejected or discarded Proposal.
- A Proposal is **stale** when any file's current hash (on top of the Proposals it requires) differs from its `base` entry. Staleness is computed, never stored. A stale Proposal cannot be approved; the agent writes a new one.
- **Approving** checks that every required Proposal is approved and that the Proposal is not stale, validates the Model and its Requirements with the Proposal applied, copies the new files into `model/` and `requirements/`, removes the `delete` entries, sets `status: approved` and regenerates the `trama-req-*` skills. It saves no scan scope: an ordinary Proposal's scope is computed from the Model and Requirements before and after it, whenever it is needed (`proposal show`, validation, hand-over, approval).
- **Rejecting** sets `status: rejected` and appends `## Feedback` when the developer gave feedback; it is optional, and an empty or blank one adds nothing. The agent answers with a new Proposal.
- **Discarding** a draft the agent never finished sets `status: discarded`; no feedback is written. Only drafts can be discarded.
- **Bound to a written design request**: `request` names the request the agent opened the Proposal for (`trama proposal new --request <id>`); only the first Proposal of a design is bound. Handing it over deletes the request file. Proposals written before the field existed have none.
- **Scan scope**: `scanScope` lists what a targeted scan compares with the code, worked out live from the Model and Requirements before and after the Proposal, for an ordinary Proposal not yet approved: every State, Transition and Event added or changed, with what it contains; the changed description of a Machine, Feature or Actor, alone; every Requirement section added or changed, compared by Area and reference whatever fragment holds it; a new Machine whole; an element removed as its nearest container that still exists; and the Transitions of any Machine that enter those elements or react to a changed Event. The System description and fragment titles and descriptions add nothing. It is never stored. Approved Proposals written before this change keep their saved list as history; imports and resolutions have none.
- Approved, rejected and discarded Proposals stay on disk as history.

## Element references

Tasks, Drifts and the CLI point to parts of the Model with one syntax:

| Element | Reference |
|---|---|
| Feature, Machine, Actor | `checkout`, `order`, `user` |
| State | `order/Paid`, `order/Awaiting payment` |
| Transition | `order/Paid/user.CANCEL` (every Transition from Paid on that Event) |
| Event | `user.CANCEL` |
| Requirement Area | `requirements/ui` |
| Requirement section | `requirements/ui#order/Paid`, `requirements/ui#General` (the fragment is never named: a section is unique in its Area) |

## Task

`tasks/<NNNN-slug>.md`:

```markdown
---
column: todo            # todo | doing | done
technical: false
refs:
  - order/Paid/user.CANCEL
  - order/Refunding
drift: "0003"           # optional: the Drift this Task resolves
proposal: "0007"        # optional: the Proposal (the design) this Task comes from
agent: false            # true while the agent has taken the Task (default false)
finished: "2026-10-06T09:12:00.000Z"  # only in Done: when the Task arrived there (UTC)
---
# Refund cancelled orders once preparation has started

What to do, in prose.
```

- A Task that is not technical references at least one Model element in `refs`, and may add Requirements. A Technical Task references no Model element; it may reference Requirements (for example `requirements/ui#General` for adopting a theme).
- The board's **To decide** column is not a Task column: it shows open Proposals (never drafts) and open Drifts.
- `proposal` is set when the agent files the Task after that Proposal was approved (the Scan is told which Proposal). It must name an existing Proposal, in any status. Tasks written before the field existed, Tasks of a Scan started by hand, Technical Tasks and Tasks that fix a Drift carry none.
- `agent` is `false` when free, `true` when taken without a recognized holder, or a terminal ID / `cursor` when taken by a Trama-started terminal (`TRAMA_AGENT` set) or Cursor's chat (`CURSOR_AGENT=1`). `trama task take-back` clears the mark and leaves the Task in `doing`. When a terminal command ends, only Tasks held by that terminal are released; when a Cursor turn ends or its conversation closes, only Cursor-held Tasks are released. Ownerless Tasks are released by either event. Other origins are ownerless, and legacy `agent: editor` values are read as ownerless.
- `finished` is the UTC instant (ISO 8601) the Task arrived in Done from another column. A move from Done to Done keeps it; a move out of Done removes it, and arriving in Done again writes a new one. Tasks that reached Done before the field existed have none.
- The Tasks linked to one Proposal form a **design**. The Board shows a design of two or more Tasks as one card, closed at first, standing in the column its Tasks add up to: To do while all are in To do, Done when all are done, In progress in every other case. A design of one Task, and Tasks with no `proposal`, are plain cards.

## Drift

`drifts/<NNNN-slug>.md`:

```markdown
---
status: open            # open | resolved
resolution: null        # fix-code | proposal | dismissed
refs:
  - order/Shipped
proposal: "0008"        # optional: attached when the code handles a case the Model forgot
task: null              # set when resolved as fix-code
origin: "0012"          # optional: the Task the agent was implementing when it filed the Drift
option: null            # set when resolved as fix-code: the number, from 1, of the chosen fix option
note: null              # set when the developer wrote a note with that choice
---
# Code refunds orders after shipping

## What happens

What the code does today, in terms of behaviour.

## What should happen

What the Model or the Requirement says.

## Fix options

### The way the agent recommends

What changes in behaviour and what it costs.

### Another way

The same, for a different way to reach what should happen.

## Where in the code

Required for every new Drift, the developer's included: the files and code elements where the difference was seen, which the agent re-reads before filing.
```

The body is Markdown. The first two sections come in this order and both need text; a Drift cannot be filed without them. `## Fix options` follows with from two to five options, each a `###` heading with its title and then its text; the first is the agent's recommendation, titles differ, and a new Drift cannot be filed without them. `## Where in the code` comes last and needs text in every new Drift; Drifts written before it was required may lack it and stay as they are. Drifts written before options existed have no `## Fix options`: their code is fixed without choosing an option, and `option` and `note` stay empty. Drifts resolved before the sections existed keep a free body and are shown as one block. `resolution: dismissed` means the developer kept what happens: no Proposal was attached, or a fix Task was closed without changes (`task move … done --unchanged`), in which case `task` and the Task's `unchanged` note say so and the Drift is shown as dismissed by that Task.

A Drift is not part of the Model, so it may name code, but only where it helps. The two sides are written for a programmer reading at a glance, not as a code review: behaviour in domain words, no variable, function, class, field or file names unless the difference cannot be understood without them (then one or two, as inline code), short paragraphs, a bulleted list for several points, bold for the key terms, no headings or tables, about 100 words per side. Files and code elements go in `## Where in the code`, with no line numbers. Nothing refuses a Drift for its style. The Task created when the code is fixed carries both sides, the chosen option with its title and text, the developer's note when given, and the Where in the code section. Fixing the code of a Drift that has options needs the number of one of them; the number goes into `option`, counted from 1 in the order the options are written, and the note into `note`. A Drift without options accepts no `option`, and a note is accepted in both cases; keeping what happens (accepting the Proposal or dismissing) takes neither.

- `origin` is the Task the agent was implementing when it filed the Drift (`drift new --task`). It must name an existing Task. A Drift filed by a Scan has none, and Drifts written before the field existed have none.
- `previous` is the resolved Drift this one follows, which makes it recurring: the one named with `drift new --previous`, or else the Drift that the origin Task fixes. It must be resolved by fixing the code or with a Proposal, and it is written at creation and never changed. Absent when there is none, which includes Drifts written before the field existed.
- Whether a Task is **blocked** is never stored: it is worked out from the Drifts, the Tasks and their `refs` whenever it is asked. An open Drift blocks its origin Task and every Task that is not Done and concerns the same thing, that is, when a reference of one is the same as, or inside, a reference of the other (a Machine contains its States and Transitions, a Feature its Machines; a Requirement section of an element counts as that element; the General section of an Area only equals itself). A Drift resolved as `fix-code` leaves its origin Task, if not Done, waiting for the fix Task (the Drift's `task`) until that Task is Done. A Done Task is never blocked.
- The agent cannot move a blocked Task to `doing`; the developer can move it, and a blocked Task already in `doing` stays there.

## Announcement

`announcements/<id>.md`: a card the agent is about to create, kept only so the Board can show a ghost of it. It is temporary, not project information: nothing decides on it, it is not counted among what awaits a decision, and it ceases to exist as soon as the card arrives or the agent's work is over without it.

```markdown
---
kind: proposal          # proposal | task | drift
source: agent           # agent | request (announced by Trama for a design request or for Resolve Drifts)
proposal: "0021"        # the Draft bound to it; absent until the Draft exists
terminal: ab12cd        # the agent terminal it belongs to; none when there is none
chat: cursor            # only when Cursor's chat agent announced it; absent otherwise
created: 2026-01-01T12:00:00.000Z
touched: 2026-01-01T12:03:10.000Z
---
# Refunds after shipping
```

- The ID is the file name: six random lowercase letters and digits. `created` orders the ghosts as they were announced and is always later than the previous announcement's; `touched` records when it was announced or bound to a Draft, and for a check when its phase changes. It is not refreshed by later activity.
- The title is the H1. Once a Draft is bound to it, the ghost shows the Draft's own title instead.
- An announcement with no Draft is **Preparing**, with one it is **Writing**, or **Writing the Proposal** when it is a Drift's (the Draft is the Proposal attached to the Drift); all are shown as ghosts. A file that cannot be read is skipped, not reported.
- `terminal` is the ID (six random lowercase letters and digits) the extension gives each agent terminal it starts, in the `TRAMA_TERMINAL` environment variable. Only that terminal's command ending, closing, or idle hook withdraws its waiting announcements. Announcements without a terminal are withdrawn by the applicable editor-chat events or when the editor starts; elapsed time and read-only commands never withdraw them.
- `kind: check` is a check: it announces the final verification of a run or a scan, not a card. It also has `phase` (`verifying` or `scanning`), which is absent for other announcements, never has `proposal`, and always has `source: agent`. Its optional `job` identifies the coordinator job that started it; phase and job are carried through completion signals. Its ghost is in In progress; `trama announce done` delivers and removes it, with `--failed` reporting failure instead of success.
- `chat` is `cursor` when the announcement was made by Cursor's chat agent: the command ran with `CURSOR_AGENT=1` and without `TRAMA_TERMINAL`. It is written only then, so an announcement with `chat` has no `terminal`; announcements written before the field existed have no `chat` line and read as before. A Trama conversation in Cursor's chat for the project withdraws it when its turn is stopped or interrupted (with notice), or closed (without notice); a normally ended turn leaves it until the card arrives.
- The folder holds a `.gitignore` that ignores everything in it, written with the first announcement, so announcements are never versioned.

## Written design request

`requests/<id>.md`: a design request the developer writes in the editor. **Design…** creates it empty and the extension saves it while the developer writes; **Send to agent**, or closing its last tab, sends it to the agent. It is temporary, not project information: it lasts until the Proposal bound to it is handed over.

- The ID is the file name: the local date and time of creation with seconds, `YYYY-MM-DDTHH-MM-SS` (for example `2026-10-04T19-05-12`), with the suffix `-2`, `-3`, … up to the first free one when that file already exists.
- The file holds only the developer's Markdown, exactly as written: no front matter, and it may have no title. Its title, used only for the ghost of the terminal launcher, is the first level-one `#` heading outside code blocks, or else the first non-empty line.
- Which requests were sent is not in the file nor under `.trama/`: the extension keeps the sent IDs in its workspace state, which survives restarts, and drops an ID whose file is gone. A file whose ID is not in that list is still being written. A request is sent at most once; closing a request never sent with an empty text deletes it.
- The successful hand-over of the first Proposal bound to it (`request` in `proposal.md`) deletes it; a file deleted by hand is simply gone. Either way the extension closes its tab when it has no unsaved changes.
- Cancellare la richiesta prima della consegna, anche mentre il launcher prepara la chat o attende il comando dell'agente, annulla l'invio: non parte nessuna istruzione e l'ID non entra nello stato delle richieste inviate.
- The folder holds a `.gitignore` that ignores everything in it, written with the first request, so requests are never versioned.

## Requirements

`requirements/<area>/`: how the System must be built, beside the Model (ADR 0007). `trama init` creates five Areas, `ui`, `tech`, `quality`, `data` and `rules`, each a folder with only its `area.md`. Add, split or delete Areas freely.

`requirements/ui/area.md` says what is true of the whole Area:

```markdown
---
description: Use when building or changing screens, layout, styling or texts.
---
# Interface

Prose here applies to the whole Area.
```

Every other file of the folder is a **fragment**, here `requirements/ui/checkout.md`:

```markdown
---
description: Use when building the checkout and order screens.
---
# Checkout and orders

## General
- Material 3, light and dark theme following the system.

## checkout
- Every checkout screen shows the cart total at the bottom.

## order/Paid
- A green "Paid" badge next to the order number.
```

- `area.md` is required: a `description` saying when an agent needs this Area, an H1 with its title, optional prose, and no `##` sections.
- A fragment has a kebab-case name (`area` is reserved), a `description` saying when an agent needs it, an H1 with its title and no prose before its first section; then only sections. No subfolders in an Area.
- Area and fragment names are refused when they are Windows device names, as IDs are.
- `## General` applies everywhere. Any other `##` is titled with exactly one element reference and applies to that element and everything inside it: a Feature's sections to its Machines, a Machine's to its States, a State's to its sub-States. Content under a section is free Markdown. A section appears once in its Area, in one fragment.
- Requirements change like the Model: an agent writes them only through a Proposal; the developer may also edit the files directly. When a Proposal writes into a fragment that is or becomes larger than 12 KB, the agent splits it in the same Proposal, moving sections without changing their text.
- Trama writes the Requirement skills into every skill folder holding Trama's skills (`.agents/skills`, `.claude/skills`, `.github/skills`, or the configured one), in one of two modes, the same for every Area. The budget is the sum, over the fragments with at least one non-empty section, of the characters of `trama-req-<area>-<fragment>` and of the fragment's description. Up to 4,000 characters, **fragment mode**: one skill `trama-req-<area>-<fragment>` per fragment with content, with the fragment's description, the Area's introduction and the fragment's sections. Beyond, **index mode**: one skill `trama-req-<area>` per Area with content, with the Area's description, its introduction, its General section and the list of its fragments (title, description, section references, file); every fragment is a `<fragment>.md` file next to the index, without the General section. The skills are generated: commit them, never edit them. They are rewritten after an approval, by `trama skills update`, and by the extension whenever a file inside `requirements/` changes; every `trama-req-*` skill the current mode does not produce is removed. `trama skills update` reports the mode, the budget used out of 4,000 and any switch.
- Wherever Trama names a Requirement skill to load (`trama requirements`, a pointer to a whole Area), it names the one the current mode produces.

### Migrating from single-file Areas

Earlier versions wrote each Area as one file, `requirements/<area>.md`. Such a file is now a validation error. `trama skills update` (and **Trama: Update Agent Skills**) converts it before regenerating the skills: `requirements/<area>/area.md` gets the file's description, title and introduction, `requirements/<area>/main.md` the same description and title with every section in the same order and with the same text, and the old file is deleted. An Area with no non-empty section gets only `area.md`. When the folder `requirements/<area>/` already exists the file is left alone, and the report says so. References `requirements/<area>#<section>` in Tasks, Drifts and Proposals do not change.

## Numbering

Proposals, Tasks and Drifts each have their own sequence: `NNNN` is the kind's highest existing number plus one, zero-padded to four digits.
