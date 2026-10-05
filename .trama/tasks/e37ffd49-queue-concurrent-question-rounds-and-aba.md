---
column: done
technical: false
refs:
  - question-round/Queued
  - question-round/Asking
  - question-round/Abandoned
  - question-round.ROUND_CLOSED
  - agent.STOP_WAITING
  - requirements/data#question-round
  - requirements/rules#question-round
  - requirements/tech#question-round
drift: null
proposal: d9680570
agent: false
created: 1970-01-01T00:00:00.033Z
---
# Queue concurrent question rounds and abandon only cancelled callers

Keep a FIFO queue per editor window and present only one whole round at a time, never interleaving questions. Finishing or abandoning the active round opens the oldest remaining round; cancelling a queued round removes only that round and does not disturb the active one. Observe native tool cancellation, MCP cancellation or disconnection, and CLI interruption or disconnection. Close only the affected controls, discard abandoned answers and leave no orphaned question or occupied queue slot. Trama imposes no answer deadline; a client timeout can be observed only through cancellation or disconnection. Keep pending state in memory for each round's lifetime.
