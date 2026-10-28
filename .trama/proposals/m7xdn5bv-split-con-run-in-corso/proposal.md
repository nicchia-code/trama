---
status: discarded
base:
  model/model-changes/proposal.md: new
delete: []
created: 2026-10-27T07:17:53.627Z
---
# Split con Run in corso

# Split con Run in corso

La divisione di un issue lungo di un handoff resta bloccata mentre un Run lanciato da questa finestra è in corso. Questa Proposal rende esplicita la condizione nel Modello, come fa già la regola dei Requisiti `requirements/rules#developer.SPLIT_ISSUE`: la divisione è possibile solo quando l'agente che ha consegnato l'handoff ha finito il turno, nessun altro agente sta scrivendo l'handoff e nessun Run lanciato da questa finestra è in corso.

## Modello

- `model-changes/proposal` (`proposal/Open/developer.SPLIT_ISSUE`): la condizione di avvio della divisione include che nessun Run lanciato da questa finestra sia in corso.

## Requisiti

Nessun Requisito cambia: `requirements/rules#developer.SPLIT_ISSUE` già elenca la condizione del Run.
