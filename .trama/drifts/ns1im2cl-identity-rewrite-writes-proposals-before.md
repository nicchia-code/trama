---
status: resolved
resolution: fix-code
refs:
  - project/Trama project/developer.REWRITE_IDENTITIES
  - requirements/rules#project
proposal: null
task: u3rzibek
origin: null
critical: false
option: 1
note: null
resolvedBy: v0z7hgrr
created: 2026-10-14T10:09:56.775Z
---
# Identity rewrite writes Proposals before it has read every Task and Drift

## What happens

Quando il comando riscrive le identità, scrive subito le Proposal numerate, e solo dopo legge i Task e i Drift numerati. Se uno di quei file non si legge o non è valido, il comando si ferma con un errore con le Proposal già cambiate: il loro istante di creazione è nuovo, ma il loro numero e i file dei Task e dei Drift restano com'erano. Al lancio successivo lo stesso file blocca di nuovo la riscrittura.

## What should happen

Il comando non scrive nulla quando si ferma: i controlli precedono ogni scrittura, e le sole ragioni di rifiuto elencate sono i numeri doppi e le identità che collidono. Una riscrittura interrotta non deve lasciare schede a metà: o tutte le schede numerate cambiano, o nessuna.

## Fix options

### Leggere tutte le schede prima di scrivere

Il comando legge e controlla ogni Proposal, Task e Drift numerato prima di toccare il primo file. Se una scheda non si legge, la riscrittura è rifiutata e non cambia nulla, come già accade per i numeri doppi. Costo: una scheda guasta, anche non collegata alle altre, blocca la riscrittura finché non viene sistemata.

### Ripristinare i file se un passo fallisce

Il comando conserva il testo originale di ogni scheda prima di cambiarla e, se un passo fallisce, rimette tutti i file com'erano. Le schede guaste restano rifiutate solo a metà lavoro. Costo: più codice e copie temporanee, e un'interruzione brusca del processo può ancora lasciare file a metà.

## Where in the code

src/core/rewrite-ids.ts (rewriteNumberedCards: the Proposal loop writes before the Task and Drift loops read)
