---
column: done
technical: false
refs:
  - task
  - requirements/tech#task
drift: null
proposal: 2pa6eli4
agent: false
created: 2026-10-14T08:40:56.808Z
finished: 2026-10-14T09:42:54.472Z
---
# Add trama task scope --pre-flight

Il comando sceglie i Task eseguibili in To do come trama task next, con gli stessi filtri (una Proposal, una o più identità di Task), escludendo i bloccati, e stampa i loro riferimenti esatti senza doppioni: una sezione di Requisiti vale il suo elemento; non entrano Transition aggiunte, sezioni General né Aree. Un riferimento che non si risolve più è saltato. Con l'uscita JSON dà la lista dei riferimenti e le identità dei Task. Una Proposal o un'identità inesistente è rifiutata, come in trama task next. Il calcolo sta nel nucleo, non nella riga di comando.
