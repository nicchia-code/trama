---
status: approved
base:
  agent-launching/agent-terminal.md: 8fd92fe5c6b7ed27e4f74a4b24068241cfeaef67fb1d0a87901fbdde3d10055e
delete: []
created: 2026-10-06T14:34:07.205Z
scanScope:
  - ref: agent-terminal/No agent terminal/worktree-round.MERGED
    reason: changed
  - ref: agent-terminal/Agent running/worktree-round.MERGED
    reason: changed
  - ref: agent-terminal/Agent idle/worktree-round.MERGED
    reason: changed
---
# Far partire la scansione dopo l'unione di un giro nel terminale dell'agente

Il codice, dopo che un giro di worktree si è unito alla cartella aperta, manda la scansione delle Feature toccate al launcher abituale; con un launcher del terminale apre o riusa il terminale dell'agente chiamato Scan. Il Requisito di worktree-round e l'Event worktree-round.MERGED lo dicono già, ma il Diagram di agent-terminal non ha la Transition che lo esegue.

Scelte fatte senza intervista, da controllare:
- La Machine agent-terminal reagisce a worktree-round.MERGED da ciascuno dei tre State verso Agent running.
- Condizioni: solo con un launcher del terminale, solo se l'unione tocca almeno una Feature; una sola scansione dell'unione delle Feature, che non nomina nessuna Proposal.
- Il terminale si apre o si riusa con le stesse regole di developer.ASK_AGENT (nome Scan); da Agent running se ne apre uno nuovo.
- Se il comando dell'agente non è configurato viene chiesto una volta, come per developer.ASK_AGENT: è quello che fa il codice oggi.
- Le frasi «An approval that lands from a worktree round does not start it» restano: l'approvazione delle singole Proposal non avvia nulla, la scansione parte da MERGED.
