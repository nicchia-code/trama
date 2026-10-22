---
column: done
technical: false
refs:
  - proposal/Open/developer.REJECT_PROPOSAL
  - proposal/Open/developer.REWORK_PROPOSAL
  - proposal/Rejected
  - proposal/Open/drift.CODE_FIX_CHOSEN
  - proposal/Open/drift.RESOLVED_BY_PROPOSAL
drift: null
proposal: q51924cv
agent: false
created: 2026-10-22T05:44:18.607Z
finished: 2026-10-22T05:48:19.507Z
---
# Rifiuto senza e con feedback

Il feedback facoltativo di Reject è sostituito da Rework with feedback. A Task concluso deve valere:

- Reject dal pannello (messaggio `rejectProposal` in `extension/src/host/controller.ts`, oggi intorno alle righe 697-703) non apre più la casella `showInputBox` e non aggiunge nessun feedback: rifiuta subito la Proposal, con gli stessi controlli di oggi (rifiutato, con la Proposal che resta Open, quando è allegata a un Drift aperto: il messaggio dice di decidere su quel Drift; rifiutato durante l'attesa della fine del turno dell'agente che l'ha consegnata).
- `trama proposal move <id> rejected` accetta ancora `{ feedback? }`: un feedback non vuoto (senza gli spazi attorno) diventa la sezione `## Feedback` di `proposal.md`; uno vuoto non aggiunge nulla.
- Il rifiuto per Rework with feedback usa la stessa operazione (`rejectProposal` in `src/core/proposals.ts`) e, nello stesso passo, scrive nel front matter `reworkRequested: true`. Il campo è assente nelle altre Proposal e non cambia approvazione, rifiuto né controlli. L'operazione core deve quindi poter ricevere questa marcatura, così che l'host (coperto da un altro Task, che apre la casella e manda l'istruzione all'agente) la chiami senza scrivere il file da sé. Se l'istruzione poi non parte davvero, la Proposal resta comunque rifiutata con il suo feedback.
- Stato Rejected: le Proposal che richiedono una Proposal rifiutata non sono rifiutate; restano bloccate dicendo che è stata rifiutata, finché, per un Rework, la Proposal nuova legata con `reworks` non sostituisce l'identità nei loro `requires`. Una risoluzione rifiutata lascia aperti i suoi Drift.
- I rifiuti attraverso un Drift restano come sono, senza `reworkRequested`: con `drift.CODE_FIX_CHOSEN` la Proposal allegata è rifiutata con il feedback che il Drift è stato risolto correggendo il codice (una Draft allegata è invece scartata, senza feedback); con `drift.RESOLVED_BY_PROPOSAL` è rifiutata con il feedback che il Drift è stato risolto da quella risoluzione approvata (una Draft allegata è scartata, senza feedback). In entrambi i casi le Proposal che la richiedono restano bloccate.

Codice coinvolto: `rejectProposal` in `src/core/proposals.ts`, il comando `move` in `src/cli/commands/proposal.ts`, il caso `rejectProposal` del controller dell'host.
