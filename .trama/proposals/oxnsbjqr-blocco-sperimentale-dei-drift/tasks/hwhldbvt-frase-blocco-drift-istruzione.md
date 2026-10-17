---
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
  - requirements/quality#agent-launching
---
# Frase del blocco sperimentale dei Drift nell'istruzione dell'agente

Quando il Task è finito, `agentPrompt` in `extension/src/host/agent.ts` legge l'impostazione `trama.experimentalDriftBlocker` solo dal valore dell'utente, cioè `inspect("experimentalDriftBlocker").globalValue === true`; il valore del workspace è ignorato.

Se l'impostazione è accesa, l'istruzione mandata all'agente contiene la frase "The experimental Drift blocker is on: follow its steps whenever you file a Drift, and tell your sub-agents.", posta dopo il limite e la frase dei sotto-agenti e prima della frase sulla lingua. La frase compare solo per lo Scan del System e delle Feature, implement, implement all, il Run automatico della delega e import, sia nel terminale sia nella chat; non compare per design, Resolve Drifts e la risoluzione automatica dei Drift.

Se l'impostazione è spenta, assente o non booleana, l'istruzione resta identica a oggi.

I test dell'istruzione coprono: frase presente con impostazione accesa per ciascuna delle azioni elencate, assente per design, Resolve Drifts e risoluzione automatica, assente con impostazione spenta, assente o non booleana, e assente quando solo il workspace la accende.
