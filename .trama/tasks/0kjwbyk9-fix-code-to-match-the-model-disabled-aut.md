---
column: done
technical: false
refs:
  - drift-resolution/Free
  - requirements/data#drift-resolution
  - requirements/rules#drift-resolution
  - requirements/rules#task
drift: z24d9fq7
proposal: null
agent: false
created: 2026-10-11T10:28:26.313Z
finished: 2026-10-11T10:32:06.204Z
---
# Fix code to match the Model: Disabled autopilot still shares jobs and send reservations across editor windows

## What happens

Anche con la delega `disabled` Trama tiene un quadro unico dei lavori del progetto fra tutte le finestre dell'editor. Un Run, una risoluzione o uno scan lanciati in un'altra finestra rendono indisponibili qui Resolve Drifts e i pulsanti Run. Ogni invio di un'istruzione prenota il turno presso il coordinatore del progetto, quindi due invii ravvicinati da finestre diverse vengono rifiutati con l'avviso che un'altra istruzione è in corso. Ogni finestra, a ogni controllo, dimentica anche i lavori delle finestre perse, in ogni modalità.

## What should happen

Con `disabled` i lavori mantengono lo stato **per finestra**: ogni finestra conosce soltanto i propri Run, scan e risoluzioni, e perimetro e disponibilità dei comandi restano quelli precedenti all'autopilota. Le altre finestre del progetto entrano nel quadro solo con l'autopilota attivo, e il passaggio da `disabled` a una modalità attiva importa i lavori ancora in corso delle altre finestre prima di rivalutare la barriera.

## Chosen option

**Ignore other windows while disabled**

Con `disabled` contano solo i lavori della finestra e non si prenota alcun invio; il coordinamento fra finestre parte con l'attivazione, che già importa i lavori in corso. Ripristina il comportamento precedente. Costo: in `disabled` due finestre possono lanciare lavori che si sovrappongono, come prima.

## Where in the code

extension/src/host/drift-resolution.ts (driftResolution, receiveCoordinatorMessage); extension/src/host/agent.ts (launchAgent, prenotazione dell'invio); extension/src/host/questions.ts; extension/src/host/controller.ts (coordinate, forgetLostWindows)
