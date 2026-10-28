---
column: done
technical: false
refs:
  - task/Taken by the agent
  - requirements/rules#agent.CHECK_TASK
drift: null
proposal: null
agent: false
created: 2026-10-27T07:14:42.547Z
finished: 2026-10-27T07:22:46.790Z
---
# Esito del controllo senza titolare noto

Quando si chiede con `trama task check` la salute di chi tiene un Task preso dall'agente, l'esito deve distinguere tre casi. Un Task che l'agente non ha preso (in To do, Done, o In progress tenuto dal developer) riceve `not-taken` senza contattare l'editor e senza cambiare nulla. Un Task preso dall'agente senza un titolare noto riceve `unknown-holder`, senza contattare la finestra e senza cambiare nulla; lo stesso esito deve valere anche quando la finestra stessa non riconosce il titolare. Un Task con titolare noto segue il controllo di esecuzione come descritto nel Requisito, con gli esiti `alive`, `released` o `unavailable`. Il risultato deve comparire sia in Markdown sia con `--json`, con il campo `result` pari a `unknown-holder` nel caso indicato, e il comando esce con 0 per ogni esito.
