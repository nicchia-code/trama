---
column: done
technical: false
refs:
  - task/Taken by the agent/developer.TAKE_BACK_TASK
  - requirements/rules#task
drift: lmk7whpj
proposal: null
agent: false
created: 2026-10-10T14:15:27.044Z
finished: 2026-10-10T17:38:50.024Z
---
# Fix code to match the Model: La ripresa di un Task è rifiutata quando il comando è eseguito dall’agente

## What happens

La riga di comando rifiuta di riprendere un Task quando viene eseguita dal terminale dell’agente o dalla chat di Cursor riconosciuta. Il rifiuto scatta prima di applicare la ripresa, anche quando il developer ha chiesto esplicitamente all’agente di eseguirla. Il Task resta preso e In progress: per liberarlo il developer deve usare un proprio terminale.

## What should happen

Riprendere il Task resta una decisione del developer, ma il comando deve poter eseguire quella decisione anche nell’ambiente dell’agente. La presenza di TRAMA_AGENT o CURSOR_AGENT non deve causare un rifiuto. L’agente è istruito a riprendere un Task soltanto su richiesta esplicita del developer; la ripresa elimina la presa e lascia il Task In progress, senza aggiungere azioni alla Board.

## Chosen option

**Consentire il comando e mantenere la decisione nelle istruzioni**

Permettere la ripresa dalla riga di comando anche quando la esegue l’agente. Il vincolo resta nelle istruzioni: l’agente agisce soltanto su richiesta esplicita del developer. Il Task diventa libero e resta In progress, come quando lo riprende il developer dal proprio terminale. È la correzione più circoscritta; le altre decisioni riservate al developer conservano le proprie regole.

## Where in the code

src/cli/commands.ts: task take-back dichiarato developerOnly; src/cli/main.ts: run e rifiuto dei comandi developerOnly; src/core/work.ts: takeBackTask.
