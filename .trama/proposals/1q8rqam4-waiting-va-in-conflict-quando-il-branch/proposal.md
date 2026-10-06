---
status: approved
base:
  agent-launching/worktree-round.md: 032256ac412c02466419d1685d264e062418db4ed267ed8abe49e995ba4c78fa
delete: []
created: 2026-10-06T13:35:40.317Z
scanScope:
  - ref: worktree-round/Waiting/workspace.TREE_READY
    reason: changed
---
# Waiting va in Conflict quando il branch è andato avanti sulle stesse righe

Il Drift agz47cox è stato deciso con l'opzione «Aggiungere Waiting → Conflict al Modello», ma il Modello non ha ancora quella Transizione, quindi il codice non può seguirla. Oggi, se mentre il giro aspetta il branch di partenza va avanti sulle stesse righe dell'unione, il giro resta in Waiting senza avvisare e ogni controllo ripete il tentativo.

Scelte fatte senza intervista, da verificare:
- Nessun evento nuovo: la cartella pronta (`workspace.TREE_READY`) ha due esiti, come `MERGE_CLEAN` da Merging; la Transizione nuova va in Conflict quando il branch avanzato non si combina con l'unione.
- Nel Conflict nasce lo stesso Merge Drift di un conflitto fra Proposal, con le stesse due opzioni e l'abbandono; i marcatori restano solo nel worktree di merge, la cartella aperta non cambia.
- Dopo la riconciliazione il giro segue la strada di sempre (Reconciling → Merging), senza Transizioni nuove.
- La Transizione esistente verso No round dice ora che vale quando il branch, se è andato avanti, si combina senza conflitti.
