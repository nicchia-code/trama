---
refs:
  - proposal
  - requirements/data#proposal
---
# Risoluzioni da domanda pronta

Quando il Task è finito, una risoluzione può nascere dalla risposta del developer alla domanda pronta di un Drift dell'Async Drift Resolver, e la Proposal la riconosce dal campo `prepared`.

- **Campo.** `proposal.md` ha `prepared: true` nelle risoluzioni nate da una domanda pronta, scritte da Trama o dall'agente lanciato con la risposta; altrove è assente o `false`. Va aggiunto a `parseData` e `save` di `src/core/proposals.ts`, come `nonBlocking`, altrimenti una riscrittura lo perde. È valido solo con `kind: resolution`, altrimenti la validazione lo segnala. Si scrive alla creazione e resta come storia dopo la decisione. Non cambia approvazione, rifiuto né controlli: cambia solo chi è fermato da quella risoluzione.
- **Riga di comando e dati.** `trama proposal new` accetta `prepared: true` solo con `kind: resolution` (altrimenti è un errore d'uso) e lo scrive; `proposal list`, `proposal show`, `project show`, la Snapshot e i `--json` lo portano.
- **Chi ferma `Resolve`.** `resolveDriftBlocker` e `resolveDriftsBlocker` in `src/core/resolution.ts` ignorano in `awaitingResolution` le risoluzioni con `prepared: true`: il motivo `Proposal <id> resolving Drifts awaits a decision` nomina la più vecchia risoluzione in scrittura o aperta senza `prepared: true`. Così più risoluzioni da domanda pronta possono aspettare insieme; per tutto il resto (unificazione delle schede, approvazione, rifiuto, obsolescenza, un Drift in una sola risoluzione da decidere) sono risoluzioni come le altre, e due che cambiano gli stessi file diventano obsolete l'una dopo l'approvazione dell'altra.
- **Percorso di Trama in `src/core`.** Una funzione di `src/core`, costruita su `newProposal`, `resolveDriftInProposal` e `submitProposal` (le funzioni di `trama proposal new`, `proposal edit` con `drifts` e `proposal move <id> open`), scrive da sé la risoluzione: `kind: resolution`, `prepared: true`, il solo Drift con la decisione della risposta (`fix-code` con opzione ed eventuale nota, `dismissed`, oppure `proposal` con i file della Proposal allegata copiati: `model/`, `requirements/`, `specs.yaml`, `delete`), titolo `Resolve: <titolo del Drift>` e una riga di corpo con il Drift e la decisione. La copia dei file della Proposal allegata è una funzione nuova di `src/core` che registra le basi come `proposal edit` (oggi nessuna funzione lo fa: la risoluzione `nonBlocking` la fa l'agente a mano). Poi la consegna (`drift-resolution.PREPARED_RESOLUTION_WRITTEN`) con gli stessi controlli della consegna dell'agente:
  - se riesce, la Proposal va da Draft a Open ed emette `SUBMITTED`, come ogni consegna riuscita;
  - se è rifiutata (per esempio la Proposal allegata non si applica più al Modello di adesso), la Draft passa a Discarded senza feedback con `discardProposal`, non compare mai sulla Board, e la funzione restituisce il rifiuto perché il chiamante passi la risposta all'agente di risoluzione.

Il flusso dell'host che apre la domanda pronta e chiama questo percorso è fuori da questo Task.
