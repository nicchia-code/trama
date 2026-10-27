---
title: "Resolve Drifts"
description: "Decide between the code and the Model, with the Fix options the agent offers."
order: 6
---

A Drift is a difference between the code and the Model, or between the code and a Requirement, that only you can settle.

```step
title: Find the Drift
text: |
  A Drift is a red card in the Backlog, with its short number, its title, **Resolve** and **Dismiss Drift**. Badges may tell more: `recurring`, when it follows a Drift already resolved for the same thing; `unified`, when it merges several Drifts; `Merge`, when it comes from a Merge in Solo mode; `Resolving` and `Unifying` while an agent works on it.
scene: drift-card
alt: "The Board with one red Drift card in the Backlog, Declined payment sends no email, with the Resolve button and the Dismiss Drift split button, and the number 1 on the Board entry."
eager: true
```

```step
title: Read what differs
text: |
  Click the card outside its buttons: the window shows the Model elements and Requirements the Drift points at, as chips, then **What happens** and **What should happen** side by side. **Ask more** opens a conversation with an agent about it.
scene: drift-details
alt: "The details of Drift D1 over the dimmed Board: a chip naming the Model element, What happens (the order moves to Cancelled and nothing is sent to the customer), What should happen (the customer is told by email), and the Ask more and Close buttons."
```

```step
title: Resolve it
text: |
  Press **Resolve**: the agent asks you one question, in the same overlay as the design questions, with the **Fix options** of the Drift (one of them **Recommended**) and the choice to **Dismiss the Drift**. **Show details** gives pros and cons, and a skipped question leaves the Drift open.
scene: drift-resolve-question
alt: "The Questions from the agent overlay with one prepared question about a declined payment, and the options Send the email (Recommended), Show a message on screen and Dismiss the Drift, each with Show details, then Skip all, Skip and Review."
```

Your choice has three outcomes:

1. **Fix the code.** Choose a Fix option, with an optional note in the free answer. Trama creates a Task, `Fix code to match the Model: <title>`, with both sides, your option and your note. The Task that was being built when the Drift appeared waits for it.
2. **Keep the code.** The agent writes a Proposal that updates the Model to match the code; approving it closes the Drift.
3. **Dismiss.** The Drift closes without changing anything, after a confirmation `Dismiss Drift "<title>"?` Use it when the difference does not matter.

With **Async Drift Resolver** on (the default), the agent prepares each Drift's question beforehand, so **Resolve** asks at once without starting an agent.

```step
title: Approve the resolution
text: |
  The agent files the **resolution**: a yellow card in the Backlog that lists each Drift with what happens to it (`Model updated to match the code`, `Closed, nothing changes`, `Code fixed with option …`). **Approve** or **Reject** decides the whole resolution, never a single Drift.
scene: drift-resolved
alt: "The Board with a yellow Resolution Proposal card in the Backlog, Resolve: Declined payment sends no email, listing D1 as Code fixed with option Send the email, with Approve and Reject buttons."
```

```step
title: Or dismiss it, or send it back
text: |
  **Dismiss Drift** closes the Drift for good. Its arrow opens **Rework with feedback…**, to have the agent resolve the Drift following your words: see [Rework with feedback](/guide/workflows/rework/).
scene: drift-dismiss-menu
alt: "A Drift card in the Backlog with the arrow beside Dismiss Drift open, showing the item Rework with feedback."
```

```step
title: See what a Drift blocks
text: |
  An open Drift blocks the Task it came from and every unfinished Task that concerns the same thing: the Task card shows a `blocked` badge and a disabled **Run**, and a click on the badge lists the Drifts (see [Run Tasks](/guide/workflows/run-tasks/)).
scene: drift-blocked-task
alt: "The Board with an open Drift in the Backlog and, in the Active column, Task T1, Declined payment email, marked with a red blocked badge and a disabled Run button."
```

While Drifts are being resolved, **Run all** and **Run** are disabled with `Drifts are being resolved`. Several Drifts that want incompatible things can be settled together: [Unify Drifts](/guide/workflows/unify-drifts/).
