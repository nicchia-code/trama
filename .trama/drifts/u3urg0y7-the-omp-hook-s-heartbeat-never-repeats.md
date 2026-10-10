---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#agent-hook
  - time.QUIET_PERIOD_ELAPSED
proposal: null
task: tjw8jhh1
origin: null
option: 1
note: null
resolvedBy: l3o73qn6
created: 2026-10-09T23:44:58.567Z
---
# The omp hook's heartbeat never repeats

## What happens

All'inizio di ogni sessione il modulo di omp manda **un solo** segnale di vita, poi si interrompe con un errore: chiede il timer periodico all'oggetto dell'hook, che non lo offre (omp lo dà solo al contesto del gestore). Il battito ogni 5 minuti quindi **non parte mai**.

Conseguenza: un agente omp che pensa a lungo o esegue un solo comando lungo (test, build) per più di quindici minuti è dato per fermo dalla quiete: i suoi annunci sono ritirati con l'avviso, i Task presi tornano in To do e il Run finisce mentre l'agente lavora ancora.

## What should happen

Il Requisito `tech#agent-hook` dice che a ogni avvio dell'agente il modulo manda subito il segnale di vita e poi lo **ripete ogni 5 minuti** con il timer del contesto (`ctx.setInterval`), fermandolo a fine turno con `ctx.clearTimer`. Il battito tiene vivi annunci, Task presi e Run del solo terminale segnato, anche durante uno strumento lungo, così la quiete scatta solo per un agente davvero interrotto, bloccato o ucciso.

## Fix options

### Usare il timer del contesto

Il modulo prende il timer periodico e la sua cancellazione dal contesto che omp passa a ogni gestore, come dice il Requisito. Il battito riparte ogni 5 minuti e omp lo ferma anche da sé alla chiusura della sessione. Costo: poche righe e un test con un contesto finto che controlli il battito ripetuto.

### Usare un timer proprio del modulo

Il modulo usa il timer del runtime, con la propria cattura degli errori e la propria pulizia a fine turno e alla chiusura. Funziona anche su un omp senza timer nel contesto, ma devia dal Requisito e un errore non catturato può far cadere la sessione di omp; servirebbe anche una Proposal sul Requisito.

## Where in the code

extension/src/omp/trama-hook.ts (tramaHook, startHeartbeat e stopHeartbeat)
