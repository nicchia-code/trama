---
column: done
technical: false
refs:
  - project/Trama project/developer.REWRITE_IDENTITIES
  - developer.REWRITE_IDENTITIES
  - requirements/rules#project
  - requirements/tech#project
  - requirements/tech#agent-terminal
drift: null
proposal: 5da64246
agent: false
created: 1970-01-01T00:00:00.184Z
---
# Riscrivere le identità ancora numerate dalla riga di comando

Il developer, dalla riga di comando, dà un'identità propria a ogni Proposal, Task e Drift ancora numerato. Non è un'approvazione, non sposta nessuna scheda e il pannello non offre un modo per farlo.

Fatto quando:
- `trama ids rewrite` non prende argomenti. Riscrive solo le schede ancora numerate. L'identità nuova è i primi otto caratteri esadecimali dello SHA-256, in UTF-8, di `<tipo>:<numero>`, con il tipo `proposal`, `task` o `drift` e il numero a quattro cifre (`task:0012`). La stessa scheda riceve la stessa identità su ogni copia che parte dallo stesso numero.
- `created` diventa l'istante UTC a quel numero di millisecondi dall'epoca, così l'ordine dei numeri resta e non conta l'ora del comando. Lo slug nel nome resta quello dopo il primo trattino. Lo stato di ciascuna scheda non cambia.
- I campi riscritti, quando il valore cita una scheda numerata che viene riscritta, sono `requires` di una Proposal, `proposal` e `drift` di un Task, `proposal`, `task` e `origin` di un Drift. Un riferimento che non cita una di queste schede resta com'è. Non si toccano i corpi, il codice, gli annunci, le richieste di design né i branch git.
- Il comando non scrive nulla, e dice perché, quando un giro di worktree è aperto (in corso, in unione, in conflitto, in riconciliazione o in attesa), quando due schede dello stesso tipo hanno lo stesso numero, o quando due identità nuove coincidono o un'identità nuova è già quella di un'altra scheda. I controlli precedono ogni scrittura. Se non c'è nessuna scheda numerata, non cambia nulla e lo dice.
- Non crea un commit e non richiede un albero pulito. Il pannello non ha un pulsante e non manda un messaggio per lanciarlo.
- L'agente non può lanciarlo: è rifiutato con `TRAMA_AGENT=1` e, per la stessa guardia, con `CURSOR_AGENT=1`. I messaggi restano in inglese. `docs/cli.md` lo descrive.
