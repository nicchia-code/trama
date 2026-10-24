---
created: 2026-10-24T17:33:03.699Z
updated: 2026-10-24T17:33:03.699Z
summary: The Settings tab and the setup wizard's omp step list seven subscription providers with their connected state and open a visible terminal that runs omp login for the chosen one.
tasks:
  - 9xge4cbm
  - o1a7iy91
  - z1ysafmx
---
# Log in to model providers

A fixed list of seven providers (OMP_LOGIN_PROVIDERS) is shared by host and webview. Connected state comes only from the provider field of the usable models in omp models --json, carried as providers on ompStatus and agentCheck. The ompLogin message opens a new terminal named Log in to <provider>, and when the command ends Trama silently rechecks omp, the models and the providers. The Providers section is mounted in the Settings omp group and in the wizard omp step, whose Next now needs at least one usable model.
