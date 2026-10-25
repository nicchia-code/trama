---
status: resolved
resolution: unified
refs:
  - requirements/rules#omp-chat-general
  - requirements/tech#omp-chat-general
proposal: null
task: null
origin: null
unifiedInto: 88lo546l
option: null
note: null
created: 2026-10-24T19:39:19.082Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# General checks and updates omp

## What happens

Every start of General runs omp's update check and, when a newer omp exists, updates omp behind a progress notice in the editor, before its conversation opens.

## What should happen

General only finds omp and reads its version, with the minimum-version check. It runs no update check, no update and shows no notice; updates stay with the launches of jobs.

## Fix options

### Read the version only

General asks omp only for its version and applies the same minimum-version check, without the update check and without the update. A too-old omp still shows as General's error line with Install omp. This splits the version reader used by General from the update check used by the launches. A General start then no longer updates a stale omp; the next job launch still does.

### Reuse the last launch check

General runs no check of its own: it uses the outcome of the last launch check of this window and, when there is none, reads only the version of omp. It is one way to avoid the update, but the version General judges may be a little old, and its start depends on a launch having happened before in the window.

## Where in the code

extension/src/host/omp-chat/general.ts, open, at the checkOmp call (line 281); extension/src/host/agent.ts, generalDeps (checkOmp: checkedOmp, line 200); extension/src/host/omp-launch.ts, checkedOmp and showUpdating; extension/src/host/omp-update.ts, ensureOmpUpdated, which runs omp update --check and omp update.

## Prepared question

```json
{
  "question": {
    "id": "g0d81xed",
    "question": "Should General check and update omp when it starts?",
    "context": "General runs omp update --check on each start and updates omp when a newer version exists. The Model and the Requirements say General does not update omp at start.",
    "options": [
      {
        "label": "Read the version only",
        "description": "General reads the installed omp version at start and never updates it there."
      },
      {
        "label": "Reuse the last start check",
        "description": "General checks for an update at most once per period and reuses the last result."
      },
      {
        "label": "Keep the update at start",
        "description": "General keeps checking and updating omp at each start, as the code does today."
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
  "fingerprint": "239bd8ce9ab1c301e429a1e5a0d425fd7f9d43c0a878f0c011b49844e8696e64",
  "prepared": "2026-10-24T19:50:06.698Z"
}
```
