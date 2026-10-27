---
column: done
technical: false
refs:
  - github-project/Linked
  - requirements/ui#github-project/Linked
drift: null
proposal: fztqeclh
agent: false
created: 2026-10-27T06:04:10.781Z
finished: 2026-10-27T06:08:25.040Z
---
# Blocchi Timeline leggibili

Nella Timeline della vista Team ogni blocco di una issue mostra sempre per intero `#<n>` e la stima `<d> d`; il titolo sta fra i due, tagliato con i puntini, solo nello spazio che avanza, e sparisce quando non ne avanza. Il pallino colorato dell'epic resta.

Oggi un blocco stretto taglia il contenuto dove capita: una issue da 2 giorni mostra solo `#14 ·`, e una da 3 giorni `#13 · 3 d` senza titolo.

Quando il Task è finito:
- La larghezza di un blocco resta la sua stima su 5 giorni della larghezza della cella, ma non scende sotto lo spazio del pallino, di `#<n>` e di `<d> d`.
- Tooltip e nome accessibile restano `#<n> <title> · <d> d · <status>`; un blocco chiuso resta smorzato con il numero barrato e un blocco con un segnale tiene il bordo sinistro del suo colore.
- Lo screenshot della guida `team-timeline` è rigenerato con `bun run site:screenshots team-timeline` (solo quella scena).
