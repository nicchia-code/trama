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
    ui.md                      # one file per Area of Requirements
  proposals/
    0007-refunds/
      proposal.md
      model/checkout/order.md  # full new version of every touched file
      requirements/ui.md
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
| Requirement file not at `requirements/<area>.md` with a kebab-case Area name |
| Requirement Area without a `description` or an H1; a section title that is not `General` or a reference to an existing element; a duplicate section |

`trama analyze` reports **warnings**, not errors:
- States unreachable from the initial State;
- non-final States with no way out, including Transitions inherited from their parents;
- Events that nobody receives.

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
  requirements/ui.md: 9b1c…  # Requirement Areas are touched the same way
  checkout/refund.md: new
delete:
  - checkout/legacy.md
---
# Refunds

Why this change is needed, in prose.

## Feedback
Written by the developer on rejection, only when they gave some.
```

- Next to `proposal.md`, a `model/` folder holds the **full new version** of every touched Model file, at the same path it has under `.trama/model/`, and a `requirements/` folder does the same for touched Areas.
- **Draft and open**: a new Proposal is a `draft` while the agent writes it. The developer cannot approve or reject it and the Board does not count it as awaiting a decision; the agent hands it over, which makes it `open`. A Proposal file without `status` is `open`.
- **Submitting** checks the Model and Requirements with the Proposal applied, including required Proposals, and refuses every validation error or unregistered file without leaving Draft. Staleness and waiting for required approvals do not prevent submission. Only a Draft can be submitted.
- **Editing after submission**: register the file before each change. Registering, rewriting or marking a file for deletion returns an open Proposal to Draft, even if the content ends up unchanged; submit again when finished.
- **Requires**: a Proposal that lists `requires` is written, diffed and validated on top of the draft and open Proposals it requires, directly or through them, applied in order. Its `base` hashes refer to that state, so approving a required Proposal does not make it stale. It cannot be approved while any required Proposal is a draft, open, rejected, discarded or missing, or while two Proposals require each other; a rejected or discarded requirement leaves it blocked. `trama proposal new` refuses to require a rejected or discarded Proposal.
- A Proposal is **stale** when any file's current hash (on top of the Proposals it requires) differs from its `base` entry. Staleness is computed, never stored. A stale Proposal cannot be approved; the agent writes a new one.
- **Approving** checks that every required Proposal is approved and that the Proposal is not stale, validates the Model and its Requirements with the Proposal applied, copies the new files into `model/` and `requirements/`, removes the `delete` entries, sets `status: approved` and regenerates the `trama-req-*` skills. The extension scans the affected Features afterwards, except for `kind: import` Proposals, whose Model already matches the code (ADR 0008).
- **Rejecting** sets `status: rejected` and appends `## Feedback` when the developer gave feedback; it is optional, and an empty or blank one adds nothing. The agent answers with a new Proposal.
- **Discarding** a draft the agent never finished sets `status: discarded`; no feedback is written. Only drafts can be discarded.
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
| Requirement section | `requirements/ui#order/Paid`, `requirements/ui#General` |

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
---
# Refund cancelled orders once preparation has started

What to do, in prose.
```

- A Task that is not technical references at least one Model element in `refs`, and may add Requirements. A Technical Task references no Model element; it may reference Requirements (for example `requirements/ui#General` for adopting a theme).
- The board's **To decide** column is not a Task column: it shows open Proposals (never drafts) and open Drifts.
- `proposal` is set when the agent files the Task after that Proposal was approved (the Scan is told which Proposal). It must name an existing Proposal, in any status. Tasks written before the field existed, Tasks of a Scan started by hand, Technical Tasks and Tasks that fix a Drift carry none.
- `agent` is `true` while the agent has taken the Task: it takes it by moving it to `doing` with its tools, or with `trama task move` in the terminal Trama started (`TRAMA_AGENT` set). While it is taken the developer cannot move it; `trama task take-back`, the Take back button, or the end of the agent terminal's command clears the mark and leaves the Task in `doing`. Tasks written before the field existed are free.
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

Optional: the files where the difference was seen.
```

The body is Markdown. The first two sections come in this order and both need text; a Drift cannot be filed without them. `## Fix options` follows with from two to five options, each a `###` heading with its title and then its text; the first is the agent's recommendation, titles differ, and a new Drift cannot be filed without them. `## Where in the code` comes last, is optional, but needs text when present. Drifts written before options existed have no `## Fix options`: their code is fixed without choosing an option, and `option` and `note` stay empty. Drifts resolved before the sections existed keep a free body and are shown as one block. `resolution: dismissed` means the developer kept the code and no Proposal was attached.

A Drift is not part of the Model, so it may name code, but only where it helps. The two sides are written for a programmer reading at a glance, not as a code review: behaviour in domain words, no variable, function, class, field or file names unless the difference cannot be understood without them (then one or two, as inline code), short paragraphs, a bulleted list for several points, bold for the key terms, no headings or tables, about 100 words per side. Files and code elements go in `## Where in the code`, with no line numbers. Nothing refuses a Drift for its style. The Task created when the code is fixed carries both sides, the chosen option with its title and text, the developer's note when given, and the Where in the code section. Fixing the code of a Drift that has options needs the number of one of them; the number goes into `option`, counted from 1 in the order the options are written, and the note into `note`. A Drift without options accepts no `option`, and a note is accepted in both cases; keeping what happens (accepting the Proposal or dismissing) takes neither.

- `origin` is the Task the agent was implementing when it filed the Drift (`drift new --task`). It must name an existing Task. A Drift filed by a Scan has none, and Drifts written before the field existed have none.
- Whether a Task is **blocked** is never stored: it is worked out from the Drifts, the Tasks and their `refs` whenever it is asked. An open Drift blocks its origin Task and every Task that is not Done and concerns the same thing, that is, when a reference of one is the same as, or inside, a reference of the other (a Machine contains its States and Transitions, a Feature its Machines; a Requirement section of an element counts as that element; the General section of an Area only equals itself). A Drift resolved as `fix-code` leaves its origin Task, if not Done, waiting for the fix Task (the Drift's `task`) until that Task is Done. A Done Task is never blocked.
- The agent cannot move a blocked Task to `doing`; the developer can move it, and a blocked Task already in `doing` stays there.

## Announcement

`announcements/<id>.md`: a card the agent is about to create, kept only so the Board can show a ghost of it. It is temporary, not project information: nothing decides on it, it is not counted among what awaits a decision, and it ceases to exist as soon as the card arrives or the agent's work is over without it.

```markdown
---
kind: proposal          # proposal | task | drift
source: agent           # agent | request (announced by Trama when a design request was sent)
proposal: "0021"        # the Draft bound to it; absent until the Draft exists
terminal: ab12cd        # the agent terminal it belongs to; none when there is none
created: 2026-01-01T12:00:00.000Z
touched: 2026-01-01T12:03:10.000Z
---
# Refunds after shipping
```

- The ID is the file name: six random lowercase letters and digits. `created` orders the ghosts as they were announced and is always later than the previous announcement's; `touched` is when the agent last did something about an announced card.
- The title is the H1. Once a Draft is bound to it, the ghost shows the Draft's own title instead.
- An announcement with no Draft is **Preparing**, with one it is **Writing**; both are shown as ghosts. A file that cannot be read is skipped, not reported.
- `terminal` is the ID (six lowercase letters and digits) the extension gives each agent terminal it starts, in the `TRAMA_TERMINAL` environment variable. Only that terminal's command ending or closing withdraws the announcement; without a terminal (announced from the chat or by an agent Trama did not start, or written before the field existed, which has no `terminal` line) only the quiet period and the editor starting up do.
- The folder holds a `.gitignore` that ignores everything in it, written with the first announcement, so announcements are never versioned.

## Requirements

`requirements/<area>.md`: how the System must be built, beside the Model (ADR 0007). `trama init` creates five empty Areas: `ui`, `tech`, `quality`, `data` and `rules`. Add, split or delete Areas freely.

```markdown
---
description: Use when building or changing screens, layout, styling or texts.
---
# Interface

Prose here applies to the whole Area.

## General
- Material 3, light and dark theme following the system.

## checkout
- Every checkout screen shows the cart total at the bottom.

## order/Paid
- A green "Paid" badge next to the order number.
```

- `description` (required) says when an agent needs this Area. It becomes the description of the generated skill.
- `## General` applies everywhere. Any other `##` is titled with exactly one element reference and applies to that element and everything inside it: a Feature's sections to its Machines, a Machine's to its States, a State's to its sub-States. Content under a section is free Markdown.
- Requirements change like the Model: an agent writes them only through a Proposal; the developer may also edit the files directly.
- Trama writes one skill per Area that has content, `trama-req-<area>/SKILL.md`, into every skill folder holding Trama's skills (`.agents/skills`, `.claude/skills`, `.github/skills`, or the configured one). The skills are generated: commit them, never edit them. They are rewritten after an approval, by `trama skills update`, and by the extension whenever an Area file changes; Areas emptied or deleted lose their skill.

## Numbering

Proposals, Tasks and Drifts each have their own sequence: `NNNN` is the kind's highest existing number plus one, zero-padded to four digits.
