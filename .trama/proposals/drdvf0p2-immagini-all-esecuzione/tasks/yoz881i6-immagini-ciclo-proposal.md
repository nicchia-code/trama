---
technical: false
refs:
  - proposal
  - proposal/Draft/agent.EDIT_PROPOSAL
---

# Immagini nel ciclo della Proposal

Quando il Task è finito, le immagini legate ai Task (cartella locale `.trama/task-images/<task-id>/`, ignorata da git) seguono il ciclo di vita della Proposal in `src/core/proposals.ts`:

- `agent.EDIT_PROPOSAL`: legare un'immagine a un Task di una Proposal ordinaria, o toglierla, è una modifica di un suo file come scrivere o togliere un Task. Una Proposal `open` torna quindi in Draft e Trama lo dice come per ogni altra modifica; nient'altro cambia. Togliere un Task dalla Proposal toglie anche le sue immagini (la sua cartella è cancellata).
- Approvazione: le immagini restano ai Task creati, che mantengono la stessa identità; nessuna cancellazione.
- Rifiuto senza Rework with feedback (la Proposal rifiutata non ha `reworkRequested: true`) e scarto (discard): le immagini di tutti i Task della Proposal sono cancellate.
- Rifiuto con Rework with feedback (`reworkRequested: true`): le immagini restano finché la Proposal nuova che la rifà (quella con `reworks` uguale all'id della rifiutata) non è consegnata; alla consegna della Proposal che rifà, le immagini dei Task della Proposal rifiutata sono cancellate. Così l'agente che rifà può copiarle sui Task nuovi.
- Una cancellazione che trova la cartella già sparita non fallisce.

Valgono per tutti questi punti le Proposal precedenti su cui questa si basa: il campo `reworks` e il marcatore `reworkRequested` vengono dalla Proposal "Rework with feedback".

Il comando `trama proposal edit <id>` con `images: [{task, path}]` (copia nella cartella del Task) e la funzione che cancella le immagini di un Task sono coperti dal Task su `requirements/tech#design-request`: questo Task li riusa, senza duplicarli, e si limita a chiamare la cancellazione nei punti del ciclo di vita sopra (`rejectProposal`, `discardProposal`, rimozione di un Task in modifica, consegna della Proposal che rifà) e a trattare legare/togliere immagini come modifica in Draft.
