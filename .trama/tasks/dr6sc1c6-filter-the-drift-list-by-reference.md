---
column: done
technical: false
refs:
  - drift
  - requirements/tech#drift
drift: null
proposal: h9rkity1
agent: false
created: 2026-10-12T18:57:23.657Z
finished: 2026-10-12T19:35:41.079Z
---
# Filter the Drift list by reference

trama drift list accetta --ref <ref> più volte: tiene solo i Drift che riguardano la stessa cosa di almeno uno dei riferimenti dati, usando la stessa funzione del core che decide i blocchi dei Task (stesso elemento, o uno dentro l'altro, contando i Requisiti che si applicano a un elemento). Si combina con --all, così si leggono i Drift risolti sugli stessi elementi prima di archiviarne uno. Un riferimento che non si risolve è un errore d'uso.
