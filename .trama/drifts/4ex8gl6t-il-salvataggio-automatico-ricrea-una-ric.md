---
status: resolved
resolution: fix-code
refs:
  - design-request/Sent/proposal.SUBMITTED
  - design-request/Sent/workspace.REQUEST_DELETED
  - design-request/Writing/workspace.REQUEST_DELETED
  - requirements/rules#design-request
proposal: null
task: 9go0c6yv
origin: null
option: 1
note: null
created: 2026-10-06T12:37:49.094Z
---
# Il salvataggio automatico ricrea una richiesta già cancellata, che può partire di nuovo

## What happens

Quando il file di una richiesta sparisce (consegna della Proposal legata o cancellazione da fuori) e la sua scheda ha **modifiche non salvate**, la scheda resta aperta, ma Trama continua a salvarla da sé: alla modifica successiva il file **torna su disco**.

- La richiesta è già stata tolta dall'elenco delle inviate, quindi torna in Writing con il pulsante Send to agent.
- Chiudendo la scheda l'istruzione parte **una seconda volta** verso l'agente, per una richiesta già consumata.

## What should happen

Consumed e Abandoned sono Stati finali: dopo la cancellazione la richiesta non esiste più e non può ripartire (una richiesta parte una sola volta). La scheda con modifiche non salvate è lasciata all'editor: quello che il developer ne fa è affare dell'editor, non di Trama, che quindi non dovrebbe più salvarla né inviarla da sé.

## Fix options

### Smettere di salvare da sé le richieste cancellate

Dopo la cancellazione Trama non salva più da sé quel documento: il file torna solo se il developer lo salva a mano, cosa che riguarda l'editor. Cambia poco codice; resta il caso, raro, in cui il developer salva a mano e poi chiude la scheda, che rimanderebbe la richiesta.

### Ricordare le richieste finite e non rimandarle mai

Oltre a non salvarle più, Trama ricorda gli ID delle richieste consumate o abbandonate per la sessione e non le tratta mai più come in Writing, anche se il file ricompare. Chiude del tutto il doppio invio, al costo di un secondo elenco da tenere.

### Accettare il ritorno in Writing nel Model

Il Model descrive che una richiesta cancellata con modifiche non salvate può ricomparire in Writing e ripartire. Nessuna modifica al codice, ma serve una Proposal e l'agente può ricevere due volte la stessa richiesta.

## Where in the code

extension/src/host/design-requests.ts: `scheduleSave` (salva ogni documento di `.trama/requests/` senza controllare che il file esista ancora) e `watchDeletions` (toglie l'ID dall'elenco delle inviate)
