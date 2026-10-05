---
status: resolved
resolution: fix-code
refs:
  - notice/Waiting
  - requirements/rules#notice
  - requirements/tech#agent-terminal
proposal: null
task: 9gpkhn3d
origin: null
option: 1
note: null
created: 2026-10-05T14:31:37.725Z
---
# Questions from the agent in an external terminal window never raise an away notice

## What happens

Con il launcher **external-terminal**, quando l'agente che Trama ha avviato in una finestra del terminale di sistema chiede un round di domande e il developer non risponde per dieci secondi, non parte nessun avviso ntfy. Il round non è riconosciuto come chiesto da un terminale di Trama, perché la finestra esterna non riceve l'indirizzo della finestra dell'editor. Per quella finestra parte solo l'avviso sulla fine del comando.

## What should happen

L'avviso nasce per un agente che Trama ha avviato **in un proprio terminale**, e il terminale dell'agente comprende la finestra esterna. Le domande dell'agente di una finestra esterna devono quindi far nascere l'avviso dopo dieci secondi senza risposta, come quelle del terminale integrato; i Requisiti tecnici chiedono di dare l'indirizzo della finestra a ogni terminale dell'agente di Trama.

## Fix options

### Dare l'indirizzo della finestra anche alla finestra esterna

La finestra esterna riceve, come il terminale integrato, l'indirizzo della finestra dell'editor che l'ha aperta. I round del suo agente arrivano a quella finestra, contano come chiesti da un terminale di Trama e fanno nascere l'avviso. Va aggiornato il Requisito tecnico dello script della finestra esterna, che oggi elenca solo contrassegno, identità e PATH.

### Riconoscere la finestra esterna dalla sua identità

Il round dell'agente di una finestra esterna conta come chiesto da un terminale di Trama perché porta l'identità di terminale che Trama le dà, senza passare l'indirizzo: continua ad arrivare alla finestra trovata per scoperta. Va cambiata la regola che definisce il terminale di Trama come quello che riceve l'indirizzo.

### Escludere le domande della finestra esterna nel Modello

Si cambia il Modello: con la finestra esterna nasce solo l'avviso sulla fine del comando. La descrizione della Feature e quella dell'impostazione ntfy lo dicono. Nessun cambio al codice, ma il developer lontano non sa che l'agente lo sta aspettando.

## Where in the code

`extension/src/host/external-terminal.ts` (`externalScript`, senza l'indirizzo della finestra); `src/core/question-channel.ts` (round da terminale di Trama solo con l'indirizzo); `extension/src/host/question-notice.ts`.
