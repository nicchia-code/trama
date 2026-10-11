---
column: done
technical: false
refs:
  - drift-resolution
  - requirements/data#drift-resolution
  - requirements/quality#drift-resolution
  - requirements/rules#drift-resolution
  - requirements/tech#drift-resolution
  - requirements/ui#drift-resolution
  - requirements/quality#agent-launching
drift: null
proposal: ndrmsitf
agent: false
created: 2026-10-10T20:33:27.269Z
finished: 2026-10-10T21:42:44.895Z
---
# Implement Drift autopilot coordination

Implementare il comportamento della Machine di risoluzione automatica dei Drift: distinguere flusso manuale, delega ai soli Drift non critici e delega a tutti; attendere i lavori e gli scan Trama dell'intero progetto prima di raccogliere; autorizzare in modo esclusivo e circoscritto le prime correzioni raccomandate, la loro approvazione e l'esecuzione delle sole correzioni e origini ancora dovute. Conservare il flusso manuale per i casi esclusi o non applicabili, sospendere nuovi passi dopo fallimenti o perdita del coordinamento, rispettare i cambi di delega e mostrare stato e motivi nella Board e nei percorsi accessibili. Nessuna scelta deve modificare il Modello o includere Task estranei.
