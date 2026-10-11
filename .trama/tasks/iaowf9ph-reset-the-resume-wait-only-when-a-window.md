---
column: done
technical: false
refs:
  - drift-resolution/Free
  - requirements/data#drift-resolution
  - requirements/rules#drift-resolution
  - requirements/tech#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-11T09:09:15.277Z
finished: 2026-10-11T09:19:43.965Z
---
# Reset the resume wait only when a window takes over as coordinator

L'attesa della ripresa (la fine di uno scan, con qualunque esito, o una richiesta Resolve Drifts) deve ripartire quando una finestra acquisisce davvero il ruolo di coordinatore, e non prima né dopo. Oggi parte al primo controllo fatto con la delega attiva da una finestra che non lo ricorda ancora come proprio: se lo scan è finito mentre la delega era disabilitata, attivarla cancella quella ripresa e la delega resta ferma sui Drift esistenti fino a un nuovo scan o a Resolve Drifts, anche se la delega era già operativa; se la delega viene disabilitata mentre il ruolo passa a un'altra finestra e poi lo si riacquista, l'attesa non riparte e la raccolta può partire subito dai file; una richiesta Resolve Drifts arrivata nello stesso controllo in cui si acquisisce il ruolo viene cancellata. Deve essere vero a fine lavoro: l'acquisizione effettiva del ruolo, in qualunque modalità, riporta il progetto in attesa di ripresa; la fine di uno scan o una richiesta Resolve Drifts successive alla ripresa la rendono operativa e restano valide quando la delega viene attivata o cambiata; attivare la modalità da sola non cambia lo stato di ripresa.
