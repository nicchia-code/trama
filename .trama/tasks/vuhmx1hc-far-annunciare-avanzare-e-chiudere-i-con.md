---
column: done
technical: false
refs:
  - agent.CHANGE_CHECK_PHASE
  - agent.FINISH_CHECK
  - announcement/Checking
  - requirements/rules#announcement
  - requirements/tech#announcement
drift: null
proposal: h1ezgi8s
agent: false
created: 2026-10-06T21:29:23.173Z
finished: 2026-10-06T21:33:47.313Z
---
# Far annunciare, avanzare e chiudere i controlli a trama-implement e trama-scan

L'agente dichiara i propri controlli, così la Board dice che sta ancora lavorando quando nessuna scheda è più in In progress.

Quando è fatto:
- `trama-implement`, dopo l'ultimo Task di una corsa che ne ha portato almeno uno in Done, annuncia il controllo in Verifying prima della verifica finale; se parte lo scan del System intero lo passa a Scanning, altrimenti lo chiude dopo la verifica;
- `trama-scan`, quando non fa parte di una corsa di `trama-implement` (dopo un'approvazione, dopo l'unione di un giro di worktree, chiesta a mano), annuncia il controllo in Scanning prima di leggere il codice; dentro una corsa usa il controllo della corsa;
- la scansione dopo un'approvazione che prosegue con l'implementazione chiude il suo controllo prima del primo Task; il controllo finale dell'implementazione è un annuncio nuovo;
- entrambe chiudono il controllo prima del resoconto, anche quando la verifica fallisce, e non aspettano che il ghost si veda;
- i titoli sono quelli dei Requisiti, in inglese: `Final check of <Proposal>`, `Final check after Task <n>`, `Final check after all Tasks`, `Scan of <Proposal>`, `Scan of the System`, `Scan of Feature <a>` / `Scan of Features <a>, <b>`, `Scan after merge`;
- un sotto-agente non annuncia controlli e una corsa in un worktree non ne annuncia: l'istruzione di un worktree che dice di non scansionare dice anche di non annunciare controlli.
