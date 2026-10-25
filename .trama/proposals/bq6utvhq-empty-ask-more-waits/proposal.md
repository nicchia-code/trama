---
status: discarded
base:
  agent-launching/omp-chat-conversation.md: 2fb7ed535eabc689d99aa2bcba58812fa968f940537de3096d55bc217a1d91b8
delete: []
created: 2026-10-24T20:09:04.534Z
label: omp-chat-empty-ask-more
---
# Empty Ask more waits

Choices for the Drift 57h5c02q: what happens to an Ask more conversation that is still empty, waiting for its first message, when the window closes. Written as a Draft for the prepared question; the resolution writes the changes.

The Model says what the code does: the empty conversation goes to Waiting for the window like any other one, its process ends with the window, and since nothing of it is saved no window resumes it. The `editor.WINDOW_CLOSED` → Closed transition for an empty Ask more is removed.
