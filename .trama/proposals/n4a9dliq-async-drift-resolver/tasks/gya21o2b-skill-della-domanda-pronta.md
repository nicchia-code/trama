---
refs:
  - agent-launching
  - requirements/tech#drift-resolution
---
# Skill della domanda pronta

Quando il Task è fatto, le skill distribuite (sorgenti in `skills/`, copie installate in `.agents/skills/`) insegnano all'agente a preparare e usare le domande pronte dell'Async Drift Resolver.

**`trama-resolve-drifts`, sezione "Prepared question"**, in due parti:
- *Scrivere una domanda pronta* (richiamata dalle altre skill): esplorazione del Drift come nel passo di esplorazione di Resolve Drifts, senza chiedere nulla al developer; una sola domanda a scelta singola con `id` uguale all'identità del Drift, nella lingua dell'istruzione, con il contesto (per un Drift ricorrente la catena dei precedenti), un'opzione per ogni Fix option nel loro ordine più una per il comportamento che il codice ha già, oppure, senza Fix options, adottare la Proposal allegata (raccomandata) e chiudere senza cambiare nulla; la raccomandazione dell'agente. Ogni opzione porta la sua decisione: `fix-code` col numero dell'opzione, `proposal` o `dismissed`. Per il comportamento del codice è `proposal` quando Modello o Requisiti devono cambiare (se il Drift non ha una Proposal allegata con quelle modifiche, l'agente la scrive, la consegna e la allega), `dismissed` quando già lo dicono. La domanda si salva con `trama drift edit <id> --input -` e `prepared`. La preparazione non decide Drift, non crea risoluzioni, non annuncia ghost; un Drift non preparabile resta senza domanda.
- *Risposta già data*: quando l'istruzione porta "The developer already answered this Drift's prepared question; do not ask again. Answer: <JSON>.", l'agente non apre round, usa la risposta come risposta del round, scrive la risoluzione come dice Resolve Drifts con `prepared: true` e la consegna.

**`trama-scan`, `trama-implement`, `trama-import`, sezione "Async Drift Resolver"**, valida solo se l'istruzione porta la frase "The Async Drift Resolver is on: …": alla fine del lavoro, dopo l'ultima archiviazione e l'eventuale risoluzione `nonBlocking`, prima del resoconto finale e delle voci di History, l'agente principale trova i Drift del lavoro (nel terminale `trama drift list` con `job` da `TRAMA_JOB` e `unprepared: true`, advisor compreso; nella chat di Cursor le identità archiviate da lui e dai sotto-agenti) e ne prepara la domanda, affidando l'esplorazione ai sotto-agenti al massimo `trama.maxParallelAgents` insieme, un Drift (o pochi sulla stessa cosa) ciascuno, altrimenti uno alla volta. Il resoconto dice quanti Drift sono stati preparati e quali no.

**Documentazione**: `docs/cli.md`, `extension/README.md` e `CHANGELOG.md` descrivono comandi, campi e impostazione dell'Async Drift Resolver.
