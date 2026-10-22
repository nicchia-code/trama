---
column: done
technical: false
refs:
  - drift-resolution
  - drift-resolution/Free/developer.REWORK_DRIFT
  - drift-resolution/Free/developer.REWORK_PROPOSAL
  - drift-resolution/Running tasks
  - drift-resolution/Resolving
  - drift-resolution/Free/developer.ASK_AGENT
  - drift-resolution/Answering a prepared question/question-round.ROUND_CLOSED
drift: null
proposal: q51924cv
agent: false
created: 2026-10-22T05:44:18.607Z
finished: 2026-10-22T05:47:28.435Z
---
# Rework entra in Resolving

Quando il Task è finito, il tracciamento dei lavori di risoluzione nell'host dell'estensione tratta Rework with feedback come Resolve.

**Rework with feedback su un Drift** (dalla freccetta di Dismiss Drift sulla scheda rossa o nei dettagli del Diagramma): vale solo per il Drift scelto, ancora aperto e fuori da ogni risoluzione, quando nessun Run è in corso e nessuna risoluzione aspetta una decisione, salvo quelle nate da una domanda pronta. Se l'istruzione parte davvero, si entra in Resolving: Trama lancia l'agente di risoluzione su quel Drift con il feedback del developer, **sempre**, anche quando l'Async Drift Resolver è acceso e il Drift ha una domanda pronta valida (la domanda pronta non viene aperta né usata, e resta com'è). Il Drift resta aperto e la sua scheda in Backlog è segnata come in risoluzione, come con Resolve (oggi `namedByResolution` in `extension/src/host/controller.ts`). Se l'istruzione non parte davvero (lasciata pronta in chat o negli appunti), non nasce nessuna risoluzione e il Drift resta com'è. I controlli di disponibilità sono quelli di Resolve (`resolveDriftBlocker` in `src/core/resolution.ts`, `driftsFinishing`), calcolati come se non ci fosse una domanda pronta, sia alla richiesta sia a ogni punto di controllo della consegna dell'istruzione.

**Rework with feedback su una risoluzione aperta** (Proposal di tipo resolution, dalla freccetta di Reject): possibile quando nessun Run è in corso e nessun'altra risoluzione, oltre a quella rifatta, aspetta una decisione, salvo quelle nate da una domanda pronta. La risoluzione è rifiutata con il feedback (il rifiuto stesso è di un altro Task); Trama raccoglie i suoi Drift ancora aperti e fuori da ogni altra risoluzione e lancia su di essi un solo agente di risoluzione: lo stato diventa Resolving e quei Drift sono segnati come in risoluzione. Se nessun Drift soddisfa queste condizioni la risoluzione è rifiutata e nessun agente parte. I Drift sono raccolti solo quando l'istruzione parte davvero.

**Running tasks**: mentre almeno un Run della finestra è in corso, Rework with feedback su un Drift o su una risoluzione aspetta (è indisponibile) esattamente come Resolve.

**Resolving**: il lavoro lanciato da Rework è un job di tipo `resolve` (vedi `startJob`/`driftWork` in `extension/src/host/drift-resolution.ts`): impedisce i Run finché non è finito, impedisce un altro Resolve o Rework, e finisce con gli stessi segnali di Resolve (agent-hook idle, fine o chiusura del terminale, fine/interruzione del turno o chiusura della conversazione in chat, controllo di esecuzione); nessun Run parte da queste fini. La risoluzione consegnata da un Rework non è nata da una domanda pronta, quindi finché non è decisa impedisce un altro Resolve.

**Nessuna regressione**: Resolve continua a comportarsi come prima. Da Free: con una domanda pronta valida e l'Async Drift Resolver acceso apre la domanda senza agente (anche con altre risoluzioni in attesa); altrimenti lancia Resolve Drifts quando nessuna risoluzione aspetta una decisione; un Run manuale va in Running tasks. Da Answering a prepared question, alla chiusura del round: Fix option o chiusura senza testo → Trama scrive e consegna da sé la risoluzione; testo libero con un'opzione non Fix, o consegna fallita, con istruzione partita → Resolving con la risposta già data; istruzione non partita, domanda saltata o finestra persa → Free con il Drift aperto e la domanda pronta intatta.

Il testo dell'input box e la formulazione dell'istruzione all'agente, e il pulsante nella webview, non fanno parte di questo Task. Codice coinvolto: `extension/src/host/controller.ts` (`launchAction`, nuova azione di Rework accanto a `resolve-drifts`), `extension/src/host/drift-resolution.ts`, `extension/src/host/prompts.ts`, `src/core/resolution.ts`.
