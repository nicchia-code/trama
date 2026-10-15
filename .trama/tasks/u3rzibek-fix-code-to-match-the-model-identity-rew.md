---
column: done
technical: false
refs:
  - project/Trama project/developer.REWRITE_IDENTITIES
  - requirements/rules#project
drift: ns1im2cl
proposal: null
agent: false
created: 2026-10-14T10:17:38.644Z
finished: 2026-10-14T10:18:51.491Z
---
# Fix code to match the Model: Identity rewrite writes Proposals before it has read every Task and Drift

## What happens

Quando il comando riscrive le identità, scrive subito le Proposal numerate, e solo dopo legge i Task e i Drift numerati. Se uno di quei file non si legge o non è valido, il comando si ferma con un errore con le Proposal già cambiate: il loro istante di creazione è nuovo, ma il loro numero e i file dei Task e dei Drift restano com'erano. Al lancio successivo lo stesso file blocca di nuovo la riscrittura.

## What should happen

Il comando non scrive nulla quando si ferma: i controlli precedono ogni scrittura, e le sole ragioni di rifiuto elencate sono i numeri doppi e le identità che collidono. Una riscrittura interrotta non deve lasciare schede a metà: o tutte le schede numerate cambiano, o nessuna.

## Chosen option

**Leggere tutte le schede prima di scrivere**

Il comando legge e controlla ogni Proposal, Task e Drift numerato prima di toccare il primo file. Se una scheda non si legge, la riscrittura è rifiutata e non cambia nulla, come già accade per i numeri doppi. Costo: una scheda guasta, anche non collegata alle altre, blocca la riscrittura finché non viene sistemata.

## Where in the code

src/core/rewrite-ids.ts (rewriteNumberedCards: the Proposal loop writes before the Task and Drift loops read)
