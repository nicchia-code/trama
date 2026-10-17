---
column: done
technical: true
refs:
  - requirements/rules#proposal
drift: 5zmo1dp0
proposal: null
agent: false
created: 2026-10-16T13:44:03.426Z
finished: 2026-10-16T13:46:45.271Z
---
# Fix code to match the Requirements: Stato cambiato fuori dall'ambito con la Machine

## What happens

Quando nella stessa Proposal cambiano la descrizione di una Machine e uno dei suoi Stati, lo Stato cambiato non entra nell'ambito di scansione, e con lui le Transizioni che entrano in quello Stato o reagiscono a un Evento cambiato dentro la stessa Machine. La scansione non li confronta con il codice.

## What should happen

Le regole dell'ambito dicono che ogni Stato, Transizione ed Evento aggiunto o cambiato entra con motivo changed, e che la descrizione cambiata di una Machine entra da sola, come tale. Le due voci non si escludono: la Machine entra come voce propria e lo Stato cambiato come voce propria. Senza lo Stato, il codice che lo realizza non viene confrontato con il Modello.

## Chosen option

**Togliere lo scarto dentro la Machine cambiata**

Il filtro scarta le voci dentro una Machine cambiata solo quando la Machine è nuova. Ogni Stato, Transizione ed Evento cambiato entra con il proprio motivo, come dice il Modello. Nessuna modifica al Modello; l'ambito di una Proposal che cambia la descrizione di una Machine può diventare più lungo.

## Where in the code

src/core/scan-scope.ts, funzione closeScope: il filtro finale che scarta le voci sotto una Machine cambiata, e le voci Transizione che passano per lo stesso filtro.
