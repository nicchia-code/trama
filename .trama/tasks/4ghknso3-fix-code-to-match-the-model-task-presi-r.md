---
column: done
technical: false
refs:
  - task/In progress
drift: 7ef90pek
proposal: null
agent: false
created: 2026-10-18T08:32:36.137Z
finished: 2026-10-18T08:39:13.232Z
---
# Fix code to match the Model: Task presi rilasciati all'apertura

## What happens

Quando l'editor si apre, ogni Task che un agente aveva preso torna subito in To do, anche se il terminale o la chat che lo teneva non esiste più: l'apertura dell'editor libera da sola i Task presi.

## What should happen

Il Modello non prevede questo rilascio. Un Task preso dall'agente torna in To do solo quando finisce il comando del suo terminale, quando l'agente dice di essere a riposo, quando il terminale o la chat si chiude, o quando il developer lo riprende dalla riga di comando. Riaprire l'editor non libera i Task presi: il Modello dice che riaprire l'editor perde il ricordo dei lavori, ma i file restano.

## Chosen option

**Lasciare i Task presi fino alla ripresa**

Il rilascio all'apertura viene tolto: un Task che l'agente aveva preso prima della chiusura resta **preso** dopo la riapertura, e il developer lo riprende con il comando di ripresa. Finché non lo riprende, il Task mostra che l'agente lavora e `Run all` resta non disponibile. Costo: un passaggio manuale in più dopo ogni chiusura dell'editor durante un lavoro.

## Where in the code

extension/src/host/announcements.ts, funzione watchAnnouncements (rilascio dei Task presi all'avvio dell'editor, chiamata a releaseAbandonedTasks); src/core/work.ts, releaseAbandonedTasks (rilascia ogni Task preso, senza filtro di terminale o chat).
