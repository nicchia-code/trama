---
status: resolved
resolution: fix-code
refs:
  - task/In progress
proposal: null
task: 4ghknso3
origin: null
critical: false
option: 1
note: null
resolvedBy: bzmzasoe
created: 2026-10-18T08:30:51.595Z
---
# Task presi rilasciati all'apertura

## What happens

Quando l'editor si apre, ogni Task che un agente aveva preso torna subito in To do, anche se il terminale o la chat che lo teneva non esiste più: l'apertura dell'editor libera da sola i Task presi.

## What should happen

Il Modello non prevede questo rilascio. Un Task preso dall'agente torna in To do solo quando finisce il comando del suo terminale, quando l'agente dice di essere a riposo, quando il terminale o la chat si chiude, o quando il developer lo riprende dalla riga di comando. Riaprire l'editor non libera i Task presi: il Modello dice che riaprire l'editor perde il ricordo dei lavori, ma i file restano.

## Fix options

### Lasciare i Task presi fino alla ripresa

Il rilascio all'apertura viene tolto: un Task che l'agente aveva preso prima della chiusura resta **preso** dopo la riapertura, e il developer lo riprende con il comando di ripresa. Finché non lo riprende, il Task mostra che l'agente lavora e `Run all` resta non disponibile. Costo: un passaggio manuale in più dopo ogni chiusura dell'editor durante un lavoro.

### Lasciare i Task presi e avvisare all'apertura

Il rilascio all'apertura viene tolto, come sopra, ma all'apertura l'editor segnala i Task che risultano ancora presi, con il comando per riprenderli. Il Modello resta com'è e nessun Task torna in To do da solo. Costo: un avviso nuovo da progettare e da mostrare, e il developer deve comunque riprendere i Task a mano.

## Where in the code

extension/src/host/announcements.ts, funzione watchAnnouncements (rilascio dei Task presi all'avvio dell'editor, chiamata a releaseAbandonedTasks); src/core/work.ts, releaseAbandonedTasks (rilascia ogni Task preso, senza filtro di terminale o chat).
