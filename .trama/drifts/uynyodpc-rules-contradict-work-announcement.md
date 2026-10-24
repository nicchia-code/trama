---
status: resolved
resolution: dismissed
refs:
  - announcement
proposal: null
task: w91rtknk
origin: null
option: 1
note: null
resolvedBy: h12l94sa
created: 2026-10-24T06:48:44.840Z
job: 78ef7294-26b6-459d-88cf-ae734309523b
---
# Rules contradict work announcement

## What happens

Withdrawing a pending work announcement sends no delivery-missed notice: withdrawWaiting filters work out of the notice, and endAgentWork ends the Ask more terminal without it.

## What should happen

rules/ask-more.md:19 and rules/omp-chat-general.md:14 require the delivery-missed notice for withdrawn pending announcements, while work/announcement.md:30-33 says work disappears without notices and is excluded. The Model contradicts itself; the Task nifnmoha was closed unchanged on the code side only.

## Fix options

### Amend the two rule lines

Change rules/ask-more.md:19 and rules/omp-chat-general.md:14 to match work/announcement.md:30-33: work withdrawn leaves without a notice. Matches the code as it is; costs one Proposal.

### Notify work withdrawals too

Change withdrawWaiting and endAgentWork to send the delivery-missed notice for work as well, as the rules say. Costs a code change and contradicts work/announcement.md:30-33, so that file would need amending too.

## Where in the code

extension/src/host/announcements.ts:42-52 (withdrawWaiting); extension/src/host/agent.ts:252-260 (endAgentWork)

## Prepared question

```json
{
  "question": {
    "id": "uynyodpc",
    "question": "Which side should change for withdrawn pending work announcements?",
    "context": "rules/ask-more.md:19 and rules/omp-chat-general.md:14 require a delivery-missed notice for withdrawn pending announcements. work/announcement.md:30-33 says work leaves without any notice. The code (extension/src/host/announcements.ts:42-52, extension/src/host/agent.ts:252-260) sends no notice for work.",
    "options": [
      {
        "label": "Amend the two rule lines",
        "description": "The rules match work/announcement.md: work leaves without a notice, card announcements keep theirs.",
        "details": "Changes rules/ask-more.md:19 and rules/omp-chat-general.md:14. The code stays as it is."
      },
      {
        "label": "Notify work withdrawals too",
        "description": "The code sends the delivery-missed notice for work, as the rules say.",
        "details": "Changes withdrawWaiting and endAgentWork. work/announcement.md:30-33 must be amended too, because it says work leaves without notices."
      },
      {
        "label": "Keep the work withdrawal silent in the Model",
        "description": "The Model states that work leaves without a notice, and the rules are changed to say the same.",
        "details": "Same rule changes as the first option, carried by the attached Proposal oxc80kci."
      }
    ],
    "recommended": 0,
    "multi": false
  },
  "decisions": [
    {
      "decision": "fix-code",
      "option": 1
    },
    {
      "decision": "fix-code",
      "option": 2
    },
    {
      "decision": "proposal"
    }
  ],
  "fingerprint": "e52f55c632161241f9db8239124e143f68364a428e97e771a9c3984936e52423",
  "prepared": "2026-10-24T07:20:30.469Z"
}
```
