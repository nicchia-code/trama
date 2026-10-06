---
status: approved
base:
  model-changes/proposal.md: 0f74dee81386e6d392e0b3317e156edbcc895d5264a6319c5e3bcaa0f5e7987d
delete: []
created: 2026-10-06T13:53:15.251Z
scanScope:
  - ref: proposal/In worktree
    reason: changed
  - ref: proposal/Open/developer.APPROVE_PROPOSAL
    reason: leads into a change
---
# Worktree sparito dopo l'inizio dell'unione: la Proposal resta nel giro

Il codice, una volta che il giro ha cominciato a unire, non riporta tra quelle da decidere una Proposal il cui worktree sparisce: se il suo branch è già nell'unione, la approva quando l'unione arriva nella cartella aperta, insieme alle altre. Il Modello invece fa tornare aperta ogni Proposal il cui worktree sparisce, in qualunque momento del giro, e non dice che cosa succede al suo lavoro già unito.

Scelte:
- Una Proposal il cui branch è già nell'unione resta In worktree anche se la cartella del suo worktree sparisce: non torna da decidere e non si accetta né si rifiuta.
- workspace.WORKTREE_LOST la riporta aperta, con l'avviso, solo se il suo branch non è ancora nell'unione (prima che il giro cominci a unire, o durante un conflitto se il suo branch non è stato ancora unito).
- worktree-round.MERGED approva ogni Proposal il cui branch è nel risultato unito, anche quella il cui worktree è sparito.
- Nessun Requisito cambia.
