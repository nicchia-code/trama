---
status: resolved
resolution: proposal
refs:
  - panel/Open
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: eo1zp1cf
created: 2026-10-16T06:11:56.045Z
---
# Scheda Specs non prevista dal pannello

## What happens

Con un progetto Trama aperto, il pannello mostra una scheda **Specs** in più, accanto a Board, Diagramma e Requisiti. È una vista in sola lettura delle Specs, sulla quale si può disegnare una Proposal aperta. Lo stato Open del pannello non ha questa scheda.

## What should happen

Lo stato Open del pannello ha le schede che il Modello descrive: Diagramma, Board, Requisiti e impostazioni, più Get Started quando la cartella non è un progetto. Il Modello non prevede una scheda Specs nel pannello, quindi la scheda in più cambia le schede dello stato Open e va decisa dal developer.

## Fix options

### Togliere la scheda Specs dal pannello

Il pannello torna alle sole schede del Modello. Le Specs restano nel loro file e si leggono da lì, anche nelle Proposal. Costo: il developer perde la vista in sola lettura nel pannello e il disegno delle Proposal sulle Specs.

### Specs in una scheda separata dell'editor

Le Specs si aprono con un comando in una scheda dell'editor separata, non tra le schede del pannello. Il pannello resta con le schede del Modello e la vista delle Specs conserva le sue funzioni. Costo: una seconda vista da mantenere allineata alle Proposal e al pannello.

### Specs aperte nel file

Il pulsante per le Specs apre il file delle Specs nell'editor, senza una vista dedicata. Il pannello resta con le schede del Modello e il codice della vista si toglie. Costo: si perdono l'anteprima delle Proposal sulle Specs e la lettura dei campi in forma di scheda.

## Where in the code

extension/src/webview/main.ts:30 (pulsante della scheda Specs) e :79 (mountSpecs, la vista in extension/src/webview/specs/index.ts)
