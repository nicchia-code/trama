---
created: 2026-10-24T14:06:35.494Z
updated: 2026-10-24T14:06:35.494Z
summary: Active cards lose the reference chips and the Settings tab becomes one 720 px column sharing groups and components with the setup wizard.
tasks:
  - bwnf3yuv
  - bmdmtuvu
  - 1x8fr4yp
cleared:
  1x8fr4yp:
    title: Scheda Settings come il wizard
    proposal: icrqymyv
    tag: Settings
    finished: 2026-10-24T13:58:21.661Z
    refs:
      - panel/Settings
      - panel/Closed/developer.SHOW_SETTINGS
      - panel/Closed/developer.OPEN_GUIDED_SETUP
      - panel/Open/developer.OPEN_GUIDED_SETUP
      - panel/Open/developer.SHOW_SETTINGS
      - requirements/ui#panel/Settings
      - requirements/tech#panel/Settings
      - requirements/ui#General
  bmdmtuvu:
    title: Gruppi e componenti condivisi
    proposal: icrqymyv
    tag: Settings
    finished: 2026-10-24T13:51:01.326Z
    refs:
      - setup-wizard
      - requirements/ui#setup-wizard
      - requirements/tech#setup-wizard
      - requirements/tech#omp-chat
      - requirements/tech#raffinamento
      - requirements/tech#drift
      - requirements/tech#drift-resolution
      - requirements/ui#agent-launching
      - requirements/ui#raffinamento
      - requirements/ui#drift-resolution
  bwnf3yuv:
    title: Scheda Active senza chip
    proposal: 3rawwa49
    tag: Schede senza chip
    finished: 2026-10-24T13:47:36.775Z
    refs:
      - panel/Board
      - developer.FOCUS_REF
      - requirements/ui#panel/Board
---
# Board cards and Settings redrawn

A Task card in Active no longer shows reference chips. SETTING_GROUPS is the single list of setting groups read by the Settings tab and the wizard, shared pieces live in setup-shared.tsx, and the Settings page is one centred column like the wizard steps.
