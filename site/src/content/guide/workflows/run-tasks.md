---
title: "Run Tasks"
description: "Have the agent build Tasks one at a time or all together, and follow it on the Board."
order: 4
---

An approved Proposal leaves its Tasks in **To do**. The agent builds them when you ask.

```step
title: Find the Tasks
text: |
  The Tasks wait in the **Active** column, each with **View on diagram**, **View requirements** and **Run**. **Run all** is at the bottom of the column.
scene: run-task-cards
alt: "The Board with three Tasks in the Active column, Returns after shipping, Declined payment email and Cart total at the bottom, each with a Run button, and the Run all button at the bottom."
eager: true
```

```step
title: Run one Task
text: |
  Press **Run** on a Task card: the card gets an animated border, its dot says `Agent working`, and a conversation for the Task opens in omp Chat. The other **Run** buttons are disabled with the reason `A run is in progress`.
scene: run-started
alt: "The Board while Task T1 runs: its card has a blue border and an orange dot, the other Tasks have disabled Run buttons, and the T1 conversation is open in omp Chat on the right with the agent's first lines."
```

The agent moves the Task to Done when finished. A fix Task whose code already does what the Model says is closed without changes, with the badge `unchanged`.

```step
title: Or run them all
text: |
  Press **Run all**: the agent takes the oldest runnable Task, builds it, and asks for the next until none is left, skipping blocked Tasks. The button stays in place, disabled, with a bar filling it and the text `Running…`.
scene: run-all
alt: "The Board during Run all: the first Task has a blue border, the button at the bottom of the Active column reads Running, and an All tasks conversation is open in omp Chat on the right."
```

Its tooltip gives a range of the time left, such as `~15–35 min left`; past the estimate, the text is `Taking longer than expected`. Only one Run goes at a time: while it lasts, **Run**, **Run all**, **Clear**, **Resolve** and **Delete** are disabled.

## Parallel execution

With **Parallel Execution** on (the default), a Run of several Tasks may start together the Tasks that concern different things, up to **Max Parallel Agents** sub-agents (20 by default); the agent gives a reason for each choice. Tasks that concern the same thing always run one after the other. Where the agent has no sub-agents, the Tasks run one at a time. If you assigned different models to different Proposals with the gear on their cards, the Run splits by model.

## Drifts during a Run

If the code the agent reads or writes does not follow the Model or the Requirements, it tells you through a Drift. A Drift filed during a Run leaves its Task **In progress**, blocks the Tasks it concerns, and does not stop the Run: the Run goes on with the others. See [Resolve Drifts](/guide/workflows/drifts/).

With **Advisor Scanner** on (the default), an advisor checks the code against the Model during every Run, using the Scan model: it tells the agent what to fix in the code of the Task being written, and files a Drift for code that already existed. With the setting off, the Run scans the Tasks it is about to build first, and again at the end.

## At the end

The Run ends with a final verification of tests, lint and build, then the agent writes the History entries. See [The Board and the History](/guide/concepts/board-and-history/).

## Taking a Task back

The agent holds a Task while it works on it, and you cannot move it. To take it back, run `trama task move <id> doing` in a terminal: the Task stays In progress and is yours. The [command line reference](https://github.com/nicchia-code/trama/blob/main/docs/cli.md) describes every command.
