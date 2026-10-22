---
created: 2026-10-22T04:54:03.079Z
updated: 2026-10-22T05:18:52.156Z
summary: Il wizard avvisa dei file di istruzioni degli agenti trovati e suggerisce i modelli per tipo di lavoro; con omp i lanci possono escludere quei file tramite un overlay di configurazione.
tasks:
  - 097hh8ek
  - assnd0az
  - vodozu43
  - 7j5eejmu
---
# File di istruzioni degli agenti

Nel passo Models il sottotitolo consiglia il modello per ogni tipo di lavoro. Nel passo Agent il wizard cerca i file di istruzioni (AGENTS.md, CLAUDE.md, regole Cursor, .omp/RULES.md) nel progetto, nelle cartelle sopra e nella home, li elenca come link apribili e, con omp e l'impostazione attiva, indica che i lanci li ignorano. Con omp e `trama.ignoreInstructionFiles` attiva, ogni lancio di Trama parte con un overlay `--config` che aggiunge ai `disabledExtensions` dello sviluppatore le identità dei file trovati. La descrizione dell'impostazione nel manifest è stata accorciata a 159 caratteri (T4, Drift sulla lunghezza risolto). Resta aperto: il Requisito `ui#agent-terminal`, il Task T3 e la Proposal idthe088 citano ancora il testo di 181 caratteri; T3 è stato chiuso senza modifiche al codice e il testo del Requisito va deciso dallo sviluppatore.
