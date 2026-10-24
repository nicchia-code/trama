---
created: 2026-10-24T15:41:22.455Z
updated: 2026-10-24T15:41:22.455Z
summary: Trama requires omp 18.12.6 or later and drops the leftovers of Copilot and older agents.
tasks:
  - 27zhworu
  - 6u4zrwwm
---
# Minimum omp and legacy cleanup

The installed omp version is read with `omp --version` before every launch and for General; an older or unreadable omp counts as missing. The Copilot cleanup in activation, opening check and Update skills is removed.
