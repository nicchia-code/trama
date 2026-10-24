---
technical: false
refs:
  - proposal
  - requirements/rules#proposal
---
# Approvazione con Approve All

Il lato Proposal di Approve All, che sostituisce Refine All nel menù in basso della Board. La coda dell'host (presa delle Proposal, attese, raffinamenti, Cancel Approve All, etichette) è un Task fratello sulla Machine `raffinamento`; questo Task garantisce che le regole di stato della Proposal valgano per ogni approvazione fatta da Approve All, e che queste approvazioni passino dallo stesso percorso di Approve.

## Cosa deve essere vero alla fine

Nello stato Open della Proposal valgono le transizioni nuove:

- `developer.APPROVA_TUTTE` → Approved: Approve All ha preso la Proposal perché si può approvare: non è bloccata, non è allegata a un Drift aperto e l'agente che l'ha consegnata ha finito il turno; e nessun Run lanciato da questa finestra è in corso. Vale per ogni tipo di Proposal: design, import, setup e risoluzioni. È approvata con le stesse conseguenze di Approve, Task compresi, nell'ordine del Backlog e dopo le Proposal che richiede prese dallo stesso clic; Trama la ricontrolla subito prima di approvarla. Se l'approvazione è rifiutata, la Proposal resta Open, un avviso in cima alla Board dice quale e perché (`Trama: <numero breve> was not approved: <motivo>.`, uno per Proposal) e Approve All continua con le altre.
- `developer.APPROVA_TUTTE` → Open: Approve All ha preso la Proposal ma non la approva subito e nessun file cambia: è da raffinare, oppure con Auto-update Stale Proposals acceso un'approvazione dello stesso clic l'ha resa obsoleta, e Trama la raffina o la mette in coda; oppure aspetta una Proposal che richiede, presa anche lei, in coda, in raffinamento o in attesa della fine di un Run; oppure un Run lanciato da questa finestra è in corso e la Proposal aspetta la sua fine. Con la funzione spenta, una Proposal resa obsoleta dallo stesso clic resta Open, obsoleta e non approvata.
- `raffinamento.APPROVAZIONE_PRONTA` → Approved (evento nuovo): una Proposal presa da Approve All senza bisogno di raffinamento ha finito di aspettare la fine di un Run o l'approvazione delle Proposal che richiede. È approvata come se il developer l'avesse approvata in quel momento, con le stesse condizioni e conseguenze, Task compresi; senza agente e senza posti. Se l'approvazione è rifiutata, la Proposal resta Open e un avviso in cima alla Board dice perché.
- `raffinamento.PROPOSAL_RAFFINATA` → Approved: il testo ora dice che il raffinamento può essere stato chiesto con Approve o con Approve All; il comportamento non cambia.

Regola in `rules#proposal`: Approve dal pannello resta indisponibile mentre un Run lanciato da questa finestra è in corso (motivo `A run is in progress`), ma Approve All è l'eccezione: resta disponibile e fa partire i raffinamenti, mentre le Proposal che prende, raffinate o già approvabili, si approvano solo alla fine del Run. Un Run di un'altra finestra non conta.

## Dove nel codice

- Ogni approvazione diretta di Approve All (subito, alla fine del Run in `releaseWaiting`, o quando le Proposal richieste sono approvate) chiama `approveProposal` in `src/core/proposals.ts` dentro `approving(...)` di `extension/src/host/controller.ts`, come fa `settleRefined`: così si creano i Task in To do, si rigenerano le skill dei Requirement (`configuredSkillsDir()`) e una risoluzione risolve i suoi Drift, per ogni tipo di Proposal. Nessun percorso di approvazione separato.
- Subito prima di approvare si ricontrolla: `approvalBlock` (`src/core/proposals.ts`), l'allegato a un Drift aperto con `requireNotAttached` (`src/core/work.ts`), e `proposalsFinishing` (la stessa attesa di fine turno di `refuseWhileFinishing`). Un errore di uno di questi o di `approveProposal` non ferma il ciclo: produce l'avviso `Trama: <numero breve> was not approved: <motivo>.` (numero breve da `cardName`) e la Proposal resta Open.
- `refuseWhileRunning` resta valido per il messaggio `approveProposal` (case `approveProposal` del controller) e non va applicato al messaggio di Approve All: con un Run della finestra in corso, le Proposal approvabili vanno nella lista d'attesa (`refinement.waiting`) e sono approvate alla fine del Run, dopo le richieste, secondo `dependencyOrder`.
- Coordinare con il Task di `raffinamento`, che rinomina `refineAll`/`cancelRefineAll` e gestisce la coda: questo Task fornisce il passo di approvazione diretta con i controlli sopra.

## Test

In `test/host-agent-terminals.test.ts` (accanto ai test di Refine All): Approve All approva una Proposal approvabile di ogni tipo con le stesse conseguenze di Approve (Task creati per un design, Drift risolti per una risoluzione); una Proposal allegata a un Drift aperto, bloccata o con l'agente che sta finendo non è approvata, resta Open e compare l'avviso, mentre le altre sono approvate; con un Run della finestra in corso nulla è approvato finché il Run non finisce, poi le Proposal sono approvate con le richieste prima; Approve singolo resta rifiutato durante il Run.
