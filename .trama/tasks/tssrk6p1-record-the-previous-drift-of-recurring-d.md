---
column: done
technical: false
refs:
  - drift
  - drift/Open
  - requirements/data#drift
  - requirements/rules#drift
  - requirements/tech#drift
drift: null
proposal: h9rkity1
agent: false
created: 2026-10-12T18:57:21.250Z
finished: 2026-10-12T19:28:21.415Z
---
# Record the previous Drift of recurring Drifts

Un Drift nuovo può ricordare un Drift precedente già risolto, di cui è il seguito: allora è ricorrente. Il precedente è scritto alla creazione e non cambia più. Si dichiara con --previous (identità o numero breve), oppure, quando il Drift nasce realizzando il Task di correzione di un altro Drift, è quel Drift e Trama lo scrive da sola anche senza --previous; un --previous diverso è rifiutato. Il precedente deve essere un Drift risolto correggendo il codice o adeguando il Modello: un Drift aperto, dismesso o inesistente è rifiutato, dicendo perché. Il comando dice quando il Drift è ricorrente e qual è il precedente. La delega dell'autopilota non sceglie mai un Drift con precedente, in nessuna modalità. I Drift scritti prima del campo non sono ricorrenti e non vanno riscritti.
