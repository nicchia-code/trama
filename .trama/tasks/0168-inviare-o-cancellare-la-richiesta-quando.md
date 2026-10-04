---
column: done
technical: false
refs:
  - design-request/Writing/developer.CLOSE_REQUEST
  - design-request/Writing/workspace.REQUEST_DELETED
  - design-request/Abandoned
  - requirements/rules#design-request
  - requirements/tech#design-request
  - requirements/ui#design-request
drift: null
proposal: "0034"
agent: false
---
# Inviare o cancellare la richiesta quando il developer ne chiude la scheda

Chiudere la scheda di una richiesta mai inviata è il gesto con cui la si invia. La chiusura conta solo quando nessun'altra scheda mostra più lo stesso file; chiudere la finestra dell'editor non conta e non invia nulla.

Fatto quando:
- chiudendo la scheda si legge il testo **su disco**: se non è vuoto parte la stessa istruzione di Send to agent e la richiesta è segnata come inviata solo se l'istruzione è partita; se non parte, la richiesta resta su disco mai inviata;
- se il testo su disco è vuoto (anche perché il developer ha rifiutato di salvare) il file è cancellato senza messaggi e non parte nulla;
- chiudere la scheda di una richiesta già inviata non invia e non cancella nulla, anche se è vuota;
- il file di una richiesta mai inviata cancellato da fuori non invia nulla e la sua scheda si chiude se non ha modifiche non salvate.
