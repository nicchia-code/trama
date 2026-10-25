---
status: resolved
resolution: unified
refs:
  - setup-wizard/omp
  - requirements/ui#agent-launching
  - requirements/rules#setup-wizard
proposal: null
task: null
origin: null
unifiedInto: 88lo546l
option: null
note: null
created: 2026-10-24T19:43:09.434Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# Too-old omp lets Next go

## What happens

An omp older than the minimum version that Trama cannot update still answers with its models, so the omp step lets the developer go on to Models. The step only shows the warning in place of the version, and the work would stop later.

## What should happen

While omp is older than the minimum version, the omp step does not let the developer go on: Next stays unavailable, and the step says why, with the same sentence as its warning.

## Fix options

### Block Next on too-old omp

Next of the omp step stays unavailable while omp is older than the minimum version, and its tooltip says the same sentence as the warning. The developer then installs omp or changes its path in the step, and the check runs again. The check already knows the version, so this is one extra condition on the step and no new check. A developer with an old omp cannot leave the step until omp is updated.

### Let Next go with a warning

Next keeps working for an older omp, and the warning stays on the step as it is now. The developer reaches Models and sees the models omp lists. The work stops later, when a launch finds the older omp. This keeps today's behaviour and the step quick, but it lets the developer continue with an omp that Trama will not run.

## Where in the code

extension/src/webview/wizard/logic.ts, function nextBlock (case omp); extension/src/host/controller.ts, method checkAgent (ok depends only on the list of models, the minimum version is added afterwards as tooOld).

## Prepared question

```json
{
  "question": {
    "id": "b7i4ib4g",
    "question": "Should the omp step block Next while omp is older than the minimum version?",
    "context": "Trama needs omp at or above the minimum version. Today an older omp that still answers with its models shows a warning on the omp step in place of the version, and Next goes on to Models. The work would then stop later, when a launch finds the older omp.",
    "options": [
      {
        "label": "Block Next until omp is updated",
        "description": "Next stays unavailable while omp is older than the minimum, with the same sentence as the warning as its reason. The developer installs omp or changes its path, and the check runs again."
      },
      {
        "label": "Let Next go with a warning",
        "description": "Next keeps working for an older omp, and the warning stays on the step. The developer reaches Models and the work stops later, at launch."
      },
      {
        "label": "Keep the step as it is",
        "description": "The omp step keeps its current rules: Next depends only on omp answering with at least one model, and the older-omp warning stays on the step as a notice."
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
  "fingerprint": "dd1c98109304862f9bb1c9e398fc314c83d59e37b70de300be77345d79df3ff2",
  "prepared": "2026-10-24T19:49:27.902Z"
}
```
