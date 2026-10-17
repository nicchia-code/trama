---
status: resolved
resolution: proposal
refs:
  - requirements/ui#panel/Board
  - panel/Board
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: 7pbe7l7n
created: 2026-10-17T12:17:40.542Z
---
# Riga di un Task bloccato: tag e icona prima del titolo

## What happens

Nelle righe dei Task dentro una scheda rossa, gialla o di attesa, il tag della Proposal e l'icona che segnala gli altri Drift aperti stanno sulla riga dell'ID, prima del titolo, che viene sotto. Il titolo non è mai l'ultimo elemento della riga e il tag non segue il titolo.

## What should happen

Il Requisito chiede che la riga abbia, nell'ordine, il pallino di stato, l'ID, il titolo e il tag, e che l'icona «Also blocked by» stia dopo il titolo.

## Fix options

### Titolo subito dopo l'ID

Tutta la riga segue l'ordine del Requisito: pallino, ID, titolo, poi tag e icona, nella stessa riga che va a capo quando è stretta. Il titolo resta il primo elemento leggibile dopo l'ID. Costo: con un titolo lungo, tag e icona scendono sull'ultima riga, dove si vedono meno.

### Tag e icona sotto il titolo

Pallino, ID e titolo restano sulla prima riga; il tag e l'icona vanno sulla seconda, sotto il titolo. L'ordine del Requisito è rispettato e il titolo non viene mai accorciato. Costo: la riga è più alta e nelle colonne strette occupa più spazio verticale.

## Where in the code

extension/src/webview/board/render.ts, blockedRow; extension/src/webview/board/board.css, .board-blocked-task
