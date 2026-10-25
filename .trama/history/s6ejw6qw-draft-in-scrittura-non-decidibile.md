---
created: 2026-10-25T09:50:23.956Z
updated: 2026-10-25T09:50:23.956Z
summary: Approve, Reject e Rework con feedback sono disabilitati, con il motivo, su una Draft che un agente sta ancora scrivendo o rimasta a metà, sulla Board e nel Diagramma, prima del clic.
tasks:
  - hwwsh08w
cleared:
  hwwsh08w:
    title: Draft in scrittura non decidibile
    proposal: 219e67sd
    tag: Approve su Draft
    finished: 2026-10-25T09:21:41.580Z
    refs:
      - raffinamento
      - proposal/Draft
      - requirements/rules#raffinamento
      - requirements/ui#raffinamento
      - requirements/tech#raffinamento
---
# Draft in scrittura non decidibile

Prima si poteva premere Approve o Reject su una Proposal ancora Draft e l'errore compariva solo dopo il clic. Ora i pulsanti sono disabilitati in anticipo e il motivo è scritto accanto a loro.

Una Draft è «in scrittura» quando un raffinamento di questa finestra la sta scrivendo, oppure quando un annuncio ancora vivo è legato a lei. Conta qualunque terminale, finestra o lancio lo abbia prodotto, con Auto-update Stale Proposals acceso o spento. Una Draft in scrittura non viene mai messa in coda da Approve né da Refine All.

Lo snapshot della Board porta per ogni Draft in raffinamento il campo nuovo `writer`, cioè fase e ultima nota dell'annuncio legato. Con `writer` presente la scheda mostra il badge `refining`, il bordo animato, la riga di fase e l'ultima nota. Approve, Reject e la freccetta di Rework sono disabilitati con il motivo «The agent is refining this Proposal». Non c'è Cancel, perché il lavoro non è nella coda della finestra.

Con la funzione spenta una Draft rimasta a metà e senza nessuno che la scriva resta sulla Board con il chip `to refine`. I pulsanti sono visibili ma disabilitati e il motivo spiega di accendere Auto-update Stale Proposals per riprendere il raffinamento. Questa Draft non conta fra ciò che aspetta una decisione.

I due motivi nuovi vengono dopo «The agent is still finishing» e prima di «A run is in progress». I motivi sono calcolati una sola volta e usati sia dalla scheda della Board sia dal blocco della Proposal nel Diagramma.

L'host non mette mai in coda una Draft in scrittura. I messaggi di approvazione, rifiuto o Rework che arrivano comunque, perché il pannello non si era ancora ridisegnato, passano al core. Il core li rifiuta con «still being written» e l'errore compare nel banner in cima al pannello.
