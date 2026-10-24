---
created: 2026-10-23T14:34:47.765Z
updated: 2026-10-23T14:34:47.765Z
summary: "Settings e wizard conoscono solo omp: gruppo omp con lo stato e Install omp, modelli suggeriti solo da omp, passo omp del wizard."
tasks:
  - pepretk1
  - qan11hwl
  - tebe2ski
  - tgu5f82e
  - zjmllmjr
cleared:
  tgu5f82e:
    title: Stato di omp nei Settings
    proposal: 3xin5lv7
    tag: omp install/update
    finished: 2026-10-23T14:17:07.861Z
    refs:
      - panel
      - developer.SHOW_SETTINGS
      - requirements/tech#panel/Settings
      - requirements/ui#panel/Settings
  zjmllmjr:
    title: Passo omp del wizard
    proposal: 3xin5lv7
    tag: omp install/update
    finished: 2026-10-23T14:11:40.912Z
    refs:
      - setup-wizard
      - requirements/rules#setup-wizard
      - requirements/tech#setup-wizard
      - requirements/ui#setup-wizard
  tebe2ski:
    title: Remove code of setup-wizard/Agent
    proposal: 3xin5lv7
    tag: omp install/update
    finished: 2026-10-23T14:07:20.843Z
    refs:
      - setup-wizard/Open
  pepretk1:
    title: "Wizard: passo Agent solo omp"
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:04:56.927Z
    refs:
      - setup-wizard
      - requirements/rules#setup-wizard
      - requirements/tech#setup-wizard
      - requirements/ui#setup-wizard
  qan11hwl:
    title: Settings con soli modelli omp
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:04:36.974Z
    refs:
      - requirements/tech#panel/Settings
      - requirements/ui#panel/Settings
      - requirements/quality#panel/Settings
---
# Settings e wizard solo omp

La scheda Settings non ha più la scelta dell'agente: i suggerimenti dei modelli vengono solo da `omp models --json`, il gruppo omp mostra lo stato del programma e Install omp quando manca. Il passo del wizard si chiama omp, verifica il programma e blocca Next finché non risponde.
