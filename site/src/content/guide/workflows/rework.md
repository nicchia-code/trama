---
title: "Rework with feedback"
description: "Reject a Proposal, or send back a Drift, and have the agent redo it following your feedback."
order: 3
---

When a Proposal is close but not right, rejecting it and starting over wastes what was good. **Rework with feedback** has the agent redo it, following your words.

```step
title: Open the arrow of Reject
text: |
  **Reject** is a split button: open its arrow, titled `More ways to reject P1`, and choose **Rework with feedback…**. It exists on the Proposal cards in the Backlog and in the Proposal details of the Diagram, for ordinary, import, setup and resolution Proposals.
scene: reject-menu
alt: "A Proposal card in the Backlog with the arrow beside Reject open, showing the item Rework with feedback."
eager: true
```

```step
title: Write the feedback
text: |
  A box opens, titled `Rework P1 – <title>`: `What should the agent change? Leave empty to redo it on the current Model.` Write the feedback and press Enter. The Proposal is rejected and the agent starts again with your words.
scene: rework-box
alt: "The input box of Rework P1, Returns after shipping, at the top of the window with the placeholder Feedback for the agent and the line asking what the agent should change, over the Board."
```

Confirming an empty box asks first: `Rework P1 without feedback? The agent redoes it on the current Model.` Escape closes the box and nothing happens.

```step
title: Do the same on a Drift
text: |
  **Dismiss Drift** has the same arrow, with **Rework with feedback…** inside. The box asks `How should the agent resolve this Drift? Leave empty to resolve it as Resolve does.`, and the Drift is marked `Resolving` while the agent works.
scene: drift-dismiss-menu
alt: "A Drift card in the Backlog with the arrow beside Dismiss Drift open, showing the item Rework with feedback."
```

See [Resolve Drifts](/guide/workflows/drifts/) for the rest of the Drift workflow.
