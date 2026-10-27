---
title: "The Model"
description: "The System, its Features, Machines, States, Transitions, Events and Actors."
order: 1
---

The **Model** is the layered description of every situation a software system can be in. It matters more than the code: it is what the agent reads before it writes a line, and what you read to think clearly about the system. The Diagram draws it (see [The Diagram and its focus](/guide/panel-and-settings/diagram/)).

## The pieces

- **System**: The whole software described by the Model. It sits at the top and holds the Features and the Actors.
- **Feature**: A group of Machines that together deliver a capability users recognise, for example Checkout. Features cannot be nested.
- **Machine**: The behaviour of one kind of thing in the domain or in the interface, for example every Order. A Machine has one initial State, any number of final States, and the Transitions between them. It talks to other Machines only through Events.
- **State**: A distinct situation a Machine can be in, described in domain terms (`Awaiting payment`), never as a combination of variable values. A State can expand into sub-States, as a zoom level. Concurrency is expressed by separate Machines, never inside one.
- **Event**: Something that happens, owned by the Machine or the Actor that emits it. Events are the only way Machines talk to each other.
- **Transition**: A Machine moving from one State to another in reaction to an Event. Its condition and its consequence are written as free prose, with no variables.
- **Actor**: Something outside the System, such as the user, an external service or time. An Actor emits Events, has no States and reacts to nothing in the Model. It belongs to the System and is shared by all Features.

```screenshot
scene: diagram-system
alt: "The Diagram at the System level: the Whole System node and the Actors User, Courier, Stripe and Warehouse, with the System Shop described in the side panel and the Checkout Feature listed under it."
```

## An example

This is the Order Machine of the example shop, as the Markdown file that holds it:

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

### Shipped (final)

### Cancelled (final)
```

```screenshot
scene: diagram-machine
alt: "The Diagram at the Machine level for the order of the Checkout Feature: the States Refunding and Shipped joined by Transitions labelled with Events such as user.CANCEL and courier.PICKED_UP, with Shipped selected and its details in the side panel."
```

Each line under a State reads as "when this Event arrives, go to that State", followed by the condition and the consequence in plain words. The same Event can appear twice from one State: the prose tells the cases apart.

## Where the Model lives

The Model is plain Markdown in the `.trama/model/` folder of the project: `system.md` for the System, one file per Actor, and for each Feature a folder with `feature.md` and one file per Machine. It is versioned with the project's git, unless Solo mode keeps it out (see [Solo mode and Merge](/guide/workflows/solo-mode/)).

You do not edit the Model by hand. The agent proposes every change as a Proposal, and nothing takes effect until you approve it (see [Proposals, Tasks and Drifts](/guide/concepts/proposals-tasks-drifts/)). The exact file format is in the [Model file format](https://github.com/nicchia-code/trama/blob/main/docs/model-format.md) reference.
