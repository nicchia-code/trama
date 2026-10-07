---
column: done
technical: false
refs:
  - agent-terminal
  - agent-terminal/No agent terminal/proposal.APPROVED
  - agent-terminal/Agent running/proposal.APPROVED
  - agent-terminal/Agent idle/proposal.APPROVED
  - agent-launching
  - workspace
  - requirements/rules#agent-terminal
  - requirements/tech#General
drift: null
proposal: g0kh74u5
agent: false
created: 2026-10-07T05:28:51.708Z
finished: 2026-10-07T05:54:30.035Z
---
# Togliere dall'estensione i terminali dei worktree, l'unione del giro e trama.worktreeAgent

Dopo un'approvazione l'estensione fa una sola cosa: la scansione automatica nel terminale dell'agente della cartella aperta, alle condizioni di `rules#agent-terminal`. Quando è fatto:

- Non si apre più nessun terminale `Trama agent` in un worktree, né per la scansione, né per i Task, né per la riconciliazione; non esistono più le istruzioni che dicono di non scansionare il System perché ci pensa l'unione.
- L'estensione non segue più worktree spariti, non prova l'unione quando i Task del giro sono in Done e non la applica quando la cartella torna pronta.
- `trama.worktreeAgent` non è più dichiarata nelle impostazioni e l'estensione non la scrive all'avvio; un valore già nelle impostazioni utente resta lì e non è letto.
- Avvisi e messaggi dell'estensione non nominano più worktree o multi-branch.
