---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#drift
  - requirements/ui#panel/Board
drift: null
proposal: 37d8rz9w
agent: false
created: 2026-10-07T17:04:38.903Z
finished: 2026-10-07T17:20:34.757Z
---
# Draw Drift-bound ghosts inside their Drift

I ghost che riguardano la Proposal di un Drift si disegnano nel Drift, non come schede a sé in To decide.

- Mentre esiste il ghost del rifacimento della Proposal di un Drift, il riquadro `Attached Proposal` della scheda e dei dettagli di quel Drift mostra, al posto della Proposal obsoleta, lo scheletro del ghost (bordo tratteggiato, traslucido, shimmer che si ferma con il movimento ridotto) con la riga `Being reworked` e, appena c'è la Draft, il suo titolo. Il Keep this sinistro è disabilitato come per una Proposal ancora in scrittura. Nessun ghost di Proposal compare in To decide per quel rifacimento.
- Quando quel ghost sparisce senza la Proposal nuova, il riquadro torna a mostrare la Proposal allegata, con lo stesso avviso degli altri ghost.
- Il ghost di un Drift la cui Draft esiste già ha la riga di fase `Writing the Proposal` al posto di `Preparing`, ripetuta nel nome accessibile; non c'è nessun ghost di Proposal per quella Draft.
