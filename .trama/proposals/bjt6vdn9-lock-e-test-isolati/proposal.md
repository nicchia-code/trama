---
status: approved
base:
  requirements/tech/proposal.md: 169c8146a66e9ac1c9978ba2c2eb31afbdf0cbcd800e42a34ffe19eaf2218bd7
delete: []
request: 2026-10-17T23-11-27
created: 2026-10-17T21:18:51.753Z
label: Test unitari
---
# Lock e test isolati

La richiesta chiede di correggere i test unitari. Su 1001 test ne falliscono 13, per due cause distinte.

- 12 test di `host-agent-terminals` falliscono solo nella suite: da soli passano. Tre test precedenti avviano un lavoro (un Run o una risoluzione nel terminale, un lancio nella chat) e non lo chiudono mai, così i test successivi vedono un Run o una risoluzione ancora in corso. Il codice segue il Modello (`agent-terminal`, `drift-resolution`): il lavoro finisce solo con un segnale. Il difetto è nei test.
- Il test del lock delle Proposal fallisce circa una volta su cinque perché si perdono una o due registrazioni. Il Modello (`proposal/Draft`, `agent.EDIT_PROPOSAL`: più agenti scrivono insieme senza perdere nulla) e `tech#proposal` danno ragione al test. Il difetto è nel codice: un lock che sparisce fra il tentativo e il controllo della sua età viene creduto abbandonato e cancellato, anche quando un altro processo lo ha appena preso. Inoltre l'identità della Proposal si ricava leggendo il suo file fuori dal lock.

Decisioni:
- Test dei terminali: si correggono i tre test che lasciano lavori aperti, chiudendo il terminale o la chat che avviano. Nessun codice di produzione cambia per questo.
- Lock: correzione mirata. Un lock sparito nel frattempo si riprova senza cancellare nulla, e l'identità della Proposal si ricava dal nome della sua cartella, senza aprire il suo file fuori dal lock. Niente scrittura atomica del file della Proposal e niente lock con proprietario.
- Requisiti: solo una riga in `tech#proposal` che precisa il comportamento del lock. Nessuna regola nuova sull'isolamento dei test.
- Verifica del lock: il file del test eseguito da solo 50 volte di fila senza fallire, più la suite completa verde.
