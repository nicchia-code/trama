---
column: done
technical: false
refs:
  - drift-resolution/Running tasks
  - requirements/rules#drift-resolution/Running tasks
  - requirements/ui#drift-resolution/Running tasks
  - requirements/tech#drift-resolution/Running tasks
drift: null
proposal: 2fwrajhi
agent: false
created: 2026-10-24T19:20:14.259Z
finished: 2026-10-24T19:23:34.661Z
---
# Barra di Run all

Oggi, durante un `Run all` lanciato dalla finestra, il pulsante `Run all` in fondo ad `Active` mostra la forchetta della stima come testo (`~15–35 min left`, `Estimating time left…`, `Taking longer than expected`) con l'icona `Clock`. La stima si calcola in `src/core/run-estimate.ts`, l'host la tiene nel `Job` di tipo `run` (`extension/src/host/drift-resolution.ts`) e la manda come `runEstimate` (`RunEstimateView` in `extension/src/protocol.ts`); il webview ne ricava i testi con `runAllButtonText` in `extension/src/webview/board/logic.ts` e li passa al pulsante in `extension/src/webview/board/index.tsx`.

Quando il Task è finito, la stessa stima si vede come una barra di caricamento dentro il pulsante, senza numeri sul pulsante:

- Avanzamento: parte fatta = tempo passato dal lancio / (tempo passato + stima centrale rifatta). Non supera mai 0,95 prima della fine del Run all e non torna mai indietro: quando la stima rifatta cresce, resta il più alto già raggiunto finché il nuovo calcolo non lo supera. Più lungo del previsto (tempo passato oltre il limite alto della prima stima) vale 0,95. In calcolo non c'è avanzamento. Si rifà insieme alla stima (a ogni registrazione dei tempi del Run all e una volta al minuto) e non si scrive da nessuna parte. In percentuale si arrotonda all'intero.
- `src/core/run-estimate.ts` restituisce anche la stima centrale (`{ estimate, low, high }`) e ha una funzione pura per l'avanzamento, con la costante 0,95 accanto alle altre. Il `Job` tiene l'avanzamento più alto già raggiunto; `runEstimate` diventa `{ low, high, over, done }` (o `{ estimating: true }`, o `null` fuori da un `Run all`).
- Pulsante durante il Run all: stesso posto, larghezza, stato disabilitato e motivi di oggi; testo `Running…` (anche in calcolo), icona `Clock` a sinistra; `Taking longer than expected` quando è più lungo del previsto, con la barra al 95%.
- Barra: un elemento `aria-hidden` dentro il pulsante, sotto testo e icona, che riempie da sinistra a tutta altezza, nel colore `--primary` del tema del pannello con opacità tale che il testo resti leggibile in tema chiaro e scuro; classi di Tailwind, nessuna nuova libreria. La larghezza cambia con una transizione di circa 2 secondi. In calcolo la barra è indeterminata: una striscia larga circa un terzo del pulsante che scorre da un lato all'altro. Con `motion-reduce` la larghezza cambia di colpo e la striscia sta ferma al centro. Nessun conto al secondo.
- Tooltip: prima riga la forchetta come oggi (`~<basso>–<alto> min left`, `~<basso>–<alto> h left` con la mezz'ora col punto, `~<n> min left` o `~<n> h left` con i limiti uguali, `Estimating time left…` in calcolo), anche oltre la stima; sotto, i motivi di disabilitazione.
- Nome accessibile: `Run all, <p> percent done, about <basso> to <alto> minutes left` (o `hours`), `Run all, <p> percent done, about <n> minutes left` con i limiti uguali, `Run all, estimating time left` in calcolo, `Run all, <p> percent done, taking longer than expected` oltre la stima. Descrizione accessibile con i motivi come oggi; nessun annuncio ai cambi.
- Fuori da un `Run all` (Run di un solo Task, scan, design, import, risoluzione) il pulsante resta quello di sempre: `Run all`, icona `Play`, nome `Run all the Tasks in To do`, nessuna barra; alla fine del Run all torna così.
- I testi sono in inglese e non seguono `trama.language`.

Test `bun:test`: in `src/core`, avanzamento dalla stima centrale, avanzamento che non torna indietro quando la stima cresce, tetto di 0,95 e 0,95 oltre la stima, oltre ai test della stima di oggi; nel webview, il testo `Running…` e `Taking longer than expected`, la forchetta del tooltip in minuti e in ore, i limiti uguali, la barra indeterminata in calcolo e la larghezza dall'avanzamento, il nome accessibile con la percentuale, l'icona e il pulsante di sempre, senza barra, fuori da un `Run all`.
