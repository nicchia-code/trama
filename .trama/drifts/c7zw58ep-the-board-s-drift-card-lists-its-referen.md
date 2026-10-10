---
status: resolved
resolution: proposal
refs:
  - requirements/ui#drift
  - panel/Board
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: 48s86zzo
created: 2026-10-09T08:46:11.658Z
---
# The Board's Drift card lists its references besides the title and the two sides

## What happens

Nella colonna To decide la scheda di un Drift mostra, fra il titolo e i due lati, **una riga di riferimenti**: un chip cliccabile per ogni elemento del Modello o sezione di Requisito a cui il Drift punta, ognuno porta al Diagramma o alla scheda Requirements. Sotto i due lati c'è poi il pulsante «View on diagram» (o «View requirement») sul primo riferimento.

## What should happen

La scheda di un Drift nella Board mostra **solo il titolo e i due lati** («What happens» e «What should happen»), e tiene il suo collegamento al Diagramma o al Requisito. Nessun altro contenuto: niente elenco dei riferimenti.

## Fix options

### Remove the reference chips

La scheda perde la riga dei chip e mostra titolo, i due lati e il solo collegamento «View on diagram» / «View requirement». Costo minimo: si toglie una riga di rendering. Chi vuole vedere tutti i riferimenti li trova nei dettagli del Diagramma o con `trama drift show`.

### Keep the chips and allow them in the Requirement

Si cambia `requirements/ui#drift` per dire che la scheda mostra anche i riferimenti del Drift come collegamenti. Nessun cambio di codice; la scheda resta più ricca ma meno essenziale di quanto chiede oggi il Requisito. Va deciso insieme al Drift sull'elenco «Points at» dei dettagli del Diagramma, per tenere le due viste coerenti.

## Where in the code

extension/src/webview/board/render.ts, function `drift` (the `chips(card.refs, env)` row)
