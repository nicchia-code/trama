---
column: done
technical: false
refs:
  - drift-resolution/Free/developer.ASK_AGENT
  - drift-resolution/Running tasks
  - drift-resolution/Resolving
  - requirements/rules#drift-resolution
drift: bvsk5sks
proposal: null
agent: false
created: 2026-10-10T17:54:07.235Z
finished: 2026-10-10T18:13:07.387Z
---
# Fix code to match the Model: A terminal launch bypasses a pending chat launch's exclusion

## What happens

Se un invio automatico alla chat è ancora in attesa di tornare, il developer può cambiare agente e lanciare nel terminale il lavoro incompatibile. Il primo invio non è ancora contato tra i lavori in corso e il secondo non aspetta la sua conclusione: **un Run e Resolve Drifts possono partire insieme**. Alla risposta della chat vengono seguiti entrambi. Lo stesso problema vale invertendo Run e risoluzione. Non è la perdita di un evento di fine chat già coperta dal Drift w1955qcf.

## What should happen

**Run e Resolve Drifts non devono mai lavorare insieme**, anche passando dalla chat al terminale durante un invio. Ogni consegna deve controllare le condizioni rispetto agli altri invii della stessa finestra prima di mandare l’istruzione. Un lavoro diventa in corso soltanto se l’istruzione parte davvero; appunti, conferma manuale e invio annullato non devono lasciare un blocco permanente. I Run possono continuare a coesistere tra loro e scansioni, design e import restano indipendenti.

## Chosen option

**Order actual deliveries across both destinations**

Far rispettare lo stesso ordine alle consegne verso chat e terminale: il secondo invio controlla le condizioni solo dopo che il primo ha chiarito se l’istruzione è partita ed è stato registrato. Se è incompatibile, non invia nulla e spiega il motivo. È la correzione raccomandata: non cambia gli State né introduce scadenze, ma un invio deve aspettare una consegna precedente ancora pendente.

## Where in the code

extension/src/host/agent.ts: launchAgent, inSendTurn e openChat; extension/src/host/controller.ts: launchAction e refusal; extension/src/host/drift-resolution.ts: startJob e driftResolution
