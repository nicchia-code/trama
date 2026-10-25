---
created: 2026-10-24T17:33:03.699Z
updated: 2026-10-24T17:33:03.699Z
summary: The Settings tab and the setup wizard's omp step list seven subscription providers with their connected state and open a visible terminal that runs omp login for the chosen one.
tasks:
  - 9xge4cbm
  - o1a7iy91
  - z1ysafmx
cleared:
  z1ysafmx:
    title: Login fornitori nel wizard
    proposal: sokn5mx0
    tag: Login fornitori
    finished: 2026-10-24T17:31:29.474Z
    refs:
      - setup-wizard/omp
      - requirements/rules#setup-wizard
      - requirements/ui#setup-wizard/omp
  o1a7iy91:
    title: Login fornitori in Settings
    proposal: sokn5mx0
    tag: Login fornitori
    finished: 2026-10-24T17:28:22.390Z
    refs:
      - panel/Settings
  9xge4cbm:
    title: "Login fornitori: host e terminale"
    proposal: sokn5mx0
    tag: Login fornitori
    finished: 2026-10-24T17:27:02.842Z
    refs:
      - developer.LOG_IN_PROVIDER
      - requirements/rules#developer.LOG_IN_PROVIDER
      - requirements/tech#developer.LOG_IN_PROVIDER
      - requirements/ui#developer.LOG_IN_PROVIDER
      - requirements/quality#developer.LOG_IN_PROVIDER
---
# Log in to model providers

A fixed list of seven providers (OMP_LOGIN_PROVIDERS) is shared by host and webview. Connected state comes only from the provider field of the usable models in omp models --json, carried as providers on ompStatus and agentCheck. The ompLogin message opens a new terminal named Log in to <provider>, and when the command ends Trama silently rechecks omp, the models and the providers. The Providers section is mounted in the Settings omp group and in the wizard omp step, whose Next now needs at least one usable model.
