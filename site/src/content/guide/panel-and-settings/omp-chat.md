---
title: "omp Chat and General"
description: "The conversations with the agent, one for each job, and General for thinking with omp."
order: 3
---

By default, Trama's jobs open as conversations in the **omp Chat** view, which lives in the secondary side bar on the right, like the chat of VS Code. The conversation's tab is named like the terminal it replaces: `T3`, `Design`, `Setup`, `Scan`, `All tasks`, `Drifts`, `Unify`, `Import`, `Ask P2`, `Ask question`. A dot on the tab is animated while the agent is in a turn, and in the warning colour while it waits for you.

With **omp Chat** off in Settings, the jobs open in terminals instead. If omp Chat cannot start omp, the job runs in a terminal and a message says why.

## A conversation

- **Your messages** are boxes on the right; the first one is Trama's instruction for the job, labelled `Trama`.
- **The agent's messages** are Markdown across the full width. Its reasoning is a collapsed `Thinking` block, and each tool call is a compact row with an icon, the title omp gives it and its state (running, done, failed). A cut row opens to show its whole text.
- **Plan** shows the agent's to-do list above the message field, with `done/total`.
- **Forms**: when the agent asks you to choose, a box appears in the conversation with the options and **Submit** and **Skip**. The rounds of questions of design, import and Drift resolution use the larger overlay instead.
- **Permission**: with approval set to `ask`, a box says `omp asks permission` and offers the options omp gives.

The message field grows up to about ten lines; **Enter** sends and **Shift+Enter** adds a line. While the agent works, the field stays active, with **Steer** and **Queue** to say whether the message changes what the agent is doing now or waits for the end of its turn. **Stop** asks for confirmation before it stops the agent's turn. Under the field, the **model selector** chooses the model for the next turn, and a small bar shows the subscription usage of the provider; click it for every provider.

```screenshot
scene: omp-chat-usage
alt: "The bottom of the omp Chat view with the message field, the Steer and Queue buttons, the model selector Claude Sonnet 5 and the bars of the subscription usage, 5h 18% and 7d 41%."
```

Closing the tab of a conversation whose agent is in a turn asks first.

```screenshot
scene: omp-chat-general
alt: "The omp Chat view on the right of the Board with the General conversation: a question about the states of an order, a collapsed Thinking block, a tool row and the agent's answer, and the message field with the model selector under it."
```

## General

**General** is the first tab, always there when the window has a folder open. It is a chat with omp in that folder for brainstorming: reasoning about the project and about Trama, exploring ideas, problems and alternatives. It reads the Model, the Requirements and the cards freely, and never starts a job by itself. The eraser button clears it and starts a new conversation.

```screenshot
scene: omp-chat-empty
alt: "The omp Chat view when General is empty, with the line Chat with omp in this folder and the message field, the Steer and Queue buttons, the model selector and the usage bars."
```

## Permissions

By default, omp Chat runs every command without asking (approval `yolo`). To have omp ask permission, as it does in the terminal, set **omp Chat Approval** to `ask`. **omp Chat Intent Tracing** has the agent write why it calls each tool; turn it off to save tokens.

## When you are away

Jobs in omp Chat can notify you when they finish or wait for you: see [Away notifications](/guide/panel-and-settings/notifications/).
