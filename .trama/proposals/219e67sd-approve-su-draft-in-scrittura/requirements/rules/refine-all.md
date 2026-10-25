---
description: "Use when implementing Cancel on a queued Proposal, Refine All and Cancel Refine All."
---
# Refine All and refining queue cancellation

## developer.ANNULLA_RAFFINAMENTO
- È disponibile solo sulla scheda di una Proposal in coda di questa finestra. L'host ricontrolla che sia ancora in coda; altrimenti non fa nulla.

## developer.RAFFINA_TUTTE
- Prende, nell'ordine del Backlog, ogni Proposal da raffinare che non è già in coda o in raffinamento e il cui `Approve` sarebbe disponibile (`rules#raffinamento`), senza contare il motivo `A run is in progress`. Prende anche una Proposal da raffinare bloccata solo da Proposal che richiede e che non sono approvate, quando ognuna di quelle è presa a sua volta, è già in coda, è in raffinamento o è raffinata in attesa della fine di un Run; la relazione è transitiva. Il numero `n` dell'etichetta conta le Proposal che il clic prenderebbe in quel momento.
- Indisponibile, con questi motivi in quest'ordine: `Turn on Auto-update Stale Proposals in Settings` (funzione spenta), `No Proposal to refine` (`n` vale 0). Un Run in corso, un altro raffinamento al lavoro, una risoluzione o un'unificazione non la rendono indisponibile.
- Il clic mette in coda tutte le Proposal prese, in una volta sola, come altrettanti `Approve`, e fanno partire le Proposal pronte (`rules#raffinamento`). Non approva nulla e non cambia nessun file. L'host ricontrolla le condizioni al clic e prende le Proposal in quel momento; con `n` a 0 non fa nulla.
- Dal clic, la finestra ricorda che `Refine All` è in corso, finché nella coda resta almeno una Proposal che aspetta di partire. Intanto la voce è `Cancel Refine All`; quando la coda si svuota, per partenze, uscite, `Cancel` sulle schede, `Cancel Refine All` o la funzione spenta, la voce torna `Refine All (<n>)`, anche mentre dei raffinamenti lavorano ancora. Approve su una scheda, senza `Refine All` in corso, non cambia la voce.
- Le Proposal raffinate dopo `Refine All` si approvano alla fine del loro raffinamento come con Approve; mentre un Run lanciato da questa finestra non è finito, aspettano la sua fine con il badge `waiting for the run` (`rules#raffinamento`).

## developer.ANNULLA_RAFFINA_TUTTE
- Disponibile solo mentre `Refine All` è in corso e almeno 2 secondi dopo il clic su `Refine All`: prima la voce `Cancel Refine All` c'è ma non si può scegliere.
- Svuota tutta la coda della finestra, anche le Proposal messe in coda con Approve: ognuna torna da raffinare senza cambiare file. I raffinamenti al lavoro continuano e alla fine sono guardati come sempre, approvazione compresa; quelli in attesa della fine di un Run restano in attesa. La voce torna `Refine All (<n>)`.
- L'host ricontrolla al clic che `Refine All` sia in corso; altrimenti non fa nulla.
