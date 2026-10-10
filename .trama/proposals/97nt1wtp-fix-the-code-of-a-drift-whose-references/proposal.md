---
status: rejected
base:
  work/drift.md: 0e192268b9d5be369e1e3e443de7f00067038489c34bd3e960bd2ebcb70e209d
  requirements/rules/drifts.md: 9d15096e53c502f3973e5a459a9c2ac532bffaf9e2c4081ad85c9958c6287751
delete: []
created: 2026-10-09T19:24:43.593Z
---
# Fix the code of a Drift whose references no longer resolve

Il codice gestisce un caso che il Modello non prevede: decidere di correggere il codice di un Drift i cui riferimenti non si risolvono più (elementi rinominati o tolti dopo che il Drift è stato archiviato). Il developer ha già scelto questo comportamento risolvendo due Drift (Task zvc6rarm e 9o405ua4); questa Proposal lo porta nel Modello e nelle regole del Drift.

Scelte fatte senza intervista, da controllare:
- Il Task di correzione punta ai riferimenti del Drift che si risolvono ancora e, per ognuno che non si risolve più, all'elemento più vicino che lo conteneva e c'è ancora (un Requisito sparito diventa la sua Area); un riferimento senza contenitore è lasciato fuori.
- Se il Drift punta al Modello ma non ne resta alcun elemento, nemmeno un contenitore, tenere ciò che dovrebbe succedere è rifiutato: il Drift resta Open e il rifiuto dice che si può solo chiudere (o accettare la Proposal allegata).
- Titolo e tipo del Task (tecnico o no) si decidono dai riferimenti del Drift, non da quelli sostituiti.
- La stessa regola vale per una risoluzione che decide di correggere il codice (la Transition proposal.APPROVED → Code to be fixed rimanda già a quella del developer); il blocco della risoluzione stessa sta nella Proposal e non è toccato qui.

## Feedback

Drift o7kv3use resolved by Proposal 207t8egb
