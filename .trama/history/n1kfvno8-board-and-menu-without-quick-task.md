---
created: 2026-10-24T06:03:38.549Z
updated: 2026-10-24T06:03:38.549Z
summary: The Board's Add Work Item menu has only Unify Drifts; Quick Task and its command are gone from the code.
tasks:
  - d5el557f
  - ls4mok2n
  - nbqrop77
cleared:
  ls4mok2n:
    title: Remove code of developer.OPEN_QUICK_TASK
    proposal: rqs3fipe
    tag: Chat General
    finished: 2026-10-23T20:57:18.188Z
    refs:
      - developer
  nbqrop77:
    title: Remove code of panel/Board/developer.OPEN_QUICK_TASK
    proposal: rqs3fipe
    tag: Chat General
    finished: 2026-10-23T20:56:47.068Z
    refs:
      - panel/Board
  d5el557f:
    title: Board senza Add Quick Task
    proposal: rqs3fipe
    tag: Chat General
    finished: 2026-10-23T20:54:19.017Z
    refs:
      - panel/Board
      - panel/Closed/developer.SHOW_BOARD
      - panel/Open/developer.SHOW_BOARD
      - panel/Closed/developer.OPEN_GHOST_DETAILS
      - panel/Open/developer.OPEN_GHOST_DETAILS
      - panel/Settings/developer.CONFIRM_SETUP
      - panel/Settings/developer.CANCEL_SETUP
      - panel/Get Started/developer.INITIALIZE_PROJECT
      - panel/Get Started/workspace.MODEL_CHANGED
      - panel/Settings/developer.INSTALL_OMP
      - setup-wizard/omp/developer.INSTALL_OMP
      - requirements/ui#panel/Board
      - requirements/ui#panel
      - requirements/ui#developer.UNIFY_DRIFTS
      - requirements/ui#developer.REWORK_PROPOSAL
      - requirements/tech#developer.UNIFY_DRIFTS
      - requirements/tech#developer.REWORK_PROPOSAL
      - requirements/rules#task
      - requirements/rules#developer.CLEAR_DONE
      - requirements/rules
      - requirements/tech
      - requirements/ui
---
# Board and menu without Quick Task

The Board's arrow beside Add Work Item shows only Unify Drifts. The developer.OPEN_QUICK_TASK command, its host and panel code and its menu entry are removed. The Board keeps the Clear button for Done.
