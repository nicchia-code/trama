---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#proposal
proposal: null
task: ic52hz0p
origin: null
critical: false
option: 1
note: null
resolvedBy: spxm8wgh
created: 2026-10-16T13:31:06.806Z
---
# Stato cambiato fuori dall'ambito con la Machine

## What happens

Quando nella stessa Proposal cambiano la descrizione di una Machine e uno dei suoi Stati, lo Stato cambiato non entra nell'ambito di scansione, e con lui le Transizioni che entrano in quello Stato o reagiscono a un Evento cambiato dentro la stessa Machine. La scansione non li confronta con il codice.

## What should happen

Le regole dell'ambito dicono che ogni Stato, Transizione ed Evento aggiunto o cambiato entra con motivo changed, e che la descrizione cambiata di una Machine entra da sola, come tale. Le due voci non si escludono: la Machine entra come voce propria e lo Stato cambiato come voce propria. Senza lo Stato, il codice che lo realizza non viene confrontato con il Modello.

## Fix options

### Togliere lo scarto dentro la Machine cambiata

Il filtro scarta le voci dentro una Machine cambiata solo quando la Machine è nuova. Ogni Stato, Transizione ed Evento cambiato entra con il proprio motivo, come dice il Modello. Nessuna modifica al Modello; l'ambito di una Proposal che cambia la descrizione di una Machine può diventare più lungo.

### Scansionare la Machine intera

Quando cambia la descrizione di una Machine, la sua voce copre tutto il suo contenuto, come oggi, e lo Stato cambiato viene confrontato dentro la Machine. Costa un confronto più largo della descrizione cambiata, ma non cambia il filtro né il Modello.

## Where in the code

src/core/scan-scope.ts, funzione closeScope: il filtro finale che scarta le voci sotto una Machine cambiata, e le voci Transizione che passano per lo stesso filtro.
