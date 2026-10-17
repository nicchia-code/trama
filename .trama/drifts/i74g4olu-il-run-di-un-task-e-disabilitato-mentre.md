---
status: resolved
resolution: fix-code
refs:
  - panel/Board
proposal: null
task: c6m15iy2
origin: null
critical: false
option: 1
note: null
resolvedBy: rmrw5bde
created: 2026-10-17T13:35:22.405Z
---
# Il Run di un Task è disabilitato mentre un altro Task è preso dall'agente

## What happens

Il pulsante **Run** di un Task in To do è disabilitato, con il motivo «An agent is working on Task …», finché un altro Task è preso dall'agente, anche se il Task è libero e nessun Drift lo blocca.

## What should happen

Il Modello dice che, mentre un Task è preso dall'agente, a non essere disponibile è **Run all**. Il Run di un singolo Task resta disponibile: si ferma solo per un Run già in corso, per la risoluzione dei Drift o per il turno dell'agente che ha consegnato la scheda.

## Fix options

### Togliere il motivo dal Run del singolo Task

Il Run di ogni Task resta acceso mentre un altro Task è preso, e si spegne solo per un Run in corso, per la risoluzione dei Drift o per l'attesa del turno dell'agente. Costo: si può avviare un Task mentre l'agente ne realizza già un altro. Il comando accetta già questo avvio, quindi il comportamento lato comando non cambia.

### Lasciare il Run acceso e dire il motivo al clic

Il pulsante Run resta acceso anche mentre un Task è preso; il clic mostra la stessa frase «An agent is working on Task …» e non avvia nulla. Costo: il pulsante sembra disponibile e il motivo si legge solo dopo il clic; l'avvio va rifiutato con quella frase, cosa che oggi non avviene.

## Where in the code

extension/src/webview/board/render.ts, funzione task: il pulsante Run, disabled: joinReasons([card.finishing, env.runReason()]). extension/src/webview/board/index.ts, runReasonNow, che include runBlocker (src/core/design.ts) con il motivo del Task preso.
