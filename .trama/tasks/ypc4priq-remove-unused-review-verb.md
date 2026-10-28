---
column: done
technical: true
refs: []
drift: null
proposal: null
agent: false
created: 2026-10-27T07:15:34.034Z
finished: 2026-10-27T07:21:09.824Z
---
# Remove unused review verb

In `src/cli/registry.ts` il commento e la costante `VERBS` contano ancora il verbo `review`, legato ad `advisor`. `advisor review` non esiste più (`requirements/cli#General`): ogni comando sconosciuto esce con 2. Nessun comando registrato usa `review`.

Da fare: togliere `review` da `VERBS` e aggiornare il commento di quella riga, così che dica solo i verbi che restano. Non cambiare il comportamento degli altri oggetti.

Verifica: `trama advisor review` resta un comando sconosciuto con uscita 2, e `trama --help` non cambia.
