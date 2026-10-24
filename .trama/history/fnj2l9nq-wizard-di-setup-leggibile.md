---
created: 2026-10-24T12:52:07.770Z
updated: 2026-10-24T12:52:07.770Z
summary: "Il wizard di setup e i controlli condivisi delle impostazioni non si sovrappongono più a nessuna larghezza: indicatore dei passi, barra dei pulsanti fissa, messaggi sotto i campi, tooltip solo al passaggio."
tasks:
  - r92k340y
  - klwt5hef
cleared:
  klwt5hef:
    title: Wizard di setup leggibile
    proposal: vzsui8yh
    tag: setup-wizard
    finished: 2026-10-24T12:49:56.342Z
    refs:
      - setup-wizard
      - developer.OPEN_SETUP_STEP
      - requirements/ui#setup-wizard
      - requirements/ui#setup-wizard/Path
      - requirements/ui#setup-wizard/omp
      - requirements/ui#setup-wizard/Models
      - requirements/ui#setup-wizard/Folders
      - requirements/ui#setup-wizard/Summary
      - requirements/ui#panel/Get Started
  r92k340y:
    title: Controlli di Settings senza sovrapposizioni
    proposal: vzsui8yh
    tag: setup-wizard
    finished: 2026-10-24T12:35:55.989Z
    refs:
      - panel/Settings
      - requirements/ui#panel/Settings
      - requirements/ui#General
---
# Wizard di setup leggibile

Il wizard ha una colonna centrata, un indicatore dei passi che riporta ai passi precedenti con `developer.OPEN_SETUP_STEP`, una barra dei pulsanti sempre visibile, passi con le impostazioni una sotto l'altra e un riepilogo a schede con «Edit». I controlli condivisi (Settings, wizard, finestra del modello) hanno messaggi sotto il campo senza spazio vuoto, casella accanto al titolo, tooltip «About …» solo su puntatore o fuoco, elenco della `Combobox` largo quanto il campo e bordo della `Checkbox` più contrastato.
