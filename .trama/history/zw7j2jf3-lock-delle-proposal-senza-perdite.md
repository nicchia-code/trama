---
created: 2026-10-17T21:37:03.870Z
updated: 2026-10-18T06:50:25.197Z
summary: Il lock delle scritture su una Proposal si prende dal nome della cartella prima di leggere i suoi file; un lock vecchio si toglie solo dopo averlo spostato e ricontrollato, senza cancellare un lock appena preso da un altro processo.
tasks:
  - yqpoilog
  - 1ttits98
  - 1twd0duj
  - i1giaip3
  - 8qdyespd
  - wixyoyy6
cleared:
  wixyoyy6:
    title: "Fix code to match the Model: Drift citato prima del lock"
    finished: 2026-10-18T06:43:11.335Z
    refs:
      - proposal
      - requirements/tech#proposal
  8qdyespd:
    title: "Fix code to match the Model: Numero breve non in tabella"
    finished: 2026-10-18T06:08:50.681Z
    refs:
      - proposal
      - requirements/tech#proposal
  i1giaip3:
    title: "Fix code to match the Requirements: Numero breve prima del lock"
    finished: 2026-10-17T22:20:27.137Z
    refs:
      - requirements/tech#proposal
  1twd0duj:
    title: "Fix code to match the Requirements: Lock vecchio rimosso alla cieca"
    finished: 2026-10-17T21:54:35.855Z
    refs:
      - requirements/tech#proposal
  1ttits98:
    title: "Fix code to match the Requirements: Proposal letta prima del lock"
    finished: 2026-10-17T21:53:27.162Z
    refs:
      - requirements/tech#proposal
  yqpoilog:
    title: Lock senza perdite
    proposal: bjt6vdn9
    tag: Test unitari
    finished: 2026-10-17T21:30:21.483Z
    refs:
      - proposal/Draft/agent.EDIT_PROPOSAL
      - requirements/tech#proposal
---
# Lock delle Proposal senza perdite

Il lock delle scritture su una Proposal si prende dal nome della cartella prima di leggere i suoi file; un lock vecchio si toglie solo dopo averlo spostato e ricontrollato, senza cancellare un lock appena preso da un altro processo.

Il nome del lock viene dalla cartella della Proposal e non più dalla lettura di proposal.md. Un lock sparito tra la creazione fallita e il controllo dell'età non viene più rimosso: la creazione viene ritentata dopo una breve pausa, entro il limite di attesa. Il test del lock, ripetuto cinquanta volte di seguito, non fallisce più; i test delle registrazioni esistenti restano verdi.

Il comando di risoluzione di un Drift cerca il Drift citato con il suo numero breve solo dentro il lock della Proposal: nessun file della Proposal viene letto prima che il lock sia preso. Un numero che non esiste resta un errore che non scrive nulla.
