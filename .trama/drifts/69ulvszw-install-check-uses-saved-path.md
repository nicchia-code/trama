---
status: resolved
resolution: unified
refs:
  - setup-wizard/omp
  - requirements/rules#setup-wizard
proposal: null
task: null
origin: null
unifiedInto: 88lo546l
option: null
note: null
created: 2026-10-24T19:43:09.419Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# Install check uses saved path

## What happens

When the omp installer terminal ends, the omp step checks omp at the path saved in the settings, not at the path the step shows. If the developer typed another path and did not save it, the answer is for a path the step does not show, so the step drops it and keeps showing the check in progress, with Next unavailable.

## What should happen

When the installer terminal ends, the omp step checks omp again at the path it shows, saved or not, so that its status and Next follow that path, as every other check of the step does.

## Fix options

### Check the path on view

When the installer terminal ends, the step asks for a check of the path it shows at that moment, saved or not, as the login terminal already does. The answer then matches the path on view, and Next follows it at once. The Settings tab keeps checking its saved path, as today. The cost is a small change to what the installer terminal passes along when it ends, and no change to the Model or the Requirements.

### Re-check on a mismatched answer

When an answer arrives for a path other than the one the step shows, the step asks again for the path it shows instead of waiting for a result that never comes. The install check keeps the saved path. The cost is one extra check when the developer changes the path during an install, and the step keeps waiting for a moment when the path it shows has never been checked.

## Where in the code

extension/src/host/controller.ts, method installOmp (its callback calls checkAgent with the saved omp path); extension/src/webview/wizard/controller.ts, method receiveAgentCheck (drops answers for another path).

## Prepared question

```json
{
  "question": {
    "id": "69ulvszw",
    "question": "Which omp path should the omp step check when the omp installer terminal ends?",
    "context": "In the omp step of the setup wizard, when omp is missing, `Install omp` opens a terminal with the official omp installer, and when that terminal ends the step checks omp again. Every other check of the step (when it is shown, when its path changes, after a login terminal) uses the omp path the step shows, saved or not. The check after the installer can instead use the omp path saved in the settings: if the developer typed another path in the step without saving it, the outcome belongs to a path the step does not show, so the step discards it and keeps its earlier outcome, and Next stays unavailable.",
    "options": [
      {
        "label": "Check the path on view",
        "description": "When the installer ends, the step checks the path it shows at that moment, saved or not, as after a login terminal.",
        "details": "The outcome always matches the path on view and Next follows it at once. The Settings tab keeps checking its saved path. Small change to what the install request carries; no Model or Requirement change."
      },
      {
        "label": "Re-check on a mismatched answer",
        "description": "When an outcome arrives for another path, the step asks again for the path it shows instead of discarding it.",
        "details": "The install check keeps using the saved path. Costs one extra check when the path changed during an install, and the step waits briefly for a path never checked."
      },
      {
        "label": "Check the saved path",
        "description": "When the installer ends, the check uses the saved omp path; with another unsaved path on view, the step keeps its earlier outcome.",
        "details": "No code change. The attached Proposal writes this exception into the Model of the omp step and the setup wizard rules and tech Requirements; the developer must save the path, or show the step again, to see a new outcome."
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
  "fingerprint": "805de00b0216653fdbf479ba055a58726cb9a9c7ccc213edccdef774d85b75e8",
  "prepared": "2026-10-24T20:09:24.937Z"
}
```
