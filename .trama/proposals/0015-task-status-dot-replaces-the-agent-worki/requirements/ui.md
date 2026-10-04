---
description: "Use when building or changing screens, layout, styling, components, navigation look or texts shown to users."
---
# Interface

## General

## panel/Board
- A design card shows the Proposal's title, a counter of finished Tasks over all its Tasks (for example "2/5 done") and the Run this design button. It is closed when the Board first shows and stays as the developer left it while the Board refreshes during the session; closing the panel forgets which cards were open.
- An expanded design card lists its Tasks in creation order. Each sub-item shows the Task's title, its status dot and the same move buttons a normal card has.
- Dragging a design card is refused. Moving a Task of a design is done only with its own buttons.
- Every Task card, and every Task row of a design card, starts with a status dot, to the left of the Task's ID or title. The dot tells To do (hollow, muted), In progress (warning colour) and Done (green) apart by colour, and carries a text label (tooltip and accessible name) with the column's name, so the colour is never the only signal.
- The dot of a Task taken by the agent is in the accent colour and pulses; its label is "Agent working". The pulse stops when the system asks for reduced motion, leaving a still dot in the accent colour. No Task shows an "agent working" badge; no other dot is animated.
- A Task taken by the agent has its two move arrows disabled and the card cannot be dragged. Each disabled control has a tooltip and an accessible description saying that the agent is working on the Task. The card has a Take back button, enabled, that is not shown on other Tasks.
- A blocked Task, on its own card or inside a design card, shows a badge "blocked" with the number of the Drift, or "waiting" with the number of the fix Task. The badge links to that Drift on the Diagram, or to the card of that Task. It has a tooltip and an accessible name saying why the Task is blocked, so colour is never the only signal. The badge does not disable any control: the developer can still move the Task.
- Inside a design card the same applies to each Task taken by the agent, on its own row. Run this design and Run all To do are disabled, with a tooltip naming the Task or saying that an agent is working, while a relevant Task is taken.

- The Board shows no Proposal the agent is still writing.
- The Diagram's Proposal selector and the Requirements tab list only handed-over (open) Proposals.

## task
- `trama board` lists Proposals the agent is still writing in their own group, "In writing", marked "(draft)", apart from the Proposals to decide, and `trama proposal list` marks them "(draft)". The agent tools show the same.
- `trama board` lists each design once, in its derived column, with the Proposal's ID and title and its Tasks underneath, each with its own column. Tasks that belong to no design, and designs of a single Task, are listed as before.
- `trama task list` stays a flat list grouped by column, so every Task can still be found; each Task shows the ID of the Proposal it comes from when it has one. The agent tools show the same.
- A Task taken by the agent is marked "(agent working)" in `trama board` and `trama task list`, and in the agent tools' output.
- A blocked Task is marked "(blocked by Drift <id>)", or "(waiting for Task <id>)" when it waits for the Task that fixes its Drift, in `trama board`, `trama task list`, `trama task show` and the agent tools' output. When several Drifts block it, all are listed.
- A Drift's own view (`trama drift show`) does not list the Tasks it blocks.

## question-round
- Show questions with the editor's native top-of-window Quick Pick, not a webview, editor chat question widget or terminal prompt. Open the active round immediately, without a notification that must be clicked first. Losing focus must not dismiss its controls.
- Show one question at a time with the title `<agent> — Question <step> of <total>` and the question as the placeholder. Use the MCP client's name, `Copilot` for the native tool and `trama ask` for a CLI invocation.
- Keep options in the order supplied by the agent. Show each option's label and tradeoff description. Mark the recommended option with `(recommended)`, make it active for a single-choice question and checked for a multiple-choice question on the first visit. A revisit restores the developer's answer instead of reapplying the default.
- Single-choice questions accept one option; multiple-choice questions show checkboxes and accept a set. The recommendation marker and the `Other…` label are presentation only and must not alter the original labels returned to the agent.
- Put `Other…` after the supplied options. Choosing it opens a native input box for a free answer. In a multiple-choice question, choosing Other alongside ordinary options preserves those choices while the free answer is written.
- Show the native Back button from the second question onwards; it opens the preceding question with its answer preserved. The free-answer input has a Back button that returns to the same question. Empty free text is refused with visible validation feedback.
- Escape on a question opens a confirmation Quick Pick with `Skip this one`, `Skip all` and `Go back`. Escape on that confirmation is the same as `Go back`; neither changes an answer. Escape on the free-answer input returns to the same question without accepting the text.
- Use English for interface labels. Question text, option labels and descriptions remain in the language supplied by the agent.
- Accepting or skipping the last question, or choosing `Skip all`, returns the round immediately; do not add a final review or Send step.
