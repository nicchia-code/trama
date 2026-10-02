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
status: open            # open | approved | rejected
kind: import            # optional: import (written by trama-import); absent means an ordinary change
requires:               # optional: open or approved Proposals this one is written on top of
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
Written by the developer on rejection.
```

- Next to `proposal.md`, a `model/` folder holds the **full new version** of every touched Model file, at the same path it has under `.trama/model/`, and a `requirements/` folder does the same for touched Areas.
- **Requires**: a Proposal that lists `requires` is written, diffed and validated on top of the open Proposals it requires, directly or through them, applied in order. Its `base` hashes refer to that state, so approving a required Proposal does not make it stale. It cannot be approved while any required Proposal is open, rejected or missing, or while two Proposals require each other; a rejected requirement leaves it open and blocked. `trama proposal new` refuses to require a rejected Proposal.
- A Proposal is **stale** when any file's current hash (on top of the Proposals it requires) differs from its `base` entry. Staleness is computed, never stored. A stale Proposal cannot be approved; the agent writes a new one.
- **Approving** checks that every required Proposal is approved and that the Proposal is not stale, validates the Model and its Requirements with the Proposal applied, copies the new files into `model/` and `requirements/`, removes the `delete` entries, sets `status: approved` and regenerates the `trama-req-*` skills. The extension scans the affected Features afterwards, except for `kind: import` Proposals, whose Model already matches the code (ADR 0008).
- **Rejecting** sets `status: rejected` and appends `## Feedback`. The agent answers with a new Proposal.
- Approved and rejected Proposals stay on disk as history.

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
---
# Refund cancelled orders once preparation has started

What to do, in prose.
```

- A Task that is not technical references at least one Model element in `refs`, and may add Requirements. A Technical Task references no Model element; it may reference Requirements (for example `requirements/ui#General` for adopting a theme).
- The board's **To decide** column is not a Task column: it shows open Proposals and open Drifts.

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
---
# Code refunds orders after shipping

What the code does, what the Model says, and where in the code this was found.
```

A Drift is not part of the Model, so its prose may mention code paths.

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
