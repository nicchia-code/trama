---
column: done
technical: false
refs:
  - proposal.APPROVED
drift: 8pj5f53f
proposal: null
agent: false
created: 2026-10-10T14:15:26.908Z
finished: 2026-10-10T16:00:08.056Z
---
# Fix code to match the Model: Approved Proposals still wait behind Hold scan

## What happens

Dopo l’approvazione di una Proposal ordinaria che consentirebbe la scansione automatica, **Hold scan** può ancora impedirne la partenza. La Proposal viene conservata fra quelle sospese; se non si riesce a salvarla, viene mostrato un avviso ma la scansione resta ferma. Succede sia approvando dal pannello, sia ricevendo l’approvazione fatta dalla riga di comando. Il comportamento sopravvive anche con un vecchio interruttore locale rimasto acceso, senza un nuovo gesto del developer.

## What should happen

L’approvazione deve applicare la Proposal e rigenerare le skill dei Requisiti. Per una modifica ordinaria, alle condizioni previste, può seguire subito la scansione del suo ambito; import e risoluzioni non la avviano. **Hold scan non esiste più**: nessuna approvazione deve entrare in un sospeso o aspettarne lo spegnimento. Il ricordo locale delle versioni precedenti non deve essere letto né scritto e le Proposal già sospese vengono dimenticate senza migrazione.

## Chosen option

**Eliminare la sospensione dai percorsi di approvazione**

Far proseguire ogni approvazione verso la scansione automatica quando ne ricorrono le condizioni, senza consultare o aggiornare il vecchio sospeso. Eliminare la gestione della sospensione e della scansione al suo spegnimento. I ricordi precedenti restano inutilizzati, senza recuperare le Proposal: il costo è aggiornare insieme l’approvazione dal pannello e quella ricevuta dalla riga di comando.

## Where in the code

extension/src/host/approval.ts: applyApprovedProposal; extension/src/host/controller.ts: scanApproved e turnScanHold; src/core/scan-hold.ts: holdApproved, readScanHold e turnScanHoldOff.
