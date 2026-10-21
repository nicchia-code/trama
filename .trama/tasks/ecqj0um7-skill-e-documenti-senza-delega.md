---
column: done
technical: false
refs:
  - agent
  - developer.ASK_AGENT
  - agent-launching
  - work
  - requirements/rules#agent-launching
  - requirements/tech#agent-launching
  - requirements/ui#agent-launching
  - requirements/quality#agent-launching
  - requirements/rules#work
drift: null
proposal: c9fp4trm
agent: false
created: 2026-10-21T05:42:19.328Z
finished: 2026-10-21T06:09:50.774Z
---
# Skill e documenti senza delega

Quando il Task è fatto, nessuna parte di Trama descrive o offre più la delega dei Drift, e le descrizioni d'insieme dicono le nuove colonne della Board.

- L'agente non ha più nessuna eccezione per la delega: non registra da sé la prima correzione raccomandata, non c'è approvazione automatica né Run automatico; le decisioni restano del developer e l'agente le esegue solo su sua richiesta esplicita. Le skill distribuite (`skills/trama-resolve-drifts`, `trama-implement`, `trama-scan`, `trama-import`, `trama-design`, `trama-compare`) perdono le sezioni della modalità automatica, dei limiti dell'autopilota, delle corse automatiche delle correzioni, del pre-flight delle correzioni automatiche, del coordinamento con l'autopilota, della barriera e del giudizio `critical`; nel blocco sperimentale resta l'esclusione dei soli Drift ricorrenti.
- `developer.ASK_AGENT` chiede di risolvere un solo Drift aperto con Resolve; non esiste più una richiesta che risolve tutti i Drift aperti.
- Agent launching: nessun Drift si risolve da solo; Resolve Drifts, chiesto con Resolve sulla scheda di un Drift, raccoglie solo quel Drift, chiede le decisioni e consegna una risoluzione da esaminare; i Task che ne nascono si avviano a mano. L'Advisor Scanner lavora solo nei Run di un Task e di tutti i Task in To do. Il ruolo di analisi vale per design, import e Resolve; il modello di una Proposal vale anche per Resolve su un Drift nato da un suo Task, e non per Resolve su altri Drift.
- I ruoli dei modelli (`rules#agent-launching`, `tech#agent-launching`) non nominano più `Resolve all`, la risoluzione automatica né il Run automatico; la sequenza per modello nasce solo da Run all e la sua fine normale non dipende da un coordinatore. Con `cursor` fuori da Cursor nessun passo automatico può finire negli appunti. `TRAMA_JOB` resta fra le variabili dei terminali di Trama per i tempi delle fasi.
- La descrizione di `trama.driftAutoPilot` e le sue `enumDescriptions` spariscono (`ui#agent-launching`); la qualità di `agent-launching` non parla più della preferenza della delega né del coordinatore: nessun file del repository, prompt o impostazione concede l'approvazione di una Proposal o l'avvio di un Run.
- Work: le decisioni sui Drift restano del developer, nessuna risoluzione si prepara, si approva o si realizza da sola. Con l'Advisor Scanner nessun Run, nemmeno un Run automatico che non esiste più, fa pre-flight o scansione mirata (`rules#work`), e la ripresa della delega dopo l'apertura dell'editor non esiste più.
- `docs/cli.md` (oggetto `autopilot`, campi `automatic` e `job`, sezione "Drift autopilot"), `docs/uat.md` (sezione della delega, tenendo le prove di `trama.submitWhileRunning`), `README.md`, `extension/README.md` e `CHANGELOG.md` dicono la Board con `System Activities`, i Drift in `Backlog`, i Task bloccati in `Active`, la fine di `Resolve all`, della delega e di `critical`. Le voci vecchie del changelog restano come storia.
