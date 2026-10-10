---
column: done
technical: false
refs:
  - task/Taken by the agent/terminal.CLOSED
  - requirements/rules#task
  - requirements/rules#agent-terminal
drift: blsyyq0k
proposal: null
agent: false
created: 2026-10-10T14:15:26.769Z
finished: 2026-10-10T17:32:52.073Z
---
# Fix code to match the Model: La chiusura del terminale senza hook lascia i Task presi in In progress

## What happens

Quando viene chiuso un terminale integrato aperto da Trama, i suoi Task presi tornano in To do soltanto se il terminale è seguito da un hook. Per un terminale senza hook la chiusura non rilascia né i Task che appartengono a quel terminale né quelli presi senza origine riconosciuta. Se non è già arrivata una fine del comando riconoscibile, questi Task restano In progress e segnati come presi anche se il terminale è chiuso e nessun agente può più lavorarvi.

## What should happen

terminal.CLOSED deve rilasciare subito i Task presi da quel terminale e riportarli in To do, indipendentemente dalla disponibilità di un hook o della shell integration e da chi chiude il terminale. Deve rilasciare anche i Task senza origine riconosciuta. I Task presi da altri terminali o dalla chat non devono cambiare. Se hook o fine comando hanno già rilasciato il Task, la chiusura non deve ripetere alcuna azione visibile.

## Chosen option

**Rilasciare alla chiusura di ogni terminale seguito**

Applicare il rilascio a tutti i terminali dell’agente riconosciuti da Trama, senza richiedere che il loro hook sia attivo. Tornano in To do soltanto i Task di quel terminale e quelli senza origine riconosciuta; quelli degli altri agenti restano presi. È la correzione più diretta e funziona anche quando la shell integration non ha riferito la fine del comando.

## Where in the code

extension/src/host/agent.ts: watchAgentTerminal, gestione onDidCloseTerminal con rilascio condizionato a isHooked; src/core/work.ts: releaseTasks; test/host-agent-terminals.test.ts: chiusura verificata soltanto per un terminale seguito con hook.
