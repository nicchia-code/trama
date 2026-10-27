---
title: "The Board and the History"
description: "What waits for you, what is in progress, what is done, and the story of the work."
order: 5
---

## The Board

The **Board** is where the work shows. It has three columns, and its cards are read-only: the Board has no way to drag or move a card. What you change in the project passes through the decisions on Proposals and Drifts, and the buttons that start the agent.

```screenshot
scene: board-menu
alt: "The Board of Trama in VS Code with a Proposal and a Drift in the Backlog, the Active column empty and the Done strip on the right, and the number 2 on the Board entry of the side menu."
```

### Backlog

What waits for your decision, oldest first: Proposals and the red cards of open Drifts, then the ghosts of what the agent is preparing. At the bottom, **+ Add Work Item** opens a written request for the agent (see [Design a change](/guide/workflows/design/)). Its arrow opens a menu with **Unify Drifts** and **Refine All**.

A Proposal card shows its short number, its title, `Creates N Tasks`, and the buttons to decide. A Drift card has **Resolve** and **Dismiss Drift**. A resolution, the Proposal that gathers your decisions on several Drifts, is a single yellow card. Click any card outside its buttons to read it in full.

The number on the **Board** entry of the side menu counts the cards in the Backlog, so it says how many decisions wait for you.

### Active

The Tasks in To do or In progress, blocked or not. At the bottom, **Run all** asks the agent to build every Task in To do. Each card has **View on diagram**, **View requirements** and **Run**. A blocked Task shows a `blocked` badge, and a Task that waits for another shows `waiting T4`. Click a badge to see why and jump to the Drift or the Task.

### Done

The Tasks finished, grouped by the day they ended (`Today`, `Yesterday`, then the date). The column can be collapsed with the chevron beside its title. A Task closed without changes has the badge `unchanged`; a Task that an open Drift still names has the badge `kept`. **Clear** deletes the Tasks in Done for good, except the `kept` ones, and asks for no confirmation.

```screenshot
scene: board-done
alt: "The Board with the Done column open on the right, listing eight finished Tasks under Today, with the Clear button at the bottom of the column."
```

### Details and Ask more

Clicking a Task or a Drift card opens its details: the Model elements and Requirements it points at, as chips that open the Diagram or the Requirements on them, the body, and the two sides of a Drift. Clicking a Proposal opens its body. Every one of these windows has **Ask more**, which opens a conversation with an agent about that card, and **Close**. A Task in To do also has **Delete**.

## The History

The **History** view tells what was done. At the end of every Run, the agent writes **History entries**, one for each macro-feature the Run worked on, each with a date, a summary and the Tasks it covers. A Task deleted with Clear is still listed in its entry.

- Entries are grouped by day: `Today · 3`, `Yesterday · 5`, then the date.
- The menu at the top right chooses the period: `Today`, `Last 7 days` (the default), `Last 30 days` or `All`.
- Click an entry to read it in full, with its Tasks, each with the chips that open the Diagram or the Requirements on what it changed.

```screenshot
scene: history-view
alt: "The History view with four entries grouped under Today, each with a title, a time and a summary, and the period menu Last 7 days at the top right."
```

When nothing was done in the period, the view says `Nothing done in this period`.
