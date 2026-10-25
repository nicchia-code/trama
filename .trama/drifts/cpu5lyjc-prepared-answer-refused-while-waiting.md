---
status: resolved
resolution: unified
refs:
  - drift-resolution/Answering a prepared question
  - drift-resolution/Resolving
  - requirements/rules#drift-resolution
proposal: null
task: null
origin: null
unifiedInto: 88lo546l
option: null
note: null
created: 2026-10-24T19:40:24.875Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# Prepared answer refused while waiting

## What happens

When the developer answers a Drift's prepared question with free text, or with an option that needs the agent, and another resolution that is not born from a prepared question is still a Draft or open, Trama refuses to launch the resolution agent. The answer is lost: the round is closed, nothing is written, and the Drift stays open with its question prepared.

## What should happen

An answer that needs the agent starts it even while another resolution awaits a decision. The developer may answer several Drifts in a row and decide the waiting cards later, and the resolution the agent writes from that answer is born from a prepared question, so it blocks nothing.

## Fix options

### Start the agent from the answer

Skip the check that another resolution awaits a decision when the launch comes from an answer, and have the agent write its resolution marked `prepared: true`, so that it stops no other Resolve. The developer's answer is kept and nothing in the Model or the Requirements changes. The change is confined to the launch check and to the instruction given after an answer.

### Keep the answer until cards are decided

Do not refuse the answer: keep it on the Drift, as its waiting prepared question, and launch the agent from it only once no other resolution awaits a decision. The answer survives, the developer's order is kept, and the Drift's card shows that it waits. It needs one more state on the Drift and the same checks on the next Resolve.

## Where in the code

extension/src/host/controller.ts, `resolvePrepared` (it calls `launchAction` with the answer) and the `resolve-drifts` refusal in `launchAction`, where `resolveDriftBlocker` checks awaiting resolutions whenever an answer is given.

## Prepared question

```json
{
  "question": {
    "id": "cpu5lyjc",
    "question": "What should happen to a prepared-question answer that needs the agent while another resolution awaits a decision?",
    "context": "With the Async Drift Resolver on, answering a Drift's prepared question with free text (or with a choice whose resolution fails the hand-over) needs the resolution agent. If at that moment another resolution not born from a prepared question is a Draft or open, the agent launch can be refused: the round is already closed, nothing is written and the Drift stays open with its question prepared. The Model says resolutions born from a prepared question block nothing, and answering several Drifts in a row is expected.",
    "options": [
      {
        "label": "Start the agent from the answer",
        "description": "The answer always launches the agent, which writes a resolution marked as born from a prepared question.",
        "details": "The developer's answer is never lost and the waiting resolution is unaffected, since the new one blocks nothing. Only the launch check and the instruction after an answer change; Model and Requirements stay as they are."
      },
      {
        "label": "Keep the answer until cards are decided",
        "description": "The answer is stored on the Drift and the agent starts from it once no other resolution awaits a decision.",
        "details": "Nothing is lost and the developer's order is kept, but the Drift needs one more waiting state and the next Resolve needs the same checks."
      },
      {
        "label": "Refuse the launch and drop the answer",
        "description": "The launch is refused with the reason naming the waiting resolution; the answer is discarded and the question stays prepared.",
        "details": "No new waiting state and no launch while a decision is pending, but the developer must answer the question again after deciding the waiting resolution. The Model and the Requirements must be updated to say so."
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
  "fingerprint": "d403785218c4fda19f8bb259f78ae34a3121ae585befe47e9ebb3f597172c2a3",
  "prepared": "2026-10-24T20:09:34.650Z"
}
```
