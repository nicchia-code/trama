---
created: 2026-10-22T13:45:31.360Z
updated: 2026-10-24T11:22:52.850Z
summary: Trama opens from an icon in the Activity Bar with a view and an Open Trama button; the status bar has no Trama logo button, only Trama Activities for ghosts without a column.
tasks:
  - 0t9x3ist
  - nr9jaiea
cleared:
  nr9jaiea:
    title: Logo fuori dalla barra di stato
    proposal: srkyrbvl
    tag: Chat & panel polish
    finished: 2026-10-24T10:33:02.666Z
    refs:
      - developer.OPEN_PANEL
      - project/Trama project/developer.OPEN_PANEL
      - requirements/rules#project
      - requirements/tech#announcement
      - requirements/ui#announcement
  0t9x3ist:
    title: Icona di Trama a sinistra
    proposal: dhgcciow
    tag: Icona Trama
    finished: 2026-10-22T13:43:40.543Z
    refs:
      - panel/Closed/developer.OPEN_PANEL
      - panel/Open/developer.OPEN_PANEL
      - developer.OPEN_PANEL
      - requirements/ui#panel
      - requirements/tech#panel
      - requirements/tech#project
      - requirements/rules#project
      - specs#frameworks
---
# Icona di Trama nella barra delle attività

In every window with at least one folder open, the Activity Bar shows the Trama icon, with a Trama view showing one sentence and the Open Trama button, the same as the Open Trama command. The status bar has no logo button any more: the trama-logo icon font, its generating script and the fantasticon development dependency were removed. The only Trama item left in the status bar is Trama Activities, shown while a ghost has no column. Implemented by Task nr9jaiea, after Task 0t9x3ist.
