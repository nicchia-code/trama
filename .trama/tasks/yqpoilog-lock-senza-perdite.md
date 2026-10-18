---
column: done
technical: false
refs:
  - proposal/Draft/agent.EDIT_PROPOSAL
  - requirements/tech#proposal
drift: null
proposal: bjt6vdn9
agent: false
created: 2026-10-17T21:20:34.786Z
finished: 2026-10-17T21:30:21.483Z
---
# Lock senza perdite

Più agenti che registrano file sulla stessa Proposal Draft insieme non ne perdono nessuno, come dice `agent.EDIT_PROPOSAL` in Draft.

A lavoro finito vale `tech#proposal`:

- il lock di una Proposal è un file creato in modo esclusivo;
- chi lo trova già esistente lo toglie solo quando è più vecchio del limite oltre il quale si considera abbandonato;
- se il file sparisce fra il tentativo di crearlo e il controllo della sua età, riprova a crearlo senza cancellare nulla, perché nel frattempo un altro processo può averlo preso;
- per prendere il lock basta l'identità ricavata dal nome della cartella della Proposal: nessun file della Proposal si legge prima di avere il lock.

Restano fuori, per decisione del developer, la scrittura atomica del file della Proposal e un lock che porta il segno del suo proprietario.

Verifica: il test `test/proposal-lock.test.ts` (*registrations on one Proposal from several processes at once all survive, and the lock leaves nothing behind*), che oggi perde una o due registrazioni circa una volta su cinque, passa eseguito da solo 50 volte di fila. La suite completa (`bun test --isolate`) è verde.
