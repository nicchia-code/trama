---
status: resolved
resolution: unified
refs:
  - requirements/ui#omp-chat-general
  - omp-chat-general/Kept after switch-off
proposal: null
task: null
origin: null
unifiedInto: 88lo546l
option: null
note: null
created: 2026-10-24T19:39:19.096Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# Kept General close dialog wording

## What happens

Closing General while it is kept after omp Chat was switched off asks Clear General and stop its agent?, with a Clear button, the wording used for clearing it.

## What should happen

Closing the kept General uses the same confirmation as closing any other conversation, named General: Close General and stop its agent?, with a Close button.

## Fix options

### Use the shared close dialog

The kept General asks with the close dialog of the other conversations, with its name General, as the requirement says. The close path of General passes its name to the same wording and the same button that the other conversations use. Only the text and the button change; the behaviour of the close stays the same.

### Route through the conversations close

The close of the kept General hands over to the close code the other conversations use, so the wording and the button come from one place and cannot drift apart again. It costs a small coupling between General and the conversations, since General's close then goes through their hook.

## Where in the code

extension/src/host/omp-chat/general.ts, close (lines 177-183) and the constants CLEAR_MESSAGE, CLEAR_DETAIL and CLEAR_BUTTON (lines 72-74); the dialog of the other conversations is in extension/src/host/omp-chat/conversations.ts, line 246.

## Prepared question

```json
{
  "question": {
    "id": "w9zg7h1z",
    "question": "How should closing General, kept after omp Chat was switched off, confirm while its agent is in a turn?",
    "context": "When omp Chat is switched off while General's agent is in a turn, General stays in the view and its tab closes it instead of clearing it. Closing it while the agent is still in a turn asks for confirmation. The Requirements say that confirmation is the close dialog of the other conversations, named `General` («Close General and stop its agent?», button `Close`); the dialog used for clearing General is «Clear General and stop its agent?», button `Clear`.",
    "options": [
      {
        "label": "Use the shared close dialog",
        "description": "General's close passes its name to the same wording and `Close` button as the other conversations; only the text and button change.",
        "details": "Matches the Requirements with the smallest change; the wording still lives in two places, so it can diverge again."
      },
      {
        "label": "Route through the conversations close",
        "description": "The kept General's close goes through the close code of the other conversations, so wording and button come from one place.",
        "details": "Prevents future divergence, at the cost of a small coupling between General and the conversations' close hook."
      },
      {
        "label": "Keep the clear dialog for the close",
        "description": "Closing the kept General asks «Clear General and stop its agent?» with the `Clear` button, the same dialog as clearing it; the Requirements are updated to say so.",
        "details": "No code change; the close of a kept General reads as a clear, although no new conversation starts after it."
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
  "fingerprint": "3de1071ebffb1d390641896cc777613d7d713771dab31b506e76d567104c5cd7",
  "prepared": "2026-10-24T20:08:58.981Z"
}
```
