---
column: done
technical: false
refs:
  - requirements/rules#proposal
  - proposal/Open
drift: aqlzial9
proposal: null
agent: false
created: 2026-10-09T23:06:16.951Z
finished: 2026-10-09T23:08:15.752Z
---
# Fix code to match the Model: Attached Proposal's blocked reason omits that a required Proposal is still being written or was discarded

## What happens

Quando la Proposal allegata a un Drift aperto ne richiede un'altra che è ancora una **Draft** o è stata **scartata**, `trama drift show` (e il suo `--json`) dice solo che la Proposal *aspetta altre Proposal* e le nomina. Non dice perché: per una richiesta scartata il developer legge "aspetta" e pensa che basti attendere, mentre quella Proposal non sarà mai approvabile. Il motivo giusto compare solo dopo, quando il developer prova ad accettarla attraverso il Drift e il rifiuto lo elenca.

## What should happen

I Requisiti dicono che una Proposal che ne richiede una ancora in scrittura o scartata è bloccata **con il motivo** "still being written" o "was discarded", e che `trama drift show` mostra la Proposal allegata con il suo stato e, quando non si può approvare, il motivo. La riga del Drift deve quindi nominare ogni Proposal richiesta con il suo motivo (in scrittura, scartata, rifiutata, non ancora approvata, mancante, in ciclo), come già fanno `trama proposal show`, la Board e il rifiuto dell'accettazione.

## Chosen option

**Dare il motivo di ogni Proposal richiesta**

Il motivo del blocco per *attesa di altre Proposal* elenca ciascuna Proposal richiesta con il proprio motivo, lo stesso testo del rifiuto dell'approvazione. `trama drift show` e il suo `--json` dicono allora "still being written" o "was discarded" accanto al nome. Costo: una riga un po' più lunga, nessun cambio di comportamento altrove.

## Where in the code

approvalBlock in src/core/proposals.ts (caso waiting); riga Cannot be approved di driftShowView in src/cli/work.ts; proposalBlock in src/core/snapshot.ts
