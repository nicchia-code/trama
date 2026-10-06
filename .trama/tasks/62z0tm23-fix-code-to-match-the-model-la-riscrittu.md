---
column: done
technical: false
refs:
  - project/Trama project/developer.REWRITE_IDENTITIES
  - requirements/rules#project
drift: 6jtvi4cf
proposal: null
agent: false
created: 2026-10-06T19:00:49.363Z
finished: 2026-10-06T19:38:38.149Z
---
# Fix code to match the Model: La riscrittura delle identità modifica i numeri locali prima di essere rifiutata

## What happens

Quando due schede dello stesso tipo hanno lo stesso numero, la riscrittura viene rifiutata e le schede restano intatte, ma prima del controllo viene già **creato o aggiornato il registro locale dei numeri brevi**. Nello scenario isolato con due Task che condividono il numero, il rifiuto lascia un nuovo registro locale e il relativo file di esclusione. Il progetto non rimane quindi esattamente com’era prima del tentativo.

## What should happen

I controlli su giro di worktree, numeri duplicati e collisioni devono precedere **ogni scrittura**. Quando il comando è rifiutato non deve cambiare nulla, nemmeno il registro locale dei numeri brevi; quando non ci sono schede numerate deve essere un’operazione senza effetti.

## Chosen option

**Controllare prima di aggiornare i numeri locali**

Eseguire la riscrittura con una lettura del progetto priva di effetti e aggiornare i numeri locali soltanto dopo il superamento dei controlli. Un rifiuto e un’operazione senza schede numerate lasciano tutti i file intatti. Il costo è separare questa operazione dalla lettura ordinaria che assegna automaticamente i numeri brevi.

## Where in the code

src/cli/commands.ts: makeContext.project, comando ids rewrite; src/core/short-numbers.ts: syncShortNumbers; src/core/rewrite-ids.ts: rewriteNumberedCards
