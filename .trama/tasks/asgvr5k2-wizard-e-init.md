---
column: done
technical: false
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
drift: null
proposal: rf3glz8b
agent: false
created: 2026-10-21T13:01:42.906Z
finished: 2026-10-21T13:18:04.866Z
---
# Wizard di setup e init

Il wizard di setup esiste come descritto dalla Machine `setup-wizard`, nei suoi tre modi (primo setup, impostazioni, Modello vuoto), con i passi `Path`, `Agent`, `Models`, `Project`, `Folders`, `Advanced` e `Summary` che ciascun modo e percorso mostrano.

Quando il Task è finito:
- Ogni passo parte dai valori utente attuali; Back e Next conservano le scelte; nulla si salva prima della conferma del riepilogo; chiudere il pannello o annullare dimentica tutto.
- `Path` sceglie percorso e cartella (con più cartelle) e mostra l'avviso di Start from Scratch su una cartella con file, senza dialoghi; Next solo con un percorso scelto.
- `Agent` verifica l'agente scelto (omp con `omp models`, la chat di Cursor solo in Cursor) e mostra il risultato senza bloccare; `Models` suggerisce i modelli dell'agente scelto nel wizard, anche se non ancora salvato, e blocca Next con un numero di sotto-agenti non valido.
- `Folders` mostra l'albero della cartella scelta, tutto incluso, senza voci col punto né voci ignorate da git; le esclusioni arrivano all'agente nell'istruzione dell'import con la frase di `rules#setup-wizard`, e `trama-import` non chiede più le cartelle quando la frase c'è.
- `Advanced` si può saltare e Skip riporta i suoi valori a quelli iniziali.
- Il riepilogo mostra ogni valore con i cambi evidenziati e ogni riga riporta al suo passo. La conferma scrive solo le chiavi cambiate nelle impostazioni utente, poi nel primo setup inizializza la cartella scelta con la cartella delle skill scelta (stesso dialogo delle skill personalizzate di oggi), poi prosegue con il percorso; un fallimento lascia salvate le chiavi già scritte, mostra il motivo e permette di riprovare.
- Dall'editor il dialogo modale della cartella con file e il selettore delle cartelle all'inizializzazione non esistono più; l'inizializzazione dalla riga di comando non cambia.
- Le Event del developer per il wizard (OPEN_GUIDED_SETUP, NEXT_SETUP_STEP, PREVIOUS_SETUP_STEP, SKIP_SETUP_STEP, OPEN_SETUP_STEP, CONFIRM_SETUP, CANCEL_SETUP) e INITIALIZE_PROJECT come conferma del wizard in Get Started si comportano come dice il Modello.
- Aspetto, testi, accessibilità e messaggi seguono `ui#setup-wizard` e `tech#setup-wizard`; `README.md`, `extension/README.md`, `CHANGELOG.md` e `docs/uat.md` lo descrivono.
