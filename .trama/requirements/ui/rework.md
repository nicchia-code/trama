---
description: "Usa quando costruisci o cambi la freccetta di Reject e di Dismiss Drift, il suo menu Rework with feedback, la casella del feedback e la sua conferma."
---
# Rework with feedback

## developer.REWORK_PROPOSAL
- `Reject` è un pulsante diviso, fatto come `+ Add Work Item` (`ui#developer.OPEN_QUICK_TASK`): a sinistra `Reject`, con la sua icona e la sua variante di sempre; a destra, stretta e unita a lui, la freccetta a sola icona `ChevronDown`, con tooltip e nome accessibile `More ways to reject <numero breve>`. Vale sulla scheda in Backlog di ogni Proposal (ordinaria, di setup, di import e gialla di risoluzione) e nei dettagli di una Proposal nel Diagramma, dove al posto del numero breve c'è l'identità permanente quando la Proposal non ha numero.
- Il pulsante diviso, freccetta compresa, sta sempre tutto dentro la scheda della Board o i dettagli del Diagramma che lo contengono: non va mai oltre i loro bordi, e la freccetta resta sempre unita alla parte principale, sulla stessa riga, anche quando i pulsanti accanto vanno a capo. Vale anche per `Dismiss Drift` (`ui#developer.REWORK_DRIFT`) e per `+ Add Work Item` (`ui#developer.OPEN_QUICK_TASK`).
- La freccetta, con il clic o da tastiera come ogni `DropdownMenu`, apre sotto il pulsante un menu con una sola voce, `Rework with feedback…`, senza icona, con tooltip `Reject it and have the agent redo it with your feedback`. Il menu non ripete `Reject`.
- La freccetta è disabilitata, e segnata come tale per le tecnologie assistive, quando lo è `Reject`, con gli stessi motivi nello stesso ordine (`The agent is still finishing` prima di ogni altro). Per una risoluzione lo è anche quando `Resolve` non partirebbe, con i motivi di `Resolve` (`Drifts are being resolved`, `A run is in progress`, `Proposal <id> resolving Drifts awaits a decision`), dopo quelli di `Reject`.
- `Reject` da solo non apre più nessuna casella: rifiuta subito, senza feedback.
- `Rework with feedback…` apre la casella di input dell'editor, sopra la finestra, intitolata `Rework <numero breve> – <titolo>`, con il testo `What should the agent change? Leave empty to redo it on the current Model.` e il segnaposto `Feedback for the agent`. La casella resta aperta quando perde il focus; Esc la chiude senza fare nulla.
- Confermata con un testo, parte subito. Confermata vuota, o con soli spazi, apre una finestra modale dell'editor: `Rework <numero breve> without feedback? The agent redoes it on the current Model.`, con il pulsante `Rework` e l'annullamento dell'editor. `Rework` fa partire la rielaborazione; annullare non fa nulla.
- Se il rifiuto è rifiutato quando la rielaborazione sta per partire (per esempio la Proposal non è più aperta o è stata allegata a un Drift), compare l'avviso `Trama: <motivo>` come per `Reject` e non parte nulla.
- Tutti questi testi sono in inglese e non seguono `trama.language`.

## developer.REWORK_DRIFT
- `Dismiss Drift` è un pulsante diviso come `Reject`, sulla scheda rossa in Backlog e nei dettagli di un Drift nel Diagramma: a destra la freccetta a sola icona `ChevronDown`, con tooltip e nome accessibile `More ways to handle <numero breve>`. Il menu ha una sola voce, `Rework with feedback…`, senza icona, con tooltip `Have the agent resolve this Drift following your feedback`.
- La freccetta è disabilitata quando lo è `Dismiss Drift`, con gli stessi motivi nello stesso ordine, e anche quando `Resolve` non partirebbe, con i motivi di `Resolve` dopo quelli di `Dismiss Drift`.
- La voce apre la casella di input dell'editor intitolata `Rework <numero breve> – <titolo>`, con il testo `How should the agent resolve this Drift? Leave empty to resolve it as Resolve does.` e il segnaposto `Feedback for the agent`; resta aperta quando perde il focus ed Esc la chiude senza fare nulla.
- Confermata vuota, o con soli spazi, apre la finestra modale `Resolve <numero breve> without feedback?`, con il pulsante `Resolve` e l'annullamento dell'editor; annullare non fa nulla. Con un testo parte subito.
- Mentre l'agente lavora, la scheda del Drift è segnata `Resolving` come dopo `Resolve`.
- Tutti questi testi sono in inglese e non seguono `trama.language`.
