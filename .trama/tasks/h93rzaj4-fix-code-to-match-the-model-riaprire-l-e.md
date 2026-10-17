---
column: done
technical: false
refs:
  - agent-launching
drift: ese20q1h
proposal: null
agent: false
created: 2026-10-17T12:11:32.264Z
finished: 2026-10-17T12:40:14.736Z
---
# Fix code to match the Model: Riaprire l'editor non libera i Task che un agente morto aveva preso

## What happens

All'avvio dell'editor Trama ritira solo gli annunci rimasti su disco. I Task che un agente aveva preso restano presi, con il loro holder di un terminale o di una chat che non esiste più: la liberazione avviene solo alla fine del turno o alla chiusura del terminale o della conversazione, mentre il terminale o la chat di prima non vengono più seguiti dopo il riavvio.

## What should happen

La Feature agent-launching dice che un agente che muore senza dirlo lascia ciò che aveva annunciato e preso finché il developer non chiude il terminale o la conversazione, o riapre l'editor.

## Chosen option

**Liberare i Task presi all'avvio**

All'avvio dell'editor, insieme al ritiro degli annunci, riportare in To do i Task presi da un agente che non è più seguito, come fa releaseTasks alla fine del turno.

## Where in the code

extension/src/host/announcements.ts, watchAnnouncements (righe 118-123): all'avvio ritira solo gli annunci con withdrawAll; releaseTasks in extension/src/host/agent.ts (righe 109-111) è chiamata solo alla fine del turno o alla chiusura del terminale
