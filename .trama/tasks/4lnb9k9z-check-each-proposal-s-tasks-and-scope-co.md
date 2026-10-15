---
column: done
technical: false
refs:
  - proposal/Draft/agent.SUBMIT_PROPOSAL
  - proposal/Open
  - requirements/rules#proposal
  - requirements/data#proposal
drift: null
proposal: 2pa6eli4
agent: false
created: 2026-10-14T08:39:13.426Z
finished: 2026-10-14T09:33:11.506Z
---
# Check each Proposal's Tasks and scope coverage before hand-over and approval

Una Proposal ordinaria non allegata a un Drift è valida solo se ogni voce del suo scope è coperta: ogni elemento o sezione `changed`, ogni `removed, its container` e ogni `leads into a change`.

- Una voce è coperta da un Task della Proposal che la nomina o che nomina ciò che la contiene.
- Una sezione dei Requisiti è coperta da un Task che nomina quella sezione o la sua Area.
- Una voce è coperta anche da una riga della sezione `## Already present` del corpo, con lo stesso criterio.
- Le voci di rimozione sono coperte dai Task di rimozione che l'approvazione crea.

La Proposal è invalida quando un Task nomina un elemento o una sezione che con la Proposal applicata non esiste, quando un Task non tecnico non ha riferimenti al Modello, quando un Technical Task ha riferimenti al Modello, quando un Task ha un campo non ammesso, o quando una riga di `## Already present` ha un riferimento che non si risolve.

Import, risoluzioni e Proposal allegate a un Drift con Task sono invalide. Una sola funzione controlla tutto questo per la validazione, per la consegna e per il blocco dell'approvazione: la consegna rifiutata nomina ogni voce scoperta e ogni Task sbagliato, e una Proposal aperta che non rispetta più queste regole è bloccata e non si approva.
