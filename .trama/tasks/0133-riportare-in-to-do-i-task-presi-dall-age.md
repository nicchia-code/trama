---
column: done
technical: false
refs:
  - task/Taken by the agent/terminal.COMMAND_ENDED
  - agent-terminal
  - requirements/rules#task
drift: null
proposal: "0029"
agent: false
---
# Riportare in To do i Task presi dall'agente quando il suo comando termina

Quando il comando in esecuzione nel terminale dell'agente termina, ogni Task che porta il segno di preso dall'agente viene rilasciato e torna in To do, invece di restare In progress, così può essere eseguito di nuovo senza che il developer debba fare nulla dalla GUI. Se il terminale non può riferire che un comando è terminato, i Task restano presi e solo `task take-back` li libera. Un Task non preso resta dove si trova.
