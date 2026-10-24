---
status: open
resolution: null
refs:
  - announcement
proposal: null
task: null
origin: p3zcrvmt
option: null
note: null
created: 2026-10-24T06:13:56.919Z
job: d2ab117d-f663-4230-b750-6dbc790a74f5
---
# Ask more notice contradicts Model

## What happens

When Ask more ends, its waiting work card disappears with no delivery-missed notice. The code filters out work announcements from the withdrawal notice (withdrawWaiting), so the Task text of Ask more's announcement withdrawal is not followed.

## What should happen

rules/ask-more.md:19 and rules/omp-chat-general.md:14 say the pending announcements of Ask more are withdrawn with the notice that delivery was missed. work/announcement.md lines 30-33 say a work disappears without notices and is excluded from withdrawal notices. The two Model statements contradict each other, so a Task cannot follow both.

## Fix options

### Silence for work, amend rules

Ask more's work card disappears with no notice, as work/announcement.md says. The notice requirement in rules/ask-more.md:19 and rules/omp-chat-general.md:14 is dropped by a Model change. The code already does this; no code change.

### Notice for work, amend Model

A Proposal changes work/announcement.md so that a withdrawn work shows the delivery-missed notice. Withdrawal in withdrawWaiting must then include work announcements, and the notice must show when Ask more ends or its terminal closes.

## Where in the code

extension/src/host/announcements.ts (withdrawWaiting filters kind work out of the notice); extension/src/host/agent.ts (endAgentWork and the Ask more terminal end)

## Prepared question

```json
{
  "question": {
    "id": "96cl1l0m",
    "question": "When Ask more ends, its waiting work card disappears. Should the developer also see a delivery-missed notice?",
    "context": "rules/ask-more.md:19 and rules/omp-chat-general.md:14 require the notice. work/announcement.md lines 30-33 say a work disappears without notices. The code follows work/announcement.md (withdrawWaiting filters work out of the notice). Trama cannot follow both.",
    "options": [
      {
        "label": "Silence for work",
        "description": "Keep the Model's silence for works: no notice. The notice requirement in rules/ask-more.md:19 and rules/omp-chat-general.md:14 is removed by a Model change. No code change.",
        "details": "Matches the current code."
      },
      {
        "label": "Notice for work",
        "description": "Change work/announcement.md so a withdrawn work shows the delivery-missed notice. Code: withdrawWaiting must include work announcements, and the notice shows when Ask more ends or its terminal closes.",
        "details": "Needs a Model change and code changes in extension/src/host/announcements.ts and extension/src/host/agent.ts."
      },
      {
        "label": "Dismiss",
        "description": "Close this Drift without a change.",
        "details": "Leaves the contradiction in the Model."
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
      "decision": "dismissed"
    }
  ],
  "fingerprint": "e52f55c632161241f9db8239124e143f68364a428e97e771a9c3984936e52423",
  "prepared": "2026-10-24T06:14:16.630Z"
}
```
