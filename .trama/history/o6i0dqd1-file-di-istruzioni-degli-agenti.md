---
created: 2026-10-22T04:54:03.079Z
updated: 2026-10-22T05:18:52.156Z
summary: Il wizard avvisa dei file di istruzioni degli agenti trovati e suggerisce i modelli per tipo di lavoro; con omp i lanci possono escludere quei file tramite un overlay di configurazione.
tasks:
  - 097hh8ek
  - assnd0az
  - vodozu43
  - 7j5eejmu
cleared:
  vodozu43:
    title: Impostazione Ignora file istruzioni
    proposal: idthe088
    tag: Wizard di setup
    finished: 2026-10-22T05:12:41.047Z
    refs:
      - panel/Settings
      - requirements/tech#panel/Settings
      - requirements/ui#panel/Settings
      - requirements/ui#agent-terminal
  7j5eejmu:
    title: "Fix code to match the Requirements: Descrizione oltre il limite"
    proposal: idthe088
    tag: Wizard di setup
    finished: 2026-10-22T05:11:25.581Z
    refs:
      - requirements/ui#General
      - requirements/ui#panel/Settings
  assnd0az:
    title: Istruzioni escluse in omp
    proposal: idthe088
    tag: Wizard di setup
    finished: 2026-10-22T04:51:02.998Z
    refs:
      - agent-terminal
      - requirements/rules#agent-terminal/Agent running
      - requirements/tech#agent-terminal/Agent running
      - requirements/quality#agent-terminal/Agent running
      - requirements/tech#agent-launching
  097hh8ek:
    title: Consigli nel wizard
    proposal: idthe088
    tag: Wizard di setup
    finished: 2026-10-22T04:46:56.191Z
    refs:
      - setup-wizard
      - requirements/rules#setup-wizard
      - requirements/tech#setup-wizard
      - requirements/ui#setup-wizard
      - requirements/quality#setup-wizard/Agent
---
# File di istruzioni degli agenti

Nel passo Models il sottotitolo consiglia il modello per ogni tipo di lavoro. Nel passo Agent il wizard cerca i file di istruzioni (AGENTS.md, CLAUDE.md, regole Cursor, .omp/RULES.md) nel progetto, nelle cartelle sopra e nella home, li elenca come link apribili e, con omp e l'impostazione attiva, indica che i lanci li ignorano. Con omp e `trama.ignoreInstructionFiles` attiva, ogni lancio di Trama parte con un overlay `--config` che aggiunge ai `disabledExtensions` dello sviluppatore le identità dei file trovati. La descrizione dell'impostazione nel manifest è stata accorciata a 159 caratteri (T4, Drift sulla lunghezza risolto). Resta aperto: il Requisito `ui#agent-terminal`, il Task T3 e la Proposal idthe088 citano ancora il testo di 181 caratteri; T3 è stato chiuso senza modifiche al codice e il testo del Requisito va deciso dallo sviluppatore.
