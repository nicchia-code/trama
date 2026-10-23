---
description: "Usa quando tocchi i dati delle voci di History e ciò che Clear della colonna Done scrive."
---
# Dati della History e di Clear

## voce-history
- Un file `history/<id>-<slug>.md` sotto `.trama/` per voce, versionato come `tasks/` e `drifts/`: la cartella non ha un `.gitignore`. L'identità ha 8 caratteri, come le schede, ed è unica fra le voci; lo slug viene dal titolo alla scrittura e non cambia quando il titolo cambia. La cartella nasce con la prima voce.
- Front matter: `created` (istante della scrittura, UTC, ISO 8601), `updated` (istante dell'ultima scrittura o aggiornamento, UTC, ISO 8601: è la data della voce), `summary` (il riassunto, una sola riga di 1–280 caratteri, Markdown solo in linea) `tasks` (lista delle identità permanenti dei Task citati, senza doppioni, nell'ordine in cui sono stati aggiunti) e, solo quando Clear ha cancellato almeno uno di quei Task, `cleared`. L'H1 è il titolo; il corpo dopo l'H1 è il testo completo, Markdown, anche vuoto. Nessun altro campo.
- Una voce cita i Task con la loro identità permanente, mai con il numero breve. Un Task citato che non esiste più resta nella lista; un file che non si legge è segnalato come errore della Snapshot e la vista History mostra le altre voci.
- Le voci non hanno numero breve e non entrano in `short-numbers/`.
- `cleared` è una mappa dall'identità permanente di un Task cancellato con Clear alla sua copia, scritta da Clear subito prima di cancellarlo: `title` (il titolo), `proposal` (l'identità della Proposal da cui il Task nasce, o assente), `tag` (il testo del tag che la Board mostrava, o assente), `finished` (l'istante di arrivo in Done, UTC, ISO 8601, o assente) e `refs` (la lista dei riferimenti del Task). Ogni chiave di `cleared` è anche in `tasks`. Una copia già scritta non cambia più: né un altro Clear né `trama history edit` la toccano, e l'aggiornamento di una voce conserva `cleared` com'è.

## developer.CLEAR_DONE
- Clear cancella un Task togliendo dal progetto il suo file `tasks/<id>-<slug>.md`, il suo file di percentuale e la sua cartella `task-images/<id>/`; non lascia segni nel file del Task né nella cartella `tasks/`, e nessuna Proposal, nessun Drift e nessun file di History perde i riferimenti al Task che già contiene.
- `.trama/last-scan/cleared`, nella cartella locale e non versionata del ricordo dell'ultimo scan globale, elenca una riga per Task cancellato da Clear che era finito dopo l'istante di `system`: l'identità permanente e il `finished`, separati da uno spazio. Il file nasce con la prima riga, si svuota quando `system` è riscritto dal lancio dello scan del Sistema, e una riga che non si legge è ignorata.
