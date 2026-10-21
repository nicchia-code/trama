---
column: done
technical: false
refs:
  - task
  - requirements/rules#task
  - requirements/tech#task
  - requirements/data#task
drift: null
proposal: c9fp4trm
agent: false
created: 2026-10-21T05:42:19.328Z
finished: 2026-10-21T05:48:25.763Z
---
# Task bloccati in Active, niente Run automatici

Quando il Task è completato vale quanto segue.

Calcolo della Board (`extension/src/webview/board/logic.ts`): `Backlog` contiene le Proposal, le schede gialle di risoluzione e i Drift aperti non in una risoluzione consegnata, in un unico ordine di creazione; `Active` contiene ogni Task `todo` o `doing`, compresi quelli bloccati da Drift o in attesa di un Task di correzione, in ordine di creazione, senza schede di attesa e senza fantasmi; `System Activities` contiene solo i fantasmi degli annunci, nell'ordine di annuncio. Il numero della scheda è il numero di schede in Backlog (ogni risoluzione una volta, ogni Drift rosso una volta).

Nessun Run automatico: nelle skill (`skills/trama-implement`, `skills/trama-resolve-drifts`, `skills/trama-scan`), nei prompt dell'host (`extension/src/host/prompts.ts`) e nelle regole spariscono il titolo `Pre-flight before automatic fixes`, la scansione di fine corsa del Run automatico e la frase dell'esecuzione parallela per il Run automatico delle correzioni e delle origini; pre-flight, scansione di fine corsa ed esecuzione parallela restano per un Task chiesto per nome e per Run all. Un Task bloccato non si avvia: il suo `Run` resta disabilitato con il motivo `Blocked by Drift …` / `Waiting for Task …` finché il blocco dura.

`trama task list` con `runnable` continua ad accettare il filtro `tasks`, che serve al pre-flight di un Task chiesto per nome; nessun Run automatico lo usa più.

Il controllo submitWhileRunning conta solo i Run della propria finestra dell'editor: ogni finestra vede soltanto i propri lavori, senza conoscere quelli delle altre finestre.
