---
column: done
technical: false
refs:
  - task
  - requirements/rules#agent-launching
  - requirements/tech#task
drift: null
proposal: 8vuvkoxz
agent: false
created: 2026-10-24T08:14:11.029Z
finished: 2026-10-24T08:16:59.843Z
---
# Conflitti nella skill

La skill `trama-implement` (`skills/trama-implement/SKILL.md`, installata in `.agents/skills/`) dice all'agente principale e ai sotto-agenti cosa fare quando la prenotazione di un file ferma una scrittura, in ogni Run e non solo con Parallel Execution.

Quando è fatto:
- Step 1, "With sub-agents": il testo che l'agente principale dà a ogni sotto-agente dice che, se una sua scrittura è fermata dalla prenotazione di un file, si ferma subito, non annulla le sue modifiche, lascia il Task In progress e torna con ciò che ha fatto, il file e il sotto-agente che lo tiene. La frase di oggi "If two sub-agents change the same file, each changes only the parts of its own Task; the final check finds conflicts." è sostituita da questa regola.
- Step 5, o dove la skill tratta il ritorno di un sotto-agente: un sotto-agente tornato così libera il suo posto; l'agente principale affida quel Task a un nuovo sotto-agente quando il Task di chi tiene il file è Done, passandogli il resoconto, e intanto non lo considera finito né lo riprende da sé.
- Se l'agente principale stesso è fermato da una prenotazione, non scrive quel file finché il sotto-agente che lo tiene non ha finito.
- Sezione "Parallel execution", punto "Conflicts": la prenotazione che ferma una scrittura è un conflitto come quello che il sotto-agente vede da sé, e si registra allo stesso modo con `trama timing new` e `kind: conflict`, nominando il Task del sotto-agente fermato e il Task di chi tiene il file.
- Il testo resta in inglese come il resto della skill, e le skill installate nei progetti si rigenerano dalle sorgenti.
