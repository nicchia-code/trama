---
column: done
technical: false
refs:
  - announcement
drift: 96cl1l0m
proposal: rqs3fipe
agent: false
created: 2026-10-24T06:39:25.059Z
finished: 2026-10-24T06:41:08.753Z
unchanged: "Checked extension/src/host/announcements.ts withdrawWaiting (line 42-52): it passes withdrawn announcements of kind work to describe(), so a work card gives no notice. extension/src/host/agent.ts endAgentWork (line 252-260) ends Ask more's terminal and calls withdrawWaiting for that terminal's announcements, so the work card disappears silently, as work/announcement.md says. Code already matches; no change."
---
# Fix code to match the Model: Ask more notice contradicts Model

## What happens

When Ask more ends, its waiting work card disappears with no delivery-missed notice. The code filters out work announcements from the withdrawal notice (withdrawWaiting), so the Task text of Ask more's announcement withdrawal is not followed.

## What should happen

rules/ask-more.md:19 and rules/omp-chat-general.md:14 say the pending announcements of Ask more are withdrawn with the notice that delivery was missed. work/announcement.md lines 30-33 say a work disappears without notices and is excluded from withdrawal notices. The two Model statements contradict each other, so a Task cannot follow both.

## Chosen option

**Silence for work, amend rules**

Ask more's work card disappears with no notice, as work/announcement.md says. The notice requirement in rules/ask-more.md:19 and rules/omp-chat-general.md:14 is dropped by a Model change. The code already does this; no code change.

## Where in the code

extension/src/host/announcements.ts (withdrawWaiting filters kind work out of the notice); extension/src/host/agent.ts (endAgentWork and the Ask more terminal end)
