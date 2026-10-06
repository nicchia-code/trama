---
column: done
technical: false
refs:
  - design-request/Writing/workspace.REQUEST_DELETED
  - design-request/Sent/workspace.REQUEST_DELETED
  - design-request/Sent/proposal.SUBMITTED
  - requirements/tech#design-request
  - requirements/rules#design-request
drift: null
proposal: null
agent: false
created: 2026-10-06T15:18:51.519Z
finished: 2026-10-06T15:20:58.452Z
---
# Chiudere la scheda di una richiesta cancellata anche a pannello chiuso

Quando il file di una richiesta di design sparisce, perché la consegna della Proposal legata l'ha consumata o perché è stato cancellato da fuori, Trama chiude la sua scheda se non ha modifiche non salvate, smette di salvarla e la toglie dall'elenco delle inviate. Oggi questo succede solo mentre il pannello di Trama è aperto: a pannello chiuso la scheda resta aperta, segnata come cancellata.

Fatto quando: con il pannello chiuso, consegnare la Proposal legata a una richiesta inviata, oppure cancellare a mano il file di una richiesta in scrittura o inviata, chiude la sua scheda senza modifiche non salvate e non invia nulla; una scheda con modifiche non salvate resta all'editor.
