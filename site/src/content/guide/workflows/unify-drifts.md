---
title: "Unify Drifts"
description: "Merge every open Drift into one, so conflicting differences are settled together."
order: 7
---

When several open Drifts want incompatible things, or touch the same place in different ways, deciding them one by one can leave the code contradicting itself. **Unify Drifts** has an agent merge them into one.

```step
title: Open the menu of Add Work Item
text: |
  Open the arrow beside **+ Add Work Item** at the bottom of the Backlog, and choose **Unify Drifts**. There is no form and no confirmation: the agent starts at once.
scene: unify-menu
alt: "The Board with two Drift cards in the Backlog and the menu of the arrow beside Add Work Item open, offering Unify Drifts and a disabled Refine All."
eager: true
```

If Unify cannot be used, the item stays in the menu, disabled, with the reasons under its label, such as `Unify needs at least two open Drifts`, `Drifts are being resolved` or `A run is in progress`.

```step
title: Wait while the agent unifies
text: |
  A ghost `Unifying <N> Drifts` shows in the Backlog, each collected Drift has the badge `Unifying`, and a **Unify** conversation opens in omp Chat. If some Drifts conflict, the agent asks **one question for each conflict**, in a single round, and with no conflicts there is no round.
scene: unify-running
alt: "The Board while Drifts are unified: two Drift cards marked Unifying with disabled buttons, a ghost card named Unifying 2 Drifts below them, and the Unify conversation open in omp Chat."
```

```step
title: Resolve the unified Drift
text: |
  The result is one Drift with the badge `unified`; its details have a section **Unifies** that lists the Drifts it replaced, which have no card any more. Resolve it like any other: [Resolve Drifts](/guide/workflows/drifts/).
scene: unify-result
alt: "The Board after unifying: a single Drift card, Checkout screens differ from the Model, marked unified in the Backlog, with the Unify conversation still open in omp Chat."
```

A skipped question keeps all the conflicting ways in the unified Drift, as different ways to fix. While the agent unifies, **Resolve**, **Dismiss Drift**, **Run** and **Run all** are disabled.
