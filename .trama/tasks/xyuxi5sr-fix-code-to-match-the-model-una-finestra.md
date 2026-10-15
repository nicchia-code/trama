---
column: done
technical: false
refs:
  - drift-resolution
  - requirements/quality#drift-resolution
drift: 50amblox
proposal: null
agent: false
created: 2026-10-14T12:26:20.167Z
finished: 2026-10-14T12:30:32.709Z
---
# Fix code to match the Model: Una finestra chiusa durante un Run automatico lascia i Task non finiti senza motivo

## What happens

Se l'editor che sta eseguendo un Run automatico sparisce, la raccolta si chiude come se il Run fosse finito normalmente: i Task autorizzati ma non finiti restano nella loro colonna, senza badge di fallimento e senza alcun motivo visibile.

## What should happen

La perdita dell'editor non è un successo e deve lasciare un motivo visibile per ciò che richiede intervento: i Task del Run non finiti devono mostrare perché l'automatismo si è fermato, come già accade quando il terminale dell'agente si chiude durante il Run.

## Chosen option

**Segnare i Task non finiti come falliti per la finestra persa**

Quando la finestra che eseguiva il Run sparisce, ogni Task autorizzato non ancora finito riceve il badge "autopilot failed" con il motivo che la finestra è stata persa, come per un terminale chiuso. Non viene riprovato: il developer li riprende a mano o con una richiesta esplicita. Costo: l'elenco dei fallimenti cresce anche per una chiusura accidentale dell'editor.

## Where in the code

extension/src/host/controller.ts: forgetLostWindows and advanceCollection; extension/src/host/drift-resolution.ts: forgetWindow removes a lost window's jobs without an abnormal end, so no reason is recorded.
