---
column: done
technical: false
refs:
  - announcement
drift: uynyodpc
proposal: null
agent: false
created: 2026-10-24T07:23:24.406Z
finished: 2026-10-24T07:25:06.961Z
unchanged: "Checked the code at withdrawWaiting (extension/src/host/announcements.ts) and endAgentWork (extension/src/host/agent.ts): the notice is sent only for cards, never for work (work kind filtered out). The Model no longer contains the conflicting rule lines (rules/ask-more and rules/omp-chat-general), and work/announcement.md says work withdrawn leaves without a notice. The code already matches it, so nothing changed."
---
# Fix code to match the Model: Rules contradict work announcement

## What happens

Withdrawing a pending work announcement sends no delivery-missed notice: withdrawWaiting filters work out of the notice, and endAgentWork ends the Ask more terminal without it.

## What should happen

rules/ask-more.md:19 and rules/omp-chat-general.md:14 require the delivery-missed notice for withdrawn pending announcements, while work/announcement.md:30-33 says work disappears without notices and is excluded. The Model contradicts itself; the Task nifnmoha was closed unchanged on the code side only.

## Chosen option

**Amend the two rule lines**

Change rules/ask-more.md:19 and rules/omp-chat-general.md:14 to match work/announcement.md:30-33: work withdrawn leaves without a notice. Matches the code as it is; costs one Proposal.

## Where in the code

extension/src/host/announcements.ts:42-52 (withdrawWaiting); extension/src/host/agent.ts:252-260 (endAgentWork)
