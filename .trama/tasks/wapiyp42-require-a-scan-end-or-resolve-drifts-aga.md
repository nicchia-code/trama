---
column: done
technical: false
refs:
  - drift-resolution/Free
  - requirements/data#drift-resolution
  - requirements/rules#drift-resolution
  - requirements/quality#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-11T08:55:01.799Z
finished: 2026-10-11T08:59:38.602Z
---
# Require a scan end or Resolve Drifts again when a window takes over as coordinator

Quando una finestra diventa responsabile del progetto dopo l'apertura dell'editor o la perdita del coordinatore precedente, la delega non deve ripartire subito sui Drift esistenti: aspetta la fine di uno scan, con qualunque esito, o una richiesta Resolve Drifts, dopo che le finestre vive hanno ridichiarato i propri lavori. Oggi ogni finestra ricorda il termine di uno scan anche quando non è responsabile (riceve il segnale a tutte le finestre), e la finestra che acquisisce il ruolo conserva quel ricordo: avvia quindi una raccolta senza nessuna nuova fine di scan o richiesta. Deve essere vero a fine lavoro: l'acquisizione del ruolo di coordinatore riporta il progetto in attesa di ripresa, e un cambio di responsabile non libera l'automatismo.
