---
column: done
technical: false
refs:
  - agent.CHECK_TASK
  - requirements/rules#agent.CHECK_TASK
  - requirements/tech#agent.CHECK_TASK
  - requirements/cli#General
drift: null
proposal: u4osxzox
agent: false
created: 2026-10-21T15:20:49.406Z
finished: 2026-10-21T15:25:18.892Z
---
# Comando task check

L'agente chiede della salute di chi tiene un Task con `trama task check <id>` (l'Event `agent.CHECK_TASK`). Il comando legge il Task: se non è preso dall'agente risponde che non è preso, se è preso con `agent: true` o `cursor` che il titolare non è noto, in entrambi i casi senza contattare l'editor e senza cambiare nulla. Altrimenti manda a una finestra aperta del progetto, trovata come `trama question new`, il messaggio `check-task` e aspetta fino a 5 secondi: la finestra fa subito per quel Task il controllo di esecuzione di `rules#time` e risponde vivo, con chi lo tiene, oppure liberato, con il motivo, dopo aver rimesso il Task in To do con l'avviso sulla sua Board. Senza editor raggiungibile o senza risposta in tempo risponde che non può verificare e non cambia nulla. Un Task che non esiste è un errore come in `task show`.

L'uscita è una riga in Markdown con l'esito, o con `--json` `{ task, result, holder?, reason? }` con `result` fra `alive`, `released`, `not-taken`, `unknown-holder` e `unavailable`; esce con 0 per ogni esito. Il comando non prende il Task, non lo sposta, non scrive file da sé, non conta come attività dell'agente e non è fra le righe che registrano il lavoro negli hook della chat; lo può lanciare chiunque.

La skill distribuita `trama-implement`, prima di chiudere una corsa, quando `trama task list` con `runnable` dice che non resta nessun Task eseguibile, lancia `trama task check` su ogni Task In progress del suo ambito che né l'agente principale né i suoi sotto-agenti hanno preso; se almeno uno torna in To do chiede di nuovo i Task eseguibili e continua, altrimenti chiude la corsa e il resoconto elenca i Task presi da altri ancora vivi. Il Run di un Task singolo non lo fa. `docs/cli.md` descrive il comando e `trama hook start`.
