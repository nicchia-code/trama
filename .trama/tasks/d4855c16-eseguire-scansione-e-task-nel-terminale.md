---
column: done
technical: false
refs:
  - worktree-round/In progress/terminal.COMMAND_ENDED
  - agent-terminal
  - task/Taken by the agent/terminal.COMMAND_ENDED
  - requirements/rules#worktree-round
  - requirements/rules#agent-terminal
  - requirements/tech#worktree-round
drift: null
proposal: b4ce3d0d
agent: false
created: 1970-01-01T00:00:00.171Z
---
# Eseguire scansione e Task nel terminale del worktree

Il terminale di un worktree non è il terminale dell'agente della cartella aperta. Lì l'agente fa prima la scansione della Proposal e, se nascono Task, la loro esecuzione.

Fatto quando:
- Il terminale nasce nella cartella del worktree, si chiama «Trama agent», ha `TRAMA_AGENT=1` ed esegue `trama.worktreeAgent`. Non usa la chat.
- La prima istruzione è la scansione delle Feature toccate, con la frase che lega i Task a quella Proposal e, se una lingua è impostata, la frase della lingua sulla stessa riga.
- Quando quel comando finisce e sono nati dei Task, ma qualche Task di una Proposal ancora nel giro non è in Done, Trama manda nello stesso terminale l'esecuzione dei Task di quella Proposal. Finché il giro non è tutto in Done non si unisce nulla.
- Questo terminale non si riusa per la cartella aperta. La sua fine non muove il terminale ordinario e non rilascia i Task presi lì.
- La fine del comando che Trama ha scritto in quel terminale fa nascere lo stesso avviso di fine comando del terminale ordinario, se l'argomento ntfy è impostato.
- La fine di quel comando rilascia solo i Task presi in quel worktree.
