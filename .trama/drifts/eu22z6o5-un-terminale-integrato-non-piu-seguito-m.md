---
status: resolved
resolution: fix-code
refs:
  - agent-terminal/Agent running/terminal.COMMAND_ENDED
  - agent-terminal/Agent running/developer.ASK_AGENT
  - requirements/rules#agent-terminal
proposal: null
task: j80cfu1m
origin: null
option: 1
note: null
created: 2026-10-06T18:17:22.195Z
---
# Un terminale integrato non più seguito manda l'avviso di fine comando

## What happens

Quando il developer manda una nuova istruzione mentre l'agente lavora ancora nel terminale integrato, Trama apre un terminale nuovo e smette di seguire il vecchio. Ma quando il comando dell'agente nel **vecchio terminale** finisce, Trama fa comunque nascere un **avviso di fine comando** (se c'è un argomento ntfy), anche se l'agente del terminale nuovo sta ancora lavorando.

Con la finestra esterna invece la fine di una corsa sostituita non manda nessun avviso.

## What should happen

Il terminale vecchio non è più seguito: la sua fine non è il `terminal.COMMAND_ENDED` di questa Machine, e solo quella transizione (*Agent running* → *Agent idle*) fa nascere l'avviso di fine comando.

Il Requisito `rules` lo dice per la finestra esterna sostituita: la sua fine **non manda avvisi** e non cambia lo stato dell'agente, ma rilascia i Task presi e ritira gli annunci, *come la fine del comando di un terminale integrato vecchio*.

## Fix options

### Niente avviso dal terminale vecchio

La fine del comando in un terminale integrato non più seguito rilascia ancora i Task che aveva preso e ritira i suoi annunci, ma non fa nascere l'avviso di fine comando. Il terminale integrato si comporta come la finestra esterna sostituita. Costo: una piccola modifica nel punto in cui si gestisce la fine del comando.

### Avviso anche dalla finestra esterna sostituita

Si decide che ogni agente che si ferma merita un avviso: il Model e il Requisito `rules` vengono cambiati con una Proposal perché anche la finestra esterna sostituita mandi l'avviso. Costo: una Proposal e una modifica al codice delle finestre esterne; il developer può ricevere un avviso mentre un altro agente lavora ancora.

## Where in the code

extension/src/host/agent.ts, `watchAgentTerminal` (gestione di `onDidEndTerminalShellExecution` per i terminali che non sono più `lastTerminal`)
