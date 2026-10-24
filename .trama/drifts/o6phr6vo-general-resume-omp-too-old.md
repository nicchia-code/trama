---
status: resolved
resolution: dismissed
refs:
  - omp-chat-general/Resuming
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: onei1qvj
created: 2026-10-24T15:35:48.948Z
job: b2f6fe5f-e6ca-4c8b-b599-469b7a6d5dbb
---
# General resume, omp too old

## What happens

When General resumes a saved session and omp is missing or older than the minimum version, the **resume is abandoned**: the saved session is dropped and General starts again from scratch, showing the missing-omp (or too-old) error line. The earlier history stays visible but the agent no longer knows it.

## What should happen

The Model's **Resuming** state has only three exits: the session reopens, it does not reopen (a new session starts), or the developer clears General. It says nothing about omp being missing or too old at that moment, so the Model does not tell what happens to the saved session or to what the developer sees. The Task forced a choice, since the omp check now runs before every start.

## Fix options

### Drop session, show error

Keep what the code does: a failed omp check during a resume counts as not resumed, the saved session is discarded and the error line appears. Simple and always leaves General in a known state, but a developer who only needs to install omp loses the agent's memory of the conversation.

### Keep session, show error

On a failed omp check during a resume, leave General Stopped with the error line and keep the saved session, so installing or updating omp and writing again resumes the same conversation. Costs a way for General to stay Stopped with a saved session, which the Model has only for an omp that closed by itself.

## Where in the code

extension/src/host/omp-chat/general.ts, the resume path where `checkOmp` runs before the session is reopened

## Prepared question

```json
{
  "question": {
    "id": "o6phr6vo",
    "question": "What should General do when omp is missing or too old at the moment it resumes a saved session?",
    "context": "General reopens its saved session in a new omp process. Trama now checks the omp version before every start, so omp can turn out missing or older than 18.12.6 exactly then. The Model's Resuming state lists only three exits: the session reopens, it does not reopen (a new session starts), or the developer clears General. Today a failed omp check at that moment is treated as a session that did not reopen: the saved session is discarded, General starts anew and shows the error line, keeping the earlier history visible above.",
    "options": [
      {
        "label": "Drop the session and show the error",
        "description": "A failed omp check counts as not resumed: the session is discarded and the error line appears.",
        "details": "Simple and always leaves General in a known state. A developer who only needs to install or update omp loses the agent's memory of the conversation."
      },
      {
        "label": "Keep the session and show the error",
        "description": "General stays stopped with the error line and keeps the saved session, so after installing omp the next message resumes the same conversation.",
        "details": "Keeps the agent's memory. Costs a Stopped state with a saved session after a failed check, which the Model has only for an omp that closed by itself."
      },
      {
        "label": "The Model already covers it",
        "description": "A failed check is the not-resumed exit of Resuming (a new session starts, the old history stays visible), so no change is needed.",
        "details": "Nothing changes in code or Model; the developer is told that the not-resumed exit also covers a missing or too-old omp."
      }
    ],
    "recommended": 2,
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
  "fingerprint": "826b2aed20d9402e753217b7f7ac8ec5cfd45f432a6c76743c64c0da8dd9bb47",
  "prepared": "2026-10-24T15:41:53.480Z"
}
```
