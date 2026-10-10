---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#proposal
  - proposal/Open
proposal: null
task: w2mh0txp
origin: null
option: 1
note: null
resolvedBy: y52ae3pw
created: 2026-10-09T22:13:13.791Z
---
# Attached Proposal's blocked reason omits that a required Proposal is still being written or was discarded

## What happens

Quando la Proposal allegata a un Drift aperto ne richiede un'altra che è ancora una **Draft** o è stata **scartata**, `trama drift show` (e il suo `--json`) dice solo che la Proposal *aspetta altre Proposal* e le nomina. Non dice perché: per una richiesta scartata il developer legge "aspetta" e pensa che basti attendere, mentre quella Proposal non sarà mai approvabile. Il motivo giusto compare solo dopo, quando il developer prova ad accettarla attraverso il Drift e il rifiuto lo elenca.

## What should happen

I Requisiti dicono che una Proposal che ne richiede una ancora in scrittura o scartata è bloccata **con il motivo** "still being written" o "was discarded", e che `trama drift show` mostra la Proposal allegata con il suo stato e, quando non si può approvare, il motivo. La riga del Drift deve quindi nominare ogni Proposal richiesta con il suo motivo (in scrittura, scartata, rifiutata, non ancora approvata, mancante, in ciclo), come già fanno `trama proposal show`, la Board e il rifiuto dell'accettazione.

## Fix options

### Dare il motivo di ogni Proposal richiesta

Il motivo del blocco per *attesa di altre Proposal* elenca ciascuna Proposal richiesta con il proprio motivo, lo stesso testo del rifiuto dell'approvazione. `trama drift show` e il suo `--json` dicono allora "still being written" o "was discarded" accanto al nome. Costo: una riga un po' più lunga, nessun cambio di comportamento altrove.

### Distinguere solo i blocchi definitivi

Il motivo resta breve per le richieste ancora in corso (in scrittura o aperte), ma quando una richiesta è **scartata, rifiutata, mancante o in ciclo** dice che la Proposal allegata non sarà mai approvabile. Costo: il caso *in scrittura* resta senza il suo motivo, quindi il Requisito sarebbe soddisfatto solo in parte.

## Where in the code

approvalBlock in src/core/proposals.ts (caso waiting); riga Cannot be approved di driftShowView in src/cli/work.ts; proposalBlock in src/core/snapshot.ts
