---
created: 2026-10-23T12:55:25.635Z
updated: 2026-10-23T12:55:25.635Z
summary: "La colonna System Activities non c'è più: i fantasmi stanno in fondo a Backlog o Active, gli altri in una voce della status bar che ne apre i dettagli sulla Board."
tasks:
  - 6i1i8h14
  - gkb00sd8
  - w6tubwj6
---
# Fantasmi in colonna e nella status bar

La Board ha tre colonne: Backlog, Active e History. Una funzione pura in `src/core` decide la colonna di ogni fantasma: Proposal, Resolve, Drift e Unify in Backlog, i Task in Active, mentre check/Scan, comparison e work (Import, Quick, Ask) non hanno colonna. I fantasmi stanno dopo le carte vere e non si contano.

I fantasmi senza colonna compaiono come un'unica voce riassuntiva `Trama Activities` nella barra di stato, con tooltip e QuickPick quando sono più di uno. Sceglierne uno apre il pannello sulla Board con la finestra dei dettagli di quel fantasma; alla chiusura il focus va a Backlog.
