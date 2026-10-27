---
title: "Start from Scratch"
description: "Describe an application still to be built and receive its first Model and the Tasks that build it."
order: 9
---

**Start from Scratch** is for an application that does not exist yet: you describe it, and an agent designs it.

```step
title: Choose Start from Scratch
text: |
  In the **Path** step of the setup wizard, choose **Start from Scratch** and press **Next**; in an empty Diagram, the **Start from Scratch** button does the same (see [Put Trama in a project](/guide/getting-started/get-started/)).
scene: wizard-path-scratch
alt: "The Path step of the Set up Trama wizard with the Start from Scratch card chosen, the Import from Code card not chosen, and the Next button enabled at the bottom right."
eager: true
```

```step
title: Confirm
text: |
  Go through the other steps as for any project; the **Summary** shows `Start from Scratch` in the **Path** card. Press **Set up Trama**.
scene: wizard-summary-scratch
alt: "The Summary step of the wizard with the Path card reading Start from Scratch, the omp and Models cards below, and the Set up Trama button at the bottom right."
```

```step
title: Describe the application
text: |
  A written request opens, with the grey hint `Describe the application to build: what it does and who it is for.` Write it, paste or drop images for context, then press **Send to agent** or close the tab.
scene: scratch-request
alt: "The new request in the editor with the grey hint on its first line asking to describe the application to build, and the Send to agent button in the title bar."
```

```step
title: Answer the questions
text: |
  The agent asks its questions in the overlay, exactly as in [Design a change](/guide/workflows/design/): pick the options, then **Send to agent**.
scene: design-questions
alt: "The Questions from the agent overlay on the Board, with question 1 of 3, three options with the Recommended one selected, a free answer field and the Skip all, Skip and Next buttons."
```

```step
title: Review the setup Proposal
text: |
  The agent writes a **setup Proposal**: the first Model of the project, the Requirements and the Tasks that build the application. Review it like any Proposal (see [Review, approve or reject a Proposal](/guide/workflows/review-proposals/)); the Diagram draws the whole new System.
scene: board-proposal
alt: "The Board with an open Proposal card in the Backlog, with the buttons View on diagram, View requirements, Approve and Reject, as the setup Proposal looks."
```

```step
title: Approve and run
text: |
  **Approve** creates the Tasks in **To do**. Run them one by one, or press **Run all**: [Run Tasks](/guide/workflows/run-tasks/).
scene: approve-result
alt: "The Board after approving: the Active column holds a Task with View on diagram, View requirements and Run buttons, and the Run all button is enabled at the bottom of the column."
```
