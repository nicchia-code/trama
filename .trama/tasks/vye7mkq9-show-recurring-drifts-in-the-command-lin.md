---
column: done
technical: false
refs:
  - drift
  - drift/Open
  - requirements/tech#drift
  - requirements/ui#drift
drift: null
proposal: h9rkity1
agent: false
created: 2026-10-12T18:57:22.170Z
finished: 2026-10-12T19:29:47.832Z
---
# Show recurring Drifts in the command line

I Drift ricorrenti si leggono a riga di comando: trama drift list e trama board li segnano (recurring); trama drift show di un Drift ricorrente ha, subito dopo il titolo, la riga Follows Drift <identità> <titolo> (<resolution>) con la decisione del precedente (fix-code o proposal). Il valore del precedente compare in list, show, board, nella Snapshot e nei relativi JSON; l'assenza nei Drift precedenti vale come non ricorrente.
