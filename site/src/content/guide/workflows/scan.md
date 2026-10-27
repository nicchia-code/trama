---
title: "Scan the System"
description: "Have the agent compare the Model with the code and turn the differences into Tasks and Drifts."
order: 5
---

A **scan** is the agent's comparison between the Model and its Requirements and the existing code. What it finds becomes Tasks, for what is missing, and Drifts, for what differs.

```step
title: Press Scan System
text: |
  **Scan System** is at the bottom of the side menu, after a line, and is the only button that scans the whole System. A dialog asks `Scan the whole System?`; confirm with **Scan**.
scene: scan-confirm
alt: "The dialog Scan the whole System over the dimmed Board, saying the agent compares every Machine with the code and this can take a long time, with Cancel and Scan buttons, and Scan System highlighted in the side menu."
eager: true
```

When Tasks were finished since the last scan of the whole System, the button says `Scan System · N`, with N the number of Tasks.

```step
title: Follow the scan
text: |
  The scan starts without taking the focus. A ghost `Scanning System` shows in the status bar, and a **Scan** conversation opens in omp Chat.
scene: scan-running
alt: "The Board during a scan: the status bar shows Scanning System at the bottom left, Scan System is highlighted in the side menu, and a Scan conversation is open in omp Chat on the right."
```

Each Machine in scope is compared directly with the code, one sub-agent for each Machine when the agent has sub-agents, one after the other when it does not. A Machine with no differences produces nothing. The report says how many Machines were compared and how many produced Tasks or Drifts.

```step
title: Read the result
text: |
  What the scan found shows on the Board: a red card in the Backlog for each Drift, and new Tasks in **Active**. The number on **Board** counts the decisions that wait for you.
scene: scan-result
alt: "The Board after a scan: a red Drift card, Declined payment sends no email, in the Backlog with Resolve and Dismiss Drift buttons, and the number 1 on the Board entry of the side menu."
```

Decide on the Drifts: [Resolve Drifts](/guide/workflows/drifts/). Run the new Tasks: [Run Tasks](/guide/workflows/run-tasks/).

## Scans that start by themselves

- **During a Run**, with the Advisor Scanner on (the default), an advisor checks the code as the agent writes it, so the Run does not scan before or after. With the setting off, the Run scans the Tasks it is about to build and, at the end, what it built. See [Run Tasks](/guide/workflows/run-tasks/).
- **After a Merge** in Solo mode, Trama scans the whole System by itself. See [Solo mode and Merge](/guide/workflows/solo-mode/).
- **A closed GitHub issue** in the Team view can be scanned alone: **Scan** compares only the part of the Model that issue referenced. See [Manager mode and Team](/guide/workflows/manager-mode/).

A scan takes the model set as **Scan** in Settings. Trama remembers which Model elements it already compared against the same code and the same text, so a Run does not compare them again.
