---
status: resolved
resolution: fix-code
refs:
  - proposal.APPROVED
proposal: null
task: 4xfsrmh8
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T12:55:27.785Z
---
# Approved Proposals still wait behind Hold scan

## What happens

Dopo l’approvazione di una Proposal ordinaria che consentirebbe la scansione automatica, **Hold scan** può ancora impedirne la partenza. La Proposal viene conservata fra quelle sospese; se non si riesce a salvarla, viene mostrato un avviso ma la scansione resta ferma. Succede sia approvando dal pannello, sia ricevendo l’approvazione fatta dalla riga di comando. Il comportamento sopravvive anche con un vecchio interruttore locale rimasto acceso, senza un nuovo gesto del developer.

## What should happen

L’approvazione deve applicare la Proposal e rigenerare le skill dei Requisiti. Per una modifica ordinaria, alle condizioni previste, può seguire subito la scansione del suo ambito; import e risoluzioni non la avviano. **Hold scan non esiste più**: nessuna approvazione deve entrare in un sospeso o aspettarne lo spegnimento. Il ricordo locale delle versioni precedenti non deve essere letto né scritto e le Proposal già sospese vengono dimenticate senza migrazione.

## Fix options

### Eliminare la sospensione dai percorsi di approvazione

Far proseguire ogni approvazione verso la scansione automatica quando ne ricorrono le condizioni, senza consultare o aggiornare il vecchio sospeso. Eliminare la gestione della sospensione e della scansione al suo spegnimento. I ricordi precedenti restano inutilizzati, senza recuperare le Proposal: il costo è aggiornare insieme l’approvazione dal pannello e quella ricevuta dalla riga di comando.

### Unificare la reazione all’approvazione

Far convergere le approvazioni del pannello e della riga di comando in un’unica reazione che decide soltanto se avviare la scansione ordinaria. Questa reazione non conosce alcun sospeso e ignora il ricordo delle versioni precedenti. Per il developer il risultato è identico; il costo è riorganizzare i due percorsi, oltre a eliminare la sospensione e la scansione al suo spegnimento.

## Where in the code

extension/src/host/approval.ts: applyApprovedProposal; extension/src/host/controller.ts: scanApproved e turnScanHold; src/core/scan-hold.ts: holdApproved, readScanHold e turnScanHoldOff.
