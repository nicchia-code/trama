---
title: "Refine stale Proposals"
description: "Let the agent bring an open Proposal up to date when the Model changed under it."
order: 10
---

A Proposal is written on the Model as it was. If another Proposal is approved first, the Model changes under the open ones, and they become **stale**: they no longer describe the change on the current Model.

```step
title: Spot a stale Proposal
text: |
  With **Auto-update Stale Proposals** on (the default), a stale design Proposal shows the chip **to refine** instead of a warning. The tooltip of **Approve** says `Refine it on the current Model, then approve it`.
scene: refine-stale
alt: "The Board with a Proposal card in the Backlog, Describe the draft order, carrying a to refine chip next to its number, with View on diagram, Approve and Reject buttons, and Task T1 waiting in the Active column."
eager: true
```

```step
title: Refine one, or all
text: |
  Press **Approve**: the agent refines the Proposal on the current Model first, and it is approved when done. To queue every stale design Proposal at once, open the arrow beside **+ Add Work Item** and choose **Refine All (n)**, with `n` how many it takes.
scene: refine-menu
alt: "The Board with the menu of the arrow beside Add Work Item open, showing a disabled Unify Drifts and the Refine All (1) item, above a Proposal card with the to refine chip."
```

```step
title: Follow the refining
text: |
  The card gets the badge `refining`, the animated border of a Task being built, a line with the phase (`Refining`, or `Waiting for your answers` while the agent asks you something) and the agent's latest note, and a **Refine** conversation opens in omp Chat.
scene: refine-running
alt: "The Board while a Proposal is refined: its card has the refining badge, a blue border and the word Refining with disabled Approve and Reject buttons, and a Refine P2 conversation is open in omp Chat."
```

Other badges tell the wait:

- `queued`, with what the Proposal waits for: a Proposal it requires to be approved or refined first, or a free refining slot;
- `waiting for the run`, when the Proposal is refined but a Run is in progress: Trama approves it when the Run ends.

While **Refine All** runs, the menu item becomes **Cancel Refine All**, which empties the queue. A Draft left half-way by an interrupted refining keeps its card with `to refine`; **Approve** resumes it.

## With the setting off

Stale Proposals keep the `stale` badge, and the menu item says `Turn on Auto-update Stale Proposals in Settings`. Rework them with feedback (see [Rework with feedback](/guide/workflows/rework/)) or reject them and design the change again.
