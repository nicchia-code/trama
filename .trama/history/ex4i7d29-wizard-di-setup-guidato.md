---
created: 2026-10-21T13:25:13.587Z
updated: 2026-10-21T13:25:13.587Z
summary: Un wizard di setup a passi (Path, Agent, Models, Project, Folders, Advanced, Summary) sostituisce dialogo dei file e selettore cartelle, con ingressi da Get Started, Settings, Diagramma e comando Import from Code.
tasks:
  - asgvr5k2
  - y7j4if3j
cleared:
  y7j4if3j:
    title: Ingressi del wizard nel pannello
    proposal: rf3glz8b
    tag: setup wizard
    finished: 2026-10-21T13:23:32.633Z
    refs:
      - panel
      - developer.ASK_AGENT
      - requirements/ui#panel/Get Started
      - requirements/ui#panel/Diagram
  asgvr5k2:
    title: Wizard di setup e init
    proposal: rf3glz8b
    tag: setup wizard
    finished: 2026-10-21T13:18:04.866Z
    refs:
      - project-setup
      - developer.INITIALIZE_PROJECT
      - developer.OPEN_GUIDED_SETUP
      - developer.NEXT_SETUP_STEP
      - developer.PREVIOUS_SETUP_STEP
      - developer.SKIP_SETUP_STEP
      - developer.OPEN_SETUP_STEP
      - developer.CONFIRM_SETUP
      - developer.CANCEL_SETUP
      - requirements/ui#setup-wizard
      - requirements/rules#setup-wizard
      - requirements/tech#setup-wizard
      - requirements/rules#project
      - requirements/ui#project
---
# Wizard di setup guidato

Il wizard di setup, nei modi primo setup, impostazioni e Modello vuoto, parte dai valori attuali, conserva le scelte fra i passi e salva solo alla conferma del riepilogo, inizializzando la cartella scelta nel primo setup. Il pannello vi porta da Get Started, dal pulsante Guided setup in Settings, dai pulsanti Import from Code e Start from Scratch del Diagramma con Modello vuoto e dal comando Import from Code. Il dialogo modale della cartella con file e il selettore all'inizializzazione dall'editor non esistono più; l'init da riga di comando non cambia.
