# Model and Requirements file format (quick reference)

Model paths below are relative to `.trama/model/`; Requirement files are `requirements/<area>/area.md` and `requirements/<area>/<fragment>.md` (in `.trama/requirements/`). `trama validate --proposal <id>` checks all of this.

```
system.md              the System
actors/<actor>.md      one file per Actor (only emits Events)
<feature>/feature.md   one folder per Feature (no nesting)
<feature>/<machine>.md one file per Machine
requirements/<area>/area.md       one folder per Area of Requirements: its description, title and intro
requirements/<area>/<fragment>.md the Area's sections, split into fragments (no subfolders)
```

- IDs are file or folder names, kebab-case (`order`, `payment-gateway`). Features, Machines and Actors share **one namespace**; `system`, `feature`, `actors` and `requirements` are reserved.
- `system.md` and `feature.md`: an H1 with the display name, then prose.

## Actor

```markdown
# User

A person browsing and buying from the shop.

## Events

### CANCEL
The user asks to cancel an order.
```

## Machine

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

### Rules

- One H1. Then `## States` (required) and optionally `## Events`, in that order. No other H2.
- Under `## States`, `###` is a top-level State; `####` to `######` are sub-States of the nearest shallower State. Never skip a heading level.
- State heading: name, then optionally ONE marker, `(initial)` or `(final)`. Names are unique within the Machine (case-insensitive) and cannot contain `/ : ( ) →` or a backtick.
- Each level that has States (the Machine's top level, and the children of every State that has sub-States) has **exactly one** `(initial)`. A `(final)` State has no sub-States and no Transitions.
- A Transition is a list item **starting with a backtick code span** directly under a State: ``- `owner.EVENT` → Target State: prose``. `->` is accepted for `→`. Any other list item is prose.
- `owner` is a Machine or Actor ID; write the bare `EVENT` for an Event of the same Machine. The owner must declare that Event under its own `## Events`.
- The target is a State of the **same Machine**, at any depth. The prose after `:` holds condition and consequence, with no variables.
- The same Event may appear several times from one State with different targets; the prose tells them apart.
- A Transition on a State with sub-States applies to all its sub-States. Entering a State with sub-States enters its `(initial)` sub-State.
- No Transitions without an Event; timers are Events of a `time` Actor.
- Event names: `UPPER_SNAKE_CASE`, unique within their owner. Under `## Events`, each `###` is an Event the Machine emits; the prose says when.
- Actors have no States and no Transitions. Nothing in the Model points *to* an Actor; say in an Event's prose what the outside world does in response.

## Element references (for `--ref` and CLI arguments)

`checkout` (Feature), `order` (Machine), `user` (Actor), `order/Paid` (State, any depth), `order/Paid/user.CANCEL` (Transitions on that Event), `user.CANCEL` (Event).

## Requirements (`requirements/<area>/`)

An Area is a folder. `area.md` holds what is true of the whole Area, and no sections:

```markdown
---
description: Use when building or changing screens, layout, styling or texts.
---
# Interface

Prose here applies to the whole Area (optional).
```

Every other `.md` file in the folder is a **fragment** holding some of the Area's sections:

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

- `area.md` is required: front matter with `description` (when an agent needs this Area), one H1 with the Area's title, optional prose. No `##` sections.
- A fragment's name is kebab-case (`area` is reserved). Front matter with `description` (required): when an agent needs this fragment. One H1 with the fragment's title. **No prose before the first section**; then only sections.
- `## General`: applies everywhere. Every other `##` is titled with exactly one element reference (see above) and applies to that element and everything inside it (a Machine's sections apply to all its States; a Feature's to all its Machines).
- A section must name an element that exists once the Proposal is applied, and appear **once in the whole Area**, in one fragment. Anything under it (lists, `###`, code) is free text.
- No subfolders in an Area. A `.md` file directly in `requirements/` is an error: `trama skills update` converts it into a folder with `area.md` and one fragment, `main.md`.
- Reference a Requirement from a Task or Drift with `requirements/<area>` or `requirements/<area>#<section>`, for example `requirements/ui#order/Paid` or `requirements/ui#General`. The fragment is never part of the reference: a section is unique in its Area.

### Generated skills and when to split a fragment

- Trama generates the `trama-req-*` skills in one of two modes, the same for every Area. The **budget** is the sum, over the fragments with at least one non-empty section, of the characters of `trama-req-<area>-<fragment>` and of the fragment's description. Up to **4,000** characters: one skill per fragment, `trama-req-<area>-<fragment>`, with the fragment's description. Beyond: one **index** skill per Area, `trama-req-<area>`, with the Area's description, its General section in full and a list of its fragments, each in its own file next to the index.
- `trama validate` also prints **warnings**, which never fail validation or the hand-over: a fragment larger than **12 KB** (12,288 bytes of the file, front matter included), and, with `--proposal`, the switch between the two modes the Proposal would cause.
- When a Proposal writes into a fragment that is or becomes larger than 12 KB, split it in the same Proposal before handing it over: cut where it suits the project (usually by Feature or by a group of nearby Machines), give every new fragment a name and a description that say when it is needed, and move the sections without changing their text. Mind the budget: prefer a few medium fragments to many tiny ones.
