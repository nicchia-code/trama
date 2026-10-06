---
status: resolved
resolution: fix-code
refs:
  - design-request/Consumed
  - design-request/Abandoned
  - requirements/rules#design-request
  - requirements/tech#design-request
proposal: null
task: jjsntwro
origin: null
option: 1
note: null
created: 2026-10-06T20:38:37.310Z
---
# Una richiesta cancellata ma aperta con modifiche non salvate può ancora essere inviata

## What happens

Quando il file di una richiesta sparisce (consegna della sua Proposal o cancellazione da fuori) mentre la sua scheda ha **modifiche non salvate**, la scheda resta aperta, come previsto, ma Trama continua a trattarla come una richiesta mai inviata:

- il pulsante Send to agent ricompare appena il developer torna su quella scheda, perché la richiesta è stata tolta anche dall'elenco delle inviate;
- premerlo salva il documento, **ricreando il file**, e manda di nuovo l'istruzione all'agente;
- chiudere la scheda accettando di salvare ricrea il file e lo invia allo stesso modo.

Così una richiesta già consumata parte una seconda volta, e una abbandonata parte dopo essere stata cancellata.

## What should happen

**Abandoned** e **Consumed** sono finali: dopo la cancellazione Trama non tiene più traccia della richiesta e non invia nulla.

- Una richiesta parte **una sola volta**; per ripartire serve una richiesta nuova (Design…).
- Con modifiche non salvate la scheda resta, e quello che il developer ne fa è affare dell'editor: salvarla non deve trasformarla di nuovo in una richiesta da inviare.
- Send to agent compare solo sulle schede di un file in `.trama/requests/` mai inviato.

## Fix options

### Dimenticare le schede delle richieste cancellate

Quando il file sparisce, Trama ricorda per questa sessione che quella richiesta è finita: niente pulsante Send to agent, nessun invio né alla pressione né alla chiusura, anche se l'editor la salva di nuovo su disco. Costo: un piccolo elenco in memoria delle richieste chiuse, oltre a quello delle inviate.

### Rifiutare l'invio di un file che non esiste su disco

Send to agent non salva e non invia quando il file non c'è più, e il pulsante si nasconde; la chiusura non invia un file che il developer ha appena ricreato salvando. Costo minimo, ma un salvataggio fatto a mano dal developer prima di premere il pulsante farebbe tornare la richiesta in Writing.

### Lasciare il comportamento e cambiare il Modello

Il Modello ammetterebbe che una richiesta cancellata con modifiche non salvate, una volta salvata, torni in Writing e possa essere inviata di nuovo. Costo: Abandoned e Consumed non sarebbero più finali e la regola «una richiesta parte una sola volta» avrebbe un'eccezione.

## Where in the code

`extension/src/host/design-requests.ts`: `deleted` toglie l'ID dall'elenco delle inviate ma non segna la richiesta come finita; `send` e `closed` non distinguono un file ricreato salvando.
