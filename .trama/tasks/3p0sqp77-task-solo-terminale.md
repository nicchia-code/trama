---
column: done
technical: false
refs:
  - task
  - requirements/data#task
  - requirements/rules#task
  - requirements/rules#task/Taken by the agent
  - requirements/tech#task
drift: null
proposal: nr388hz3
agent: false
created: 2026-10-23T14:00:42.300Z
finished: 2026-10-23T14:05:06.043Z
---
# Task presi solo da terminali

Un Task preso dall'agente appartiene solo a un terminale dell'agente: il campo `agent` di un Task vale l'ID del terminale che l'ha preso (sotto-agenti compresi; una conversazione di omp Chat ha l'ID del terminale che sostituisce), `true` quando è stato preso senza un terminale riconosciuto, `false` altrimenti. I valori `cursor` e `cursor:<conversazione>` non sono più validi: leggere un Task che li ha è un errore di lettura, come per ogni campo non valido, finché il developer non corregge il file. Nessuna conversione o pulizia automatica dei file. Il valore legacy `editor`, già letto come Task senza chi lo tiene, resta gestito com'è.

L'agente è riconosciuto solo da `TRAMA_AGENT`: `CURSOR_AGENT` non conta più, quindi `task move <id> doing` lanciato senza `TRAMA_AGENT` su un Task preso è il developer che lo riprende, e uno spostamento dell'agente senza un `TRAMA_TERMINAL` riconosciuto prende il Task con `agent: true`, rilasciato da qualsiasi fine di un terminale dell'agente o di una conversazione di omp Chat. Sparisce ogni rilascio legato alla chat di Cursor: niente Task della conversazione, niente "chat del progetto", nessun rilascio a fine turno di una chat, nessuna eccezione per la revisione finale dell'Advisor della chat. Le Transizioni `agent.MOVE_TASK_TO_DOING` da To do, In progress e Done restano come il Modello le descrive, con il solo terminale come chi prende il Task; `agent.DECLARE_TASK_PROGRESS` è accettata solo dallo stesso terminale (sotto-agenti compresi) o da qualunque agente per un Task preso senza terminale riconosciuto.

Con l'Advisor Scanner attivo il revisore di ogni sotto-agente che realizza un Task è solo l'advisor di omp: sparisce la frase che una corsa nella chat di Cursor portava per il sotto-agente `trama-advisor`.

Il contatore dei Task finiti dall'ultimo scan globale torna a zero quando l'istruzione dello scan di tutto il Sistema è consegnata scritta nel terminale o inviata a omp Chat; non esistono più le consegne "lasciata pronta nella chat" o "copiata negli appunti" che lo azzeravano.

Codice da cambiare (indicazioni):
- `src/core/work.ts`: `agentField` rifiuta `cursor` e `cursor:*` con un errore di lettura; `holderOf` usa solo `origin.terminal`; `releaseTasks` perde `chatHolder`; commenti di `holder` aggiornati.
- `src/cli/main.ts`: `agentVariable` riconosce solo `TRAMA_AGENT` (via l'import di `CURSOR_AGENT_ENV`); `src/cli/context.ts`: commenti di `byAgent` e `origin` senza la chat di Cursor; `src/cli/commands/task.ts` (spostamento in doing, ~:163) senza riferimenti a `cursor`.
- La frase per la chat (`ADVISOR_CHAT_SENTENCE`, `src/core/advisors.ts`) sparisce come descritto nel Task sul Drift dell'advisor; qui basta che le istruzioni di un Run con l'Advisor Scanner usino solo `ADVISOR_SENTENCE`.
- `extension/src/host/controller.ts` (`writeLastScan`, ~:56): il ricordo dello scan è scritto solo per le due consegne rimaste; nessun ramo per chat di Cursor o appunti.

Test: eliminare quelli su holder `cursor`/`cursor:<conv>`, `CURSOR_AGENT`, rilascio della chat del progetto e frase dell'Advisor della chat; aggiungerne uno che verifica che `agent: cursor` e `agent: cursor:abc` danno un errore di lettura e uno che `CURSOR_AGENT=1` senza `TRAMA_AGENT` è il developer.
