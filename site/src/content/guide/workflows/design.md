---
title: "Design a change"
description: "Describe a change in plain words, answer the agent's questions and receive a Proposal."
order: 1
---

Every change starts as a sentence. The steps below take one from the request to the Proposal that waits for your decision.

```step
title: Open the Board
text: |
  Click **Board** in the side menu. The number beside it counts the cards that wait for your decision, and **+ Add Work Item** is at the bottom of the Backlog.
scene: board-menu
alt: "The Board of Trama in VS Code with a Proposal and a Drift in the Backlog, the empty Active column, the Done strip on the right and the number 2 on the Board entry of the side menu."
eager: true
```

```step
title: Start a request
text: |
  Press **+ Add Work Item**. A new Markdown document opens, completely empty except for a grey hint on the first line.
scene: design-request-empty
alt: "A new empty Markdown document in the editor with a grey hint on its first line, Describe the change to design, and the Send to agent button among the icons of the title bar."
```

```step
title: Write the request and send it
text: |
  Describe the change: behaviour, edge cases, requirements, as you would tell a colleague. Press **Send to agent** in the title bar, or close the tab, which sends the request too.
scene: design-request
alt: "The request document with two lines of text describing returns of a shipped order, and the Send to agent button highlighted in the title bar."
```

The request is saved exactly as written. An empty request is not sent: `Trama: write the design request before sending it.` Closing an empty request that was never sent deletes it without a message. You can paste or drop images for context: images that come from outside the project are copied next to the request, and images already in the project are only linked.

```step
title: Wait for the agent
text: |
  The agent starts at once, with the model set for **Analysis** (see [Settings](/guide/panel-and-settings/settings/)). A ghost of the Proposal appears in the Backlog, and a **Design** conversation opens in omp Chat.
scene: design-ghost
alt: "The Board with a dashed ghost card in the Backlog showing the request text and the word Preparing, and the Design conversation open in omp Chat on the right."
```

```step
title: Answer the questions
text: |
  The agent asks only what it cannot decide alone, in a round of questions shown in an overlay on the panel, one question at a time. Pick an option (the **Recommended** one is already selected), write a note if you like, and press **Next**.
scene: design-questions
alt: "The Questions from the agent overlay on the Board: question 1 of 3 asks how long after delivery a customer can return an order, with the options 30 days (Recommended), 14 days and No limit, a free answer field, and Skip all, Skip and Next buttons."
```

- The header says which job asks and `Question 1 of 3`; an index lists the questions as `Answered`, `Skipped` or `Missing`.
- **Show details** opens the pros and cons of an option. A question can have a single answer or several; keys `1` to `9` pick the matching option.
- **Your answer (optional)** is always there for a free answer or a note.
- **Back**, **Skip** and **Skip all** are in the footer, and **Next** becomes **Review** on the last question. A skipped question is reported to the agent, which uses its recommendation and lists that decision for you to verify.
- **Ask more** opens a conversation with an agent about the question, and the overlay can be minimised to a bar to look at the Model while answering.

```step
title: Check the summary
text: |
  The **Summary** lists every answer with an **Edit** button. **Send to agent** is enabled once every question is answered or skipped.
scene: design-questions-summary
alt: "The Summary page of the questions overlay, with the three answers 30 days, Original payment method and The shop, each with an Edit button, and Skip all and Send to agent at the bottom."
```

Closing the panel does not touch the round: it waits, and a message `Trama has questions from the agent waiting.` offers **Reopen**. If the editor window closes, the rounds of that window are dropped with their answers.

```step
title: Receive the Proposal
text: |
  The agent writes the Proposal straight away. The ghost goes through `Preparing`, `Writing` and, while a round is open, `Waiting for your answers`; then the Proposal arrives in the Backlog, and the number on **Board** goes up.
scene: board-proposal
alt: "The Board with one Proposal card in the Backlog, Returns after shipping, with the files it changes and the buttons View on diagram, View requirements, Approve and Reject, and the number 1 on the Board entry of the side menu."
```

Judge it as described in [Review, approve or reject a Proposal](/guide/workflows/review-proposals/). The same flow, with **Ask more**, is how you question any card, Proposal or answer without changing anything.
