---
status: approved
base:
  agent-launching/worktree-round.md: 47e1c74585af7fb8d1de5b10553116ff49ab4571d119dc1d31ecb5098fcc8b35
delete: []
created: 2026-10-06T16:42:57.942Z
scanScope:
  - ref: worktree-round/Reconciling/terminal.COMMAND_ENDED
    reason: changed
---
# Reconciling torna in Conflict se restano marcatori di conflitto

Il codice, alla fine del comando dell'agente di riconciliazione, controlla se nel worktree di merge restano marcatori di conflitto anche con il Task di riconciliazione in Done. Se ci sono, non committa e non riprova l'unione: toglie il Task di riconciliazione, riscrive il Merge Drift e avvisa che il giro ha conflitti, cioè torna in Conflict. Il Model non prevede questa uscita da Reconciling.

Scelte fatte senza intervista, da verificare:
- La Transizione verso Merging vale solo se il Task è in Done e non restano marcatori di conflitto.
- Una nuova Transizione terminal.COMMAND_ENDED → Conflict copre il Task in Done con marcatori rimasti: nulla si committa, l'unione non si riprova, il Task di riconciliazione sparisce, il Merge Drift torna da decidere e il developer è avvisato.
- Nessun Requisito nuovo: il requisito di qualità che vieta i marcatori nella cartella aperta già motiva il controllo.
