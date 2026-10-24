---
status: approved
base: {}
delete: []
created: 2026-10-24T07:27:29.326Z
label: Work withdrawal notice
---
# Work withdrawal leaves without notice

# Work withdrawal leaves without notice

The developer chose to amend the rules, not the code: a withdrawn pending work announcement leaves without a delivery-missed notice, as `work/announcement.md` already says. The code (`withdrawWaiting` in `extension/src/host/announcements.ts`, `endAgentWork` in `extension/src/host/agent.ts`) already behaves this way.

## Changes

- `requirements/rules/ask-more.md:19`: the pending announcements withdrawn with the delivery-missed notice exclude work announcements. A work announcement leaves without a notice.
- `requirements/rules/omp-chat-general.md:14`: the same exclusion for the pending announcements withdrawn when the General process ends, is cleared, closes or the window closes.

Card announcements (Proposal, Drift, Task, check, comparison) keep the notice.

## Drift

Drift `uynyodpc` (Rules contradict work announcement) was dismissed by mistake when Task `w91rtknk` was closed as unchanged; this Proposal is the change the developer chose for it.
