---
status: resolved
resolution: unified
refs:
  - omp-chat-conversation/Agent running
  - omp-chat-conversation/Closed
proposal: null
task: null
origin: null
unifiedInto: 88lo546l
option: null
note: null
created: 2026-10-24T19:41:34.167Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# Empty Ask more on window close

## What happens

When the window closes while an Ask more conversation is still empty, waiting for its first message, Trama puts that conversation in Waiting for the window, as it does for any conversation. The Model says it goes to Closed, since nothing of it is saved and nothing can resume it. The empty conversation also starts at rest, while the Model starts every conversation in Agent running.

## What should happen

An empty Ask more conversation that the window closes ends at once, in Closed, as the Model says, and its process stops.

## Fix options

### Close empty Ask more at once

On window close, an Ask more conversation that has not received its first message goes straight to Closed: its process stops, nothing is saved and nothing waits for the window. This needs the empty state told apart from a conversation at rest, because a conversation at rest waits for the window and is saved. The change touches only the close path and the state an empty conversation has when it opens. Cost: one more flag on the conversation, kept while it stays empty.

### Start empty Ask more in Agent running

Open an empty Ask more in Agent running, the initial state of the Model, and let a window close from there go to Closed when no first message was sent. The conversation stays empty and sends nothing until its first message, as now. Cost: the running state of an empty conversation must not show as a working agent in the view, so the view keeps its own check on whether a first message was sent.

### Keep waiting, nothing is saved

Leave the empty Ask more in Waiting for the window, as the code does now. Nothing is saved for it, so after the reload nothing resumes and the developer sees the same as with Closed. The Model keeps its Closed transition unchanged; the difference stays internal. Cost: the Diagram and the code disagree on one arrow, and an empty conversation stays in the memory of the window until the window closes.

## Where in the code

extension/src/host/omp-chat/conversations.ts: openHeld, where the state is set to idle (around line 186), and windowClosed (around line 257); src/core/omp-chat-conversation.ts: conversationStep, the idle state on editor.WINDOW_CLOSED (around line 156).

## Prepared question

```json
{
  "question": {
    "id": "57h5c02q",
    "question": "What should happen to an empty Ask more conversation when the window closes?",
    "context": "An Ask more conversation opens empty and waits for the developer's first message; nothing of it is saved until that message is sent. The Model says that when the window closes or reloads, such an empty conversation goes straight to Closed: its process stops and it never comes back. Every other conversation goes to Waiting for the window, keeps its saved entry and is resumed when a window reopens the project. The Model also starts every conversation in Agent running.",
    "options": [
      {
        "label": "Close empty Ask more at once",
        "description": "On window close the empty conversation goes straight to Closed and its process stops; nothing waits for the window.",
        "details": "The conversation must tell its empty state apart from a conversation at rest, since one at rest waits for the window and is saved. Only the close path and the opening state change. Cost: one more flag on the conversation while it stays empty."
      },
      {
        "label": "Start empty Ask more in Agent running",
        "description": "The empty conversation opens in Agent running, the Model's initial state, and a window close from there goes to Closed.",
        "details": "The conversation still sends nothing until the first message. Cost: the view must keep its own check on whether a first message was sent, so an empty conversation does not show a working agent."
      },
      {
        "label": "Keep waiting, Model unchanged",
        "description": "The empty conversation goes to Waiting for the window like any other; the Model keeps its Closed transition.",
        "details": "Nothing is saved for it, so after the reload nothing resumes and the developer sees the same as with Closed. Cost: the diagram and the conversation disagree on one arrow, and the empty conversation stays in the window's memory until the window is gone."
      },
      {
        "label": "Model says it waits for the window",
        "description": "The Model drops the Closed transition: an empty Ask more goes to Waiting for the window like any other, and since nothing is saved it never comes back.",
        "details": "The developer sees the same as with Closed: the process ends with the window and nothing returns after the reload. The Model and the conversation agree; nothing changes in the code."
      }
    ],
    "recommended": 3,
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
      "decision": "fix-code",
      "option": 3
    },
    {
      "decision": "proposal"
    }
  ],
  "fingerprint": "e58ead5bb560d0f7cb93d9e68fb4448108573b41d5de4178a0c04d17e3f042cb",
  "prepared": "2026-10-24T20:09:57.834Z"
}
```
