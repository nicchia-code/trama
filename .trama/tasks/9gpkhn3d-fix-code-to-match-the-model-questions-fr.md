---
column: done
technical: false
refs:
  - notice/Waiting
  - requirements/rules#notice
  - requirements/tech#agent-terminal
drift: 20dxiur2
proposal: null
agent: false
created: 2026-10-05T14:37:16.673Z
---
# Fix code to match the Model: Questions from the agent in an external terminal window never raise an away notice

## What happens

Con il launcher **external-terminal**, quando l'agente che Trama ha avviato in una finestra del terminale di sistema chiede un round di domande e il developer non risponde per dieci secondi, non parte nessun avviso ntfy. Il round non è riconosciuto come chiesto da un terminale di Trama, perché la finestra esterna non riceve l'indirizzo della finestra dell'editor. Per quella finestra parte solo l'avviso sulla fine del comando.

## What should happen

L'avviso nasce per un agente che Trama ha avviato **in un proprio terminale**, e il terminale dell'agente comprende la finestra esterna. Le domande dell'agente di una finestra esterna devono quindi far nascere l'avviso dopo dieci secondi senza risposta, come quelle del terminale integrato; i Requisiti tecnici chiedono di dare l'indirizzo della finestra a ogni terminale dell'agente di Trama.

## Chosen option

**Dare l'indirizzo della finestra anche alla finestra esterna**

La finestra esterna riceve, come il terminale integrato, l'indirizzo della finestra dell'editor che l'ha aperta. I round del suo agente arrivano a quella finestra, contano come chiesti da un terminale di Trama e fanno nascere l'avviso. Va aggiornato il Requisito tecnico dello script della finestra esterna, che oggi elenca solo contrassegno, identità e PATH.

## Where in the code

`extension/src/host/external-terminal.ts` (`externalScript`, senza l'indirizzo della finestra); `src/core/question-channel.ts` (round da terminale di Trama solo con l'indirizzo); `extension/src/host/question-notice.ts`.
