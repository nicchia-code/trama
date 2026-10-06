---
status: resolved
resolution: fix-code
refs:
  - project/Trama project/developer.REWRITE_IDENTITIES
  - requirements/rules#project
proposal: null
task: 62z0tm23
origin: null
option: 1
note: null
created: 2026-10-06T18:59:45.153Z
---
# La riscrittura delle identità modifica i numeri locali prima di essere rifiutata

## What happens

Quando due schede dello stesso tipo hanno lo stesso numero, la riscrittura viene rifiutata e le schede restano intatte, ma prima del controllo viene già **creato o aggiornato il registro locale dei numeri brevi**. Nello scenario isolato con due Task che condividono il numero, il rifiuto lascia un nuovo registro locale e il relativo file di esclusione. Il progetto non rimane quindi esattamente com’era prima del tentativo.

## What should happen

I controlli su giro di worktree, numeri duplicati e collisioni devono precedere **ogni scrittura**. Quando il comando è rifiutato non deve cambiare nulla, nemmeno il registro locale dei numeri brevi; quando non ci sono schede numerate deve essere un’operazione senza effetti.

## Fix options

### Controllare prima di aggiornare i numeri locali

Eseguire la riscrittura con una lettura del progetto priva di effetti e aggiornare i numeri locali soltanto dopo il superamento dei controlli. Un rifiuto e un’operazione senza schede numerate lasciano tutti i file intatti. Il costo è separare questa operazione dalla lettura ordinaria che assegna automaticamente i numeri brevi.

### Preparare tutte le modifiche prima di applicarle

Calcolare prima sia le nuove identità sia il registro dei numeri brevi, senza scrivere. Applicare quanto preparato solo quando tutti i controlli hanno avuto esito positivo; se non c’è niente da riscrivere, non applicare nulla. Mantiene coerenti identità e numeri locali, ma richiede coordinare esplicitamente i due aggiornamenti.

## Where in the code

src/cli/commands.ts: makeContext.project, comando ids rewrite; src/core/short-numbers.ts: syncShortNumbers; src/core/rewrite-ids.ts: rewriteNumberedCards
