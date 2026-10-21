---
column: done
technical: false
refs:
  - drift-resolution
  - question-round
  - panel/Board
  - requirements/rules#drift-resolution
  - requirements/ui#drift-resolution
  - requirements/quality#drift-resolution
drift: null
proposal: n4a9dliq
agent: false
created: 2026-10-21T09:18:04.209Z
finished: 2026-10-21T09:36:28.495Z
---
# Resolve istantaneo

Quando il Task è fatto, `Resolve` su un Drift con `trama.experimentalAsyncDriftResolver` acceso (letto al clic, solo dal valore utente) e una domanda pronta valida (funzione di validità in `src/core`) non lancia nessun agente e non annuncia nessun ghost: Trama apre subito la domanda come round di una sola domanda, con la raccomandazione già selezionata e l'etichetta `Prepared question` dove il round dice chi chiede. Con la funzione spenta o senza domanda pronta valida, `Resolve` lancia l'agente come oggi.

- **Rifiuti**: restano quelli di oggi (Drift non aperto o già in una risoluzione, Run in corso nella finestra, altra risoluzione o domanda pronta in corso, agente che sta finendo). Nessuna risoluzione in scrittura o aperta lo ferma; le risoluzioni con `prepared: true` non contano in `resolveDriftBlocker`/`resolveDriftsBlocker` (`src/core/resolution.ts`) e il motivo `Proposal <id> resolving Drifts awaits a decision` non le nomina mai.
- **Lavoro in memoria**: l'host apre un lavoro di tipo `prepared` in `extension/src/host/drift-resolution.ts`, che `driftWork` conta come `resolving`, e mette il round nella coda di `src/core/question-rounds.ts` come round dell'host. Finché è aperto, `Run all`, ogni `Run`, il `Resolve` degli altri Drift e `Dismiss Drift` sono disabilitati con `Drifts are being resolved` / `An agent is resolving Drifts`. Finisce alla chiusura del round o alla perdita dell'editor.
- **Risposta senza agente**: una Fix option (con testo libero come nota) diventa `fix-code`; senza testo libero, l'opzione `dismissed` diventa `dismissed` e `proposal` diventa `proposal` con i file della Proposal allegata copiati (`model/`, `requirements/`, `specs.yaml`, `delete`). Trama scrive con le funzioni di `src/core` una risoluzione `kind: resolution`, `prepared: true`, solo quel Drift, titolo `Resolve: <titolo del Drift>`, una riga di corpo, e la consegna con i controlli ordinari (PREPARED_RESOLUTION_WRITTEN); la scheda gialla compare subito in Backlog.
- **Agente con la risposta**: testo libero con un'opzione non Fix option, o consegna rifiutata (la Draft va in `discarded`), lancia un normale lavoro `resolve` con il ghost di Resolve Drifts (fase `Preparing`) e la frase "The developer already answered this Drift's prepared question; do not ask again. Answer: <JSON>." con il JSON citato per la shell. Se l'istruzione non parte davvero, nessuna risoluzione e la domanda resta pronta.
- **Saltata / editor perso**: nessuna raccomandazione applicata, nulla scritto; il Drift resta aperto con la domanda pronta.
- **Dal codice di oggi**: la coda dei round della finestra è un campo privato di `EditorQuestions` (`extension/src/host/questions.ts`), raggiunto solo dal socket: serve un metodo dell'host che accodi il round nella stessa `QuestionRoundQueue` e ne riceva il `QuestionResult`. `JobKind` (`extension/src/host/drift-resolution.ts`) riceve il valore `prepared`, che `driftWork` conta come `resolving`. Chiamate in-process, le funzioni di `src/core` non mandano l'avviso `proposal-delivered` che manda la CLI (`src/cli/commands/proposal.ts`): l'host lo manda lui dopo la consegna riuscita.

L'accettazione esercita gli scenari di `quality#drift-resolution`: `Resolve` che apre subito la domanda, Fix option consegnata senza agente, comportamento del codice con Proposal allegata, testo libero che lancia l'agente senza rifare la domanda, due risoluzioni `prepared` in attesa insieme, domanda saltata che resta pronta, domanda scaduta che torna al flusso di oggi, impostazione spenta come prima.
