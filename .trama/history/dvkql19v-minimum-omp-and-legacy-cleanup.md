---
created: 2026-10-24T15:41:22.455Z
updated: 2026-10-24T15:41:22.455Z
summary: Trama requires omp 18.12.6 or later and drops the leftovers of Copilot and older agents.
tasks:
  - 27zhworu
  - 6u4zrwwm
cleared:
  27zhworu:
    title: Minimum omp version
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:35:04.695Z
    refs:
      - agent-launching
      - requirements/ui#agent-launching
  6u4zrwwm:
    title: Remove legacy agent code
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:04:13.786Z
    refs:
      - requirements/tech#project
      - requirements/tech#agent-launching
---
# Minimum omp and legacy cleanup

The installed omp version is read with `omp --version` before every launch and for General; an older or unreadable omp counts as missing. The Copilot cleanup in activation, opening check and Update skills is removed.
