---
column: done
technical: false
refs:
  - panel/Board
drift: i74g4olu
proposal: null
agent: false
created: 2026-10-17T13:42:06.715Z
finished: 2026-10-17T13:56:18.325Z
---
# Fix code to match the Model: Il Run di un Task è disabilitato mentre un altro Task è preso dall'agente

## What happens

Il pulsante **Run** di un Task in To do è disabilitato, con il motivo «An agent is working on Task …», finché un altro Task è preso dall'agente, anche se il Task è libero e nessun Drift lo blocca.

## What should happen

Il Modello dice che, mentre un Task è preso dall'agente, a non essere disponibile è **Run all**. Il Run di un singolo Task resta disponibile: si ferma solo per un Run già in corso, per la risoluzione dei Drift o per il turno dell'agente che ha consegnato la scheda.

## Chosen option

**Togliere il motivo dal Run del singolo Task**

Il Run di ogni Task resta acceso mentre un altro Task è preso, e si spegne solo per un Run in corso, per la risoluzione dei Drift o per l'attesa del turno dell'agente. Costo: si può avviare un Task mentre l'agente ne realizza già un altro. Il comando accetta già questo avvio, quindi il comportamento lato comando non cambia.

## Where in the code

extension/src/webview/board/render.ts, funzione task: il pulsante Run, disabled: joinReasons([card.finishing, env.runReason()]). extension/src/webview/board/index.ts, runReasonNow, che include runBlocker (src/core/design.ts) con il motivo del Task preso.
