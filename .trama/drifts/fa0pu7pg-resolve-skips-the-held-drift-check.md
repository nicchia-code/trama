---
status: resolved
resolution: unified
refs:
  - drift-resolution/Free
  - drift-resolution/Answering a prepared question
  - requirements/rules#drift-resolution
proposal: null
task: null
origin: null
unifiedInto: 88lo546l
option: null
note: null
created: 2026-10-24T19:40:24.892Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# Resolve skips the held-Drift check

## What happens

Resolve without feedback does not check that its Drift is in no resolution: the check runs only with Rework feedback. So an agent can be launched on a Drift that a Draft or open resolution already holds, and the resolution it writes collides with the one that holds the Drift.

## What should happen

Resolve on a Drift that is part of a resolution, Draft or open, is refused whatever the feedback, as the Model says for the Free state and for answering a prepared question. The Drift stays with the resolution that holds it.

## Fix options

### Check the holding on every Resolve

Run the holding check of Rework before every Resolve, with or without feedback, and again before the agent of an answer starts. A Drift held by a resolution is then refused with the reason already written for Rework, and no second resolution is written for it. The change is one condition in the launch check; the Model and the Requirements stay as they are.

### Disable Resolve on held Drifts in the Board

Leave the host as it is and have the Board disable Resolve on a card whose Drift is held by a resolution, with the reason that the Drift is part of that resolution. This hides the case from the developer, but a message sent to the host for such a Drift would still be accepted, so it is weaker than the first option.

## Where in the code

extension/src/host/controller.ts, `launchAction`: `const holding = feedback !== undefined ? resolutionHolding(project, action.drift) : null;`.

## Prepared question

```json
{
  "question": {
    "id": "fa0pu7pg",
    "question": "Should Resolve be refused on a Drift that a Draft or open resolution already holds?",
    "context": "A Drift can be listed in a resolution that is still a Draft or open (for example a resolution born from a prepared question, which does not stop other Resolves). Rework with feedback refuses such a Drift, saying it is part of that resolution. Resolve, with or without a prepared question, and the agent started from an answer can instead go ahead on it, so a second resolution may be written for a Drift that already has one.",
    "options": [
      {
        "label": "Check the holding on every Resolve",
        "description": "Every Resolve, and the agent started from an answer, refuses a Drift held by a resolution, with the reason already used by Rework.",
        "details": "No second resolution can be written for the same Drift, whatever path starts it. One condition in the launch check; the Model and the Requirements stay as they are."
      },
      {
        "label": "Disable Resolve on held Drifts in the Board",
        "description": "The Board disables Resolve on a held Drift's card, saying which resolution holds it.",
        "details": "The developer sees why at once, but a request reaching the host for such a Drift would still be accepted, so it protects less than checking at launch."
      },
      {
        "label": "Let Resolve go ahead on held Drifts",
        "description": "Only Rework with feedback checks the holding; Resolve and the agent started from an answer do not.",
        "details": "No refusal for the developer, but two resolutions can collide on the same Drift. The Model and the Requirements must be updated to say that Resolve does not check the holding."
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
  "fingerprint": "8870bc579d5e6575262b00d1585f776438e9258db73bf1217593da3447eb58ed",
  "prepared": "2026-10-24T20:09:34.905Z"
}
```
