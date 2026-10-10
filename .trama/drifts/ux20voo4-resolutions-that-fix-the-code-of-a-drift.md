---
status: resolved
resolution: proposal
refs:
  - proposal/Open/developer.APPROVE_PROPOSAL
  - proposal/Draft/agent.SUBMIT_PROPOSAL
  - proposal/Draft/agent.EDIT_PROPOSAL
  - requirements/rules#proposal
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: b4duwb4w
created: 2026-10-09T21:01:13.637Z
---
# Resolutions that fix the code of a Drift whose Model elements are gone are refused, unknown to the Proposal Model

## What happens

Una risoluzione che chiede di **correggere il codice** di un Drift i cui elementi del Modello non esistono più (nemmeno un contenitore) è rifiutata in tre momenti:

- quando l'agente registra quella decisione;
- quando consegna la risoluzione;
- quando il developer la approva: la risoluzione aperta conta come **bloccata**, il motivo si vede nella validazione, in `trama proposal show` e nel pannello, e il messaggio dice di farla riscrivere a Resolve Drifts.

## What should happen

Il Modello della Proposal e `rules#proposal` non conoscono questo caso. La registrazione è rifiutata solo se il Drift non è aperto, sta in un'altra risoluzione o l'opzione non esiste; la consegna solo per lista vuota, Drift non più aperti o già in un'altra risoluzione; una Proposal aperta è bloccata solo se attende altre Proposal, è superata, ha file non registrati o lascerebbe il Modello non valido. Una risoluzione così, per il Modello, si approva.

## Fix options

### Remove the three refusals

Registrazione, consegna e approvazione non guardano più se gli elementi del Modello del Drift esistono ancora, come dice il Modello della Proposal. Costa caro: approvando, la correzione di quel Drift sarebbe comunque rifiutata dalla regola del Drift, e l'approvazione si fermerebbe a metà, con la risoluzione approvata e alcuni Drift ancora aperti.

### Keep only the approval block

Si tolgono i rifiuti alla registrazione e alla consegna; resta solo il blocco della risoluzione aperta. Il codice resta più vicino al Modello, ma l'approvazione è ancora rifiutata per un motivo che il Modello non elenca, e l'agente scopre il problema solo quando il developer prova ad approvare.

## Where in the code

`src/core/resolution.ts` (`resolveDriftInProposal`), `src/core/proposals.ts` (`driftListProblems`, `unfixableDrifts`, `approvalBlock`, `approveProposal`), `src/cli/work.ts` e `src/core/snapshot.ts` (motivo mostrato). I rifiuti vengono dalle correzioni scelte sui Drift w200qrg2 e ruul7pg8.
