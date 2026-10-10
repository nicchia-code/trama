---
column: done
technical: false
refs:
  - requirements/tech#agent-hook
  - agent-hook
drift: 9ubgofq8
proposal: null
agent: false
created: 2026-10-10T07:51:07.315Z
finished: 2026-10-10T07:54:15.419Z
---
# Fix code to match the Model: An omp run without the hook module is still followed as hooked

## What happens

Quando l'agente scelto è omp, la corsa è **sempre** segnata come corsa con hook, anche se il pacchetto dell'estensione non contiene il modulo dell'hook e il comando scritto nel terminale quindi non lo carica.

Senza hook nessuno dirà mai che l'agente è a riposo: la fine del comando rilascia i Task e ritira gli annunci, ma **non finisce il Run** né Resolve Drifts, che restano in corso fino ai quindici minuti di quiete. Nel frattempo Run all To do, Run this design, i Run dei Task e Resolve Drifts restano disabilitati.

## What should happen

Il Requisito `tech#agent-hook` dice che, se il file del modulo non c'è, il comando è quello di prima e **la corsa non ha hook**. L'Actor `agent-hook` riguarda solo i terminali in cui l'hook è caricato; gli altri agenti sono seguiti dalla fine del loro comando, dalla chiusura del terminale e dalla quiete, quindi la fine del comando finisce anche il Run.

## Chosen option

**Segnare l'hook solo quando il modulo c'è**

La corsa è segnata con hook solo se il comando carica davvero il modulo; senza modulo omp è seguito come ogni altro agente e la fine del comando finisce il Run. Costo: una condizione e un test con il pacchetto senza modulo.

## Where in the code

extension/src/host/agent.ts (terminalRun, campo hooked); extension/src/host/cursor.ts (bundledOmpHook)
