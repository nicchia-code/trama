---
column: done
technical: false
refs:
  - drift-resolution/Resolving/proposal.APPROVED
  - drift-resolution/Resolving
  - requirements/rules#drift-resolution
  - requirements/ui#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-14T10:08:35.423Z
finished: 2026-10-14T10:14:46.232Z
---
# Start the automatic Run when the developer approves an automatic resolution Proposal

Quando il developer approva dal Board o dalla riga di comando una risoluzione automatica della raccolta ancora in corso, quell'approvazione deve valere come quella dell'host: le correzioni create dalla risoluzione entrano nella raccolta come approvate, e alla fine dell'agente di risoluzione parte il Run automatico solo su quelle correzioni e sulle loro origini ancora da completare, con le stesse condizioni di oggi. Oggi l'approvazione del developer non viene riconosciuta dalla raccolta: alla fine dell'agente i Drift risultano falliti con il motivo che nessuna decisione automatica è stata inviata, nessun Run parte, e il Drift resta marcato come fallito pur essendo già risolto.
