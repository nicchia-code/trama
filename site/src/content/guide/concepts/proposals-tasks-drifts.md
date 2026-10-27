---
title: "Proposals, Tasks and Drifts"
description: "The three kinds of card, and the ghosts that announce them."
order: 4
---

Work in Trama is made of three kinds of card. The Board shows them (see [The Board and the History](/guide/concepts/board-and-history/)); what each one means, and who decides, is below.

```screenshot
scene: board-menu
alt: "The Board of Trama in VS Code with a blue Proposal card and a red Drift card in the Backlog, the Active column empty and the Done strip on the right."
```

## Proposal

A **Proposal** is a change to the Model and its Requirements that the agent suggests. It has no effect until you approve it as a whole.

- While the agent writes it, a Proposal is a **Draft**. You cannot decide on it yet, and the Board shows only its ghost.
- When the agent hands it over, the Proposal is **open** and waits in the Backlog for your decision: **Approve**, **Reject**, or, from the arrow beside Reject, **Rework with feedback…**.
- An ordinary change carries the **Tasks** that build it. Approving the Proposal creates them, in To do, in one step.
- A Proposal can be written on top of earlier open Proposals and then can only be approved after them.
- If the Model changes under an open Proposal, because another one was approved first, the Proposal becomes **stale**. Trama can refine it on the current Model (see [Refine stale Proposals](/guide/workflows/refine/)).

Other kinds of Proposal follow the same rules: an **import** describes existing code, a **setup** is the first Model of a project started from scratch, a **resolution** gathers your decisions on Drifts, and a **handoff** carries GitHub issues for your team.

## Task

A **Task** is a unit of work for the agent that you can see and ask the agent to run. A Task that changes the System's behaviour points at the Model elements it concerns. A **Technical Task** changes none, for example a refactor or a dependency upgrade, and points at none.

A Task is in **To do**, **In progress** or **Done**. The Board has no way to move a Task: the agent moves it as it works. While the agent works on a Task, the card has an animated border and the dot says `Agent working`.

A Task is **blocked** when an open Drift concerns the same thing, or when it waits for the Task that fixes its Drift. The agent cannot start a blocked Task. See [Run Tasks](/guide/workflows/run-tasks/).

```screenshot
scene: task-details
alt: "The details of Task T2, Declined payment email, over the dimmed Board: a chip naming the Model element it concerns, its text, and the Delete, Ask more and Close buttons."
```

## Drift

A **Drift** is a difference between the code and the Model, large enough to change the Diagram, or code that contradicts a Requirement. Only you decide on it. A Drift states two sides, written to be read at a glance:

- **What happens**: what the code does;
- **What should happen**: what the Model or the Requirement says.

```screenshot
scene: drift-details
alt: "The details of Drift D1 over the dimmed Board: a chip naming the Model element, What happens and What should happen, and the Ask more and Close buttons."
```

It may add **Where in the code** the difference was seen, and offers two to five **Fix options** for the code, the first one the agent recommends. You always keep one of the two sides: keeping *what should happen* has the code fixed, with the Fix option you choose and an optional note; keeping *what happens* leaves the Model to match the code through a Proposal. See [Resolve Drifts](/guide/workflows/drifts/).

An open Drift **blocks** the Task the agent was working on when it found it, and every unfinished Task that concerns the same thing.

## Ghosts

When the agent is preparing a card, Trama shows a **ghost** of it: a dashed, translucent skeleton in the column the card will land in, with its kind (`Proposal`, `Task`, `Drift`), its title and a line for the phase: `Preparing`, `Writing`, or `Waiting for your answers`. A line under it shows the agent's latest note. Click a ghost to read all the notes and how long the agent has been working.

What the agent does without a card to deliver, such as a scan, an import or a comparison, shows as a ghost in the editor's status bar, with a spinner and the title, for example `Scanning System +2`. Click it to open the details.

## Short numbers and IDs

Every live Proposal, Task and Drift has a **short number**, `P3`, `T3` or `D3`, to read and quote it at a glance. It is local to the working copy and is freed when the card closes. The permanent eight-character **ID** is what files and commands use. The panel shows one or the other, never both, and its tooltip says which.

## The decisions are yours

The agent never approves, rejects or discards a Proposal, resolves a Drift or deletes a Task by itself. It stops and says the decision is yours, on the Board, unless you ask it explicitly, in the conversation, to do that one thing.
