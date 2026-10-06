---
status: resolved
resolution: fix-code
refs:
  - agent-terminal/Agent idle/developer.ASK_AGENT
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
proposal: null
task: 9wfsbu77
origin: null
option: 1
note: null
created: 2026-10-06T18:51:03.941Z
---
# Il riuso ignora la scelta tra area e scheda del terminale

## What happens

Dopo che una corsa nel terminale integrato finisce, cambiare il launcher non determina sempre dove parte la successiva istruzione. Se il nome del lavoro resta uguale, scegliere terminal-tab riusa il terminale nell’area invece di aprire una scheda. Nel verso opposto, passare da una scheda libera ad auto in un editor diverso da Cursor riusa la scheda: il lavoro non torna nell’area dei terminali. Entrambi gli scenari sono riproducibili con due scansioni consecutive, terminando la prima prima del cambio di impostazione.

## What should happen

La scelta esplicita del launcher deve vincere sempre: terminal-tab esegue l’agente nel terminale aperto come scheda dell’editor, mentre terminal lo esegue nell’area dei terminali. Auto negli editor diversi da Cursor sceglie sempre l’area, mai la scheda. Il riuso di un terminale libero non deve annullare questa scelta: la nuova istruzione deve partire nella collocazione richiesta e il vecchio terminale può restare aperto, non più seguito, quando non corrisponde al launcher selezionato.

## Fix options

### Riusare solo la collocazione selezionata

Quando il terminale libero è nella collocazione richiesta dal launcher attuale, riusarlo come oggi. Quando è nell’area e serve una scheda, o viceversa, aprire un nuovo terminale nella collocazione scelta e lasciare quello precedente aperto senza seguirlo. Preserva la scelta del developer e le regole attuali sul nome e sul focus, al costo di un terminale aggiuntivo soltanto quando cambia collocazione.

### Spostare il terminale libero prima del riuso

Prima di inviare la nuova istruzione, trasferire il terminale libero dall’area alla scheda o dalla scheda all’area secondo il launcher attuale. Riusare soltanto dopo uno spostamento riuscito; se l’editor non lo permette, aprire il terminale richiesto. Riduce le finestre residue, ma richiede gestione delle azioni dell’editor, del gruppo della scheda e del focus per non interrompere il developer.

## Where in the code

extension/src/host/agent.ts: launchAgent, condizioni reusable e asTab
