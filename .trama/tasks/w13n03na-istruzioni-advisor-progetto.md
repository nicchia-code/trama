---
column: done
technical: false
refs:
  - project/Not a Trama project/developer.INITIALIZE_PROJECT
  - project/Trama project/developer.UPDATE_SKILLS
  - requirements/rules#project
  - requirements/tech#work
drift: null
proposal: ld5527fo
agent: false
created: 2026-10-19T20:15:55.261Z
finished: 2026-10-19T20:30:22.138Z
---
# Installare WATCHDOG.yml

Fatto quando:
- l'inizializzazione del progetto, dalla riga di comando e dall'editor, scrive `.omp/WATCHDOG.yml` con le istruzioni degli advisor di Trama descritte in `tech#agent-launching` (il testo sta in `src/core`), qualunque sia `trama.agent` e anche con l'Advisor Scanner spento;
- un `.omp/WATCHDOG.yml` già presente con contenuto diverso blocca l'inizializzazione come la definizione `.omp/agents/trama-analysis.md`: è elencato fra i conflitti e la conferma del dialogo modale lo sovrascrive; il developer che rifiuta di sovrascriverlo lascia la cartella com'era;
- Update skills riscrive `.omp/WATCHDOG.yml` sostituendo ogni copia diversa senza chiedere, e il resoconto lo dice;
- l'impronta del codice esclude `.omp/WATCHDOG.yml`, come `.omp/agents/`;
- `docs/` descrive il file e la sua conseguenza: nelle sessioni di omp avviate a mano nel progetto con l'advisor acceso, omp non crea il suo advisor predefinito e gli advisor di Trama tacciono.
