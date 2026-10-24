---
created: 2026-10-24T14:06:35.618Z
updated: 2026-10-24T14:06:35.618Z
summary: A To do Task can be deleted for good from the CLI, the Task details dialog and, on explicit request, by agents.
tasks:
  - c3f44iem
  - t3p1zn3e
  - w3rdu2g3
---
# Delete a Task in To do

deleteTask in src/core checks that the Task is in To do and not held by a Drift, and removes its files. trama task delete exposes it, the Task details dialog gets a confirmed Delete button, and the skills list deletion among the developer decisions an agent runs only when explicitly asked.
