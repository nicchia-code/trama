# Model and Requirements file format (quick reference)

Model paths below are relative to `.trama/model/`; Requirement files are `requirements/<area>.md` (in `.trama/requirements/`). `trama validate --proposal <id>` checks all of this.

```
system.md              the System
actors/<actor>.md      one file per Actor (only emits Events)
<feature>/feature.md   one folder per Feature (no nesting)
<feature>/<machine>.md one file per Machine
requirements/<area>.md one file per Area of Requirements (no subfolders)
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

## Requirements (`requirements/<area>.md`)

```markdown
---
description: Use when building or changing screens, layout, styling or texts.
---
# Interface

## General
- Material 3, light and dark theme following the system.

## checkout
- Every checkout screen shows the cart total at the bottom.

## order/Paid
- A green "Paid" badge next to the order number.
```

- Front matter with `description` (required): when an agent needs this Area. It becomes the description of the generated `trama-req-<area>` skill.
- One H1 with the Area's title. Prose before the first `##` applies to the whole Area.
- `## General`: applies everywhere. Every other `##` is titled with exactly one element reference (see above) and applies to that element and everything inside it (a Machine's sections apply to all its States; a Feature's to all its Machines).
- A section must name an element that exists once the Proposal is applied, and appear once per file. Anything under it (lists, `###`, code) is free text.
- Reference a Requirement from a Task or Drift with `requirements/<area>` or `requirements/<area>#<section>`, for example `requirements/ui#order/Paid` or `requirements/ui#General`.
