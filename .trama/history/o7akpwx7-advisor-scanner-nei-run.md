---
created: 2026-10-19T20:37:06.351Z
updated: 2026-10-21T04:42:45.264Z
summary: Con l'Advisor Scanner acceso, il Run lancia omp con l'advisor, i pulsanti Scan sono disattivati, il gruppo Experimental ha il flag dell'Advisor Scanner e la skill trama-implement salta pre-flight e scansione finale.
tasks:
  - 9eac4hx1
  - awfmhbqw
  - kvka01g6
  - rxrumqmh
  - w13n03na
  - qudyah8g
cleared:
  qudyah8g:
    title: Advisor nei sotto-agenti
    proposal: n658x9k9
    tag: Advisor Scanner
    finished: 2026-10-21T04:41:55.577Z
    refs:
      - requirements/rules#work
      - requirements/tech#agent-launching
      - requirements/cli#General
      - requirements/quality#agent-launching
  w13n03na:
    title: Installare WATCHDOG.yml
    proposal: ld5527fo
    tag: Advisor Scanner
    finished: 2026-10-19T20:30:22.138Z
    refs:
      - project/Not a Trama project/developer.INITIALIZE_PROJECT
      - project/Trama project/developer.UPDATE_SKILLS
      - requirements/rules#project
      - requirements/tech#work
  kvka01g6:
    title: Gruppo Experimental e Advisor Scanner
    proposal: ld5527fo
    tag: Advisor Scanner
    finished: 2026-10-19T20:28:08.748Z
    refs:
      - panel/Settings
      - panel/Open/developer.SHOW_SETTINGS
      - requirements/ui#panel/Settings
      - requirements/tech#panel/Settings
  rxrumqmh:
    title: Run senza scan
    proposal: ld5527fo
    tag: Advisor Scanner
    finished: 2026-10-19T20:27:58.850Z
    refs:
      - task
      - announcement
      - drift
  9eac4hx1:
    title: Lancio dei Run con advisor
    proposal: ld5527fo
    tag: Advisor Scanner
    finished: 2026-10-19T20:25:53.742Z
    refs:
      - agent-launching
      - requirements/rules#work
      - requirements/tech#agent-launching
      - requirements/quality#agent-launching
      - requirements/ui#agent-launching
  awfmhbqw:
    title: Pulsanti Scan disattivati
    proposal: ld5527fo
    tag: Advisor Scanner
    finished: 2026-10-19T20:25:05.438Z
    refs:
      - panel/Board
      - panel/Diagram
      - panel/Open/developer.SHOW_BOARD
      - panel/Open/developer.SHOW_DIAGRAM
      - panel/Get Started/developer.INITIALIZE_PROJECT
      - panel/Get Started/workspace.MODEL_CHANGED
      - requirements/ui#panel
---
# Advisor Scanner nei Run

WATCHDOG.yml viene installato con il roster dei revisori. Task: 9eac4hx1 Lancio dei Run con advisor, awfmhbqw Pulsanti Scan disattivati, kvka01g6 Gruppo Experimental e Advisor Scanner, rxrumqmh Run senza scan, w13n03na Installare WATCHDOG.yml.
