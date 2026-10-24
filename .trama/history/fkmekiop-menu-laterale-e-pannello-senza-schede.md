---
created: 2026-10-23T19:40:42.057Z
updated: 2026-10-23T19:40:42.057Z
summary: Il pannello perde la barra delle schede e si sceglie dal menu laterale; la colonna Done della Board si svuota con Clear, che cancella i Task conservandone la storia.
tasks:
  - r0ngz5x7
  - z516lb0l
  - zqmr2gy3
cleared:
  zqmr2gy3:
    title: Pannello senza schede
    proposal: 63ymkrdw
    tag: Menu laterale
    finished: 2026-10-23T19:38:33.719Z
    refs:
      - panel
      - focus
      - editor-panel
      - developer.OPEN_PANEL
      - developer.SHOW_BOARD
      - developer.SHOW_DIAGRAM
      - developer.SHOW_REQUIREMENTS
      - developer.SHOW_SPECS
      - developer.SHOW_HISTORY
      - developer.SHOW_SETTINGS
      - developer.FOCUS_REF
      - requirements/ui#General
      - requirements/ui#panel
      - requirements/tech#panel
      - requirements/ui#panel/Board
      - requirements/ui#panel/History
      - requirements/ui#task/Done
      - requirements/ui#developer.CLEAR_DONE
      - requirements/ui#panel/Get Started
      - requirements/ui#panel/Diagram
      - requirements/ui#panel/Settings
      - requirements/tech#panel/Settings
      - requirements/ui#focus
      - requirements/ui#developer.ASK_MORE
      - requirements/ui#announcement
      - requirements/tech#announcement
      - requirements/ui#proposal
      - requirements/ui#task
  z516lb0l:
    title: Menu laterale
    proposal: 63ymkrdw
    tag: Menu laterale
    finished: 2026-10-23T19:29:32.645Z
    refs:
      - menu-laterale
      - developer.OPEN_SIDE_MENU
      - developer.CLOSE_SIDE_MENU
      - project/Trama project/developer.OPEN_PANEL
      - agent-launching
      - requirements/ui#menu-laterale
      - requirements/tech#menu-laterale
      - requirements/tech#omp-chat
      - requirements/tech#project
  r0ngz5x7:
    title: Clear dei Task Done
    proposal: 63ymkrdw
    tag: Menu laterale
    finished: 2026-10-23T19:24:06.481Z
    refs:
      - task
      - voce-history
      - developer.CLEAR_DONE
      - work
      - requirements/data#task
      - requirements/data#voce-history
      - requirements/data#developer.CLEAR_DONE
      - requirements/rules#voce-history
      - requirements/rules#developer.CLEAR_DONE
      - requirements/tech#voce-history
      - requirements/tech#developer.CLEAR_DONE
      - requirements/ui#voce-history
---
# Menu laterale e pannello senza schede

La vista `trama.home` diventa il menu laterale di Trama, con le voci Board, Diagram, Requirements, Specs, History e Settings, il pulsante `Scan System`, il badge delle decisioni in attesa e i comandi `Show ...` della palette.

Il pannello non ha più la barra delle schede: sono sei viste scelte dal menu, la vista iniziale è la Board, History è una vista a tutta larghezza e Settings si apre anche senza cartelle.

La Board mostra la colonna Done, collassabile e raggruppata per giorno, con il pulsante `Clear`. L'host cancella i Task Done (tranne quelli tenuti da un Drift aperto), ne copia i dati nelle voci di History (`cleared`), conta i Task cancellati nello `Scan System` e i lettori tollerano un Task che non esiste più.
