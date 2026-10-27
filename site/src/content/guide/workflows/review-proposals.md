---
title: "Review, approve or reject a Proposal"
description: "Read a Proposal on the Diagram and the Requirements, then decide."
order: 2
---

A Proposal in the Backlog is the agent's suggestion, waiting for you. Nothing in the project has changed yet.

```step
title: Read what it says
text: |
  Click the Proposal card outside its buttons: its body opens as rendered Markdown, with what the agent decided, what it assumed and what it doubts. **Ask more** opens a conversation about it.
scene: review-details
alt: "The details of Proposal P1, Returns after shipping, in a window over the dimmed Board: a sentence, a Decisions list, an Assumptions list, and the Ask more and Close buttons."
eager: true
```

```step
title: See it on the Diagram
text: |
  Press **View on diagram**. The Diagram opens on what the Proposal changes, step by step with **Previous** and **Next**: new and changed States are blue, removed ones red and dashed, and the side panel lists the changes file by file.
scene: review-diagram
alt: "The Diagram focused on Proposal P1, with its bar showing 1 of 2 and the Previous and Next buttons, the User Actor drawn in blue, the Legend at the bottom left and, in the side panel, what changes and the text of the Proposal."
```

```step
title: See the Requirements
text: |
  Press **View requirements**. The Requirements view opens on the sections the Proposal adds, changes or removes, marked `added`, `changed` or `removed`; **Only these** hides the rest.
scene: review-requirements
alt: "The Requirements view with Proposal P1 selected: the Interface Area with the section order/Shipped highlighted in green and marked added, and the Only these and Clear buttons in the header."
```

```step
title: Approve it
text: |
  Press **Approve**: the Proposal goes into the project as a whole, the Model and Requirements files change, and its Tasks are created in **To do**, in the Active column. No scan runs.
scene: approve-result
alt: "The Board after approving: the Backlog is empty and the Active column holds Task T1, Returns after shipping, with View on diagram, View requirements and Run buttons, and the Run all button at the bottom."
```

Approval also creates a Task `Remove code of <element>` for each Model element the Proposal removes, so the code goes too. Run the Tasks: [Run Tasks](/guide/workflows/run-tasks/).

```step
title: Or reject it
text: |
  **Reject** rejects the Proposal at once, without feedback. The arrow beside it offers **Rework with feedback…**, to have the agent redo it following your words: see [Rework with feedback](/guide/workflows/rework/).
scene: reject-menu
alt: "The Proposal card on the Board with the arrow beside Reject open, showing the single item Rework with feedback."
```

## When a Proposal waits

- It **requires** an earlier open Proposal: approve that one first.
- It is **stale**, the Model having changed under it: see [Refine stale Proposals](/guide/workflows/refine/).
- The agent is still finishing its turn: the buttons are visible but disabled with the reason `The agent is still finishing`, and enable by themselves.

A disabled button always gives its reason in its tooltip. The **gear** on a card that carries Tasks chooses the model for the Tasks of that Proposal, and the **Proposal** selector of the Diagram and the Requirements view draws any open Proposal over the current Model.
