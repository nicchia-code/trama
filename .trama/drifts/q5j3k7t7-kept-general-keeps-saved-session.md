---
status: resolved
resolution: unified
refs:
  - requirements/data#omp-chat-general
  - requirements/rules#omp-chat-general
proposal: null
task: null
origin: null
unifiedInto: 88lo546l
option: null
note: null
created: 2026-10-24T19:39:19.111Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# Kept General keeps saved session

## What happens

When omp Chat is switched off while General's agent is in a turn, General stays and its saved session stays in the window's saved entry, until the window closes or the next start.

## What should happen

The saved entry of General is dropped as soon as General stays after the switch-off, so a kept General never resumes.

## Fix options

### Drop the entry on entering kept

The move from Ready into kept drops the saved entry at once, as the requirement says: the transition gets the discard effect. A window reload while General is kept then starts General empty, which the requirement already implies for a kept General. This changes only the transition that enters the kept state.

### Drop it when the switch-off arrives

The host removes the saved entry in the settings handler, when omp Chat is off and General's agent is in a turn, before the machine enters kept. The core machine stays as it is, but the host and the machine must then agree by hand on what a kept General does with its entry.

## Where in the code

src/core/omp-chat-general.ts, the ready case on settings with omp Chat off (line 97); extension/src/host/omp-chat/general.ts, settings (line 162), which never discards the saved entry for a kept General.

## Prepared question

```json
{
  "question": {
    "id": "q5j3k7t7",
    "question": "When should the saved session of General be dropped once General stays after omp Chat is switched off?",
    "context": "General's session is saved for the window so it can be resumed after a reload. When omp Chat is switched off while General's agent is in a turn, General stays (kept) until the developer closes it, its omp exits or the window closes; each of those drops the saved session. The Requirements say the saved session is dropped as soon as General stays after the switch-off, so a kept General is never resumed.",
    "options": [
      {
        "label": "Drop the entry on entering kept",
        "description": "The move into the kept state drops the saved session at once; only that transition changes.",
        "details": "Matches the Requirements; a window that ends abruptly while General is kept cannot leave a session behind to resume."
      },
      {
        "label": "Drop it when the switch-off arrives",
        "description": "The settings handler drops the saved session before General becomes kept; the state machine stays as it is.",
        "details": "Same result for the developer, but the host and the state machine must agree by hand on what a kept General does with its saved session."
      },
      {
        "label": "Keep it until the kept General ends",
        "description": "The saved session stays while General is kept and is dropped when it disappears (closed, its omp exited, or the window closed); the Requirements are updated to say so.",
        "details": "No code change; if the window ends without closing General normally, the session may still be saved at the next start."
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
  "fingerprint": "1bc6c089d0464d50fa668d41c36e5ddc3c3c587494aedbb1ad177c37a50fb1a4",
  "prepared": "2026-10-24T20:09:09.847Z"
}
```
