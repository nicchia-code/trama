---
technical: false
refs:
  - raffinamento
  - requirements/rules#raffinamento
  - requirements/rules#developer.ANNULLA_RAFFINAMENTO
  - requirements/tech#raffinamento
  - requirements/quality#raffinamento
  - developer.APPROVE_PROPOSAL
  - developer.ANNULLA_RAFFINAMENTO
---
# Coda dei raffinamenti

Con la funzione nuova Auto-update Stale Proposals, `Approve` su una Proposal ordinaria obsoleta non viene più rifiutato: l'host la mette in una coda della finestra, lancia uno alla volta l'agente di design che la adatta al Modello e ai Requisiti di adesso (il "raffinamento") e, alla fine del lavoro, la approva da solo con i suoi Task se è stata consegnata e non è bloccata. Questo Task fa la parte dell'host dell'estensione: impostazione, riconoscimento delle Proposal da raffinare, coda, lancio, fine del lavoro, `Cancel`, avvisi e i dati del quadro per il webview. Si appoggia al riallineamento della riga di comando (`trama proposal edit <id>` con `rebase: true`, il campo `refining: true` nel front matter, la `ProposalView` costruita anche per una Draft con `refining: true` e il suo campo `refining`), che è un altro Task di questa Proposal; la scheda (chip `to refine`, badge `refining`/`queued`, `Cancel`, bordo animato, Diagramma), la `Checkbox` dei Settings e il passo del wizard sono di un altro Task, e il comportamento dell'agente nella skill `trama-design` è del Task "Raffinamento nella skill design".

## Impostazione
- `trama.autoUpdateStaleProposals` nel manifest `extension/package.json`, accanto alle altre chiavi Features: `"type": "boolean"`, `"default": false`, `"scope": "application"`, `markdownDescription` «On: a stale design Proposal shows `to refine`; Approve adapts it to the current Model and then approves it.». In `extension/src/host/settings-schema.ts` va nel gruppo `Features` di `SETTING_GROUPS` subito dopo `trama.subagentsContextSharing`, con il titolo `Auto-update Stale Proposals` in `EXPLICIT_TITLES`.
- Si legge solo da `inspect("trama.autoUpdateStaleProposals").globalValue === true`, come `configuredAsyncDriftResolver` in `extension/src/host/agent.ts` (aggiungere un `configuredAutoUpdateStaleProposals` lì accanto), a ogni quadro della Board e a ogni clic. Un valore di workspace, assente o non booleano vale spento: un repository clonato non può accenderla. Spenta, Board, `Approve` e istruzioni sono esattamente come prima. Non aggiunge frasi alle altre istruzioni; la riga di comando non la legge.
- `extension/README.md` e `CHANGELOG.md` descrivono l'impostazione.

## Quando una Proposal è da raffinare
Con la funzione attiva è da raffinare una Proposal `kind: change`, non allegata a un Drift aperto, che è `open` e obsoleta (come la regola delle Proposal obsolete), oppure è `draft` con `refining: true` e nessun raffinamento di questa finestra la sta scrivendo (una Draft rimasta a metà). Import, setup e risoluzioni non lo sono mai e restano obsoleti come oggi.

`Approve` su una Proposal da raffinare è disponibile quando nessuna Proposal che richiede la blocca (non approvata, rifiutata, scartata, mancante o in un ciclo) e l'agente che l'ha consegnata ha finito il turno (`proposalsFinishing`); altrimenti resta indisponibile con quei motivi, come oggi. Gli altri blocchi (invalida per il Modello cambiato, voci scoperte, file non registrati) non lo impediscono: il raffinamento li sistema.

## Coda (`extension/src/host/refinement.ts`, nuovo)
- La coda e il raffinamento in corso stanno solo nella memoria della finestra, come gli altri lavori: identità delle Proposal in coda, identità della Proposal in raffinamento, terminale del lavoro e se la Proposal è stata consegnata durante il lavoro. Niente sotto `.trama/` né in `workspaceState`; riaprire l'editor perde coda e raffinamento in corso e le Proposal restano come sono nei file (tornano da raffinare). Ogni finestra conta solo i raffinamenti che ha lanciato lei.
- La coda segue sempre l'ordine del Backlog (`created`, poi identità), non quello dei clic. Lavora al più un raffinamento per volta; con nessuno al lavoro la prima parte subito. Una Proposal già in coda o in raffinamento non si aggiunge di nuovo.
- La logica pura (ordine, prossima da lanciare, esito di fine lavoro) sta in funzioni senza `vscode`, testate con `bun:test` accanto agli altri test dell'host.
- Ogni cambio della coda o dell'impostazione rimanda il quadro.

## Clic del developer
- Il messaggio `approveProposal` del webview non cambia (`extension/src/host/controller.ts`, `case "approveProposal"` ~834): con la funzione attiva e una Proposal da raffinare l'host la mette in coda invece di approvarla, senza cambiare nessun file; altrimenti approva come oggi.
- Messaggio nuovo `cancelRefinement { proposal }` (`extension/src/protocol.ts`, validato in `extension/src/host/messages.ts`, accettato solo con l'identità di una Proposal in coda di questa finestra). L'host ricontrolla che sia ancora in coda; altrimenti non fa nulla. La toglie dalla coda senza cambiare file né rifiutarla: torna da raffinare. Vale solo in coda: un raffinamento in corso non si annulla dalla scheda, lo interrompe solo chiudere il suo terminale. Rifiutare una Proposal in coda la toglie anche dalla coda.
- Spegnere la funzione svuota la coda (le Proposal che aspettavano tornano obsolete come senza la funzione); il raffinamento in corso continua e alla fine è guardato come sotto, approvazione compresa, ma nessun altro parte.
- Solo il clic su `Approve`, tenuto in memoria, fa partire un raffinamento e la sua approvazione finale: nessun file del progetto, `refining: true` compreso, avvia un raffinamento o approva una Proposal.

## Lancio
- Un lavoro del registro dei lavori della finestra (`extension/src/host/drift-resolution.ts`) con un nuovo valore di `JobKind`, `refine`, che porta l'identità della Proposal e del terminale. È un lavoro dal momento dell'invio reale. `driftWork` e `runWindowBlocker` (`src/core/resolution.ts`) non lo contano: non è un Run né una risoluzione, non rende indisponibili `Run all`, il Run dei Task, `Resolve`, Unify Drifts, scan, design e import, e nessuno di loro lo ferma.
- Passa da `launchAction` con il tipo `refine`, sul modello di `reworkProposalWithFeedback` (~1046-1097). Istruzione in `extension/src/host/prompts.ts`, con `<id>` l'identità permanente: "Use the trama-design skill to refine the stale Proposal <id> on the current Model and Requirements, as the \"Refining a stale Proposal\" section says." Sulla stessa riga, nello stesso ordine, le frasi che porta l'istruzione di una richiesta di design scritta: il limite dei sotto-agenti, Sub-agents Context Sharing quando è acceso, le domande e la lingua. Terminale `Refine <numero breve>` (per esempio `Refine P3`). Modello: il ruolo `trama.analysis` risolto al lancio, mai il modello scelto per la Proposal.
- Annuncio al lancio: una Proposal con il titolo della Proposal raffinata, nata in-process come quella di Rework with feedback (`extension/src/host/announcements.ts`) e legata alla Proposal raffinata fin dalla nascita, senza ghost a sé: la sua fase e la sua ultima nota si mostrano sulla scheda della Proposal. Si consegna alla consegna della Proposal e si ritira come ogni annuncio di Proposal.
- Se l'istruzione non parte davvero, la Proposal resta com'era, da raffinare, e l'avviso `Trama: refining <numero breve> did not start: <motivo>.` dice perché.

## Fine del lavoro
Il lavoro finisce con gli stessi segnali degli altri: hook a riposo, fine del comando, chiusura del terminale, controllo di esecuzione (che lo chiude alle stesse condizioni dei Run, con l'avviso in cima alla Board). L'host ricorda per il lavoro se ha ricevuto l'avviso `proposal-delivered` della sua Proposal. Al primo segnale, una volta sola (i segnali ripetuti sono idempotenti), guarda la Proposal raffinata:
- consegnata durante il lavoro, `open` e non bloccata: la approva con la stessa funzione di `src/core` (`approveProposal`) e gli stessi passi successivi dell'approvazione dal pannello (rigenerazione delle skill, Task creati), cioè `proposal.APPROVED`; un'approvazione rifiutata la lascia Open con l'avviso `Trama: <numero breve> was refined but not approved: <motivo>.`;
- consegnata, `open` e di nuovo obsoleta (un'altra approvazione ha cambiato i suoi file): rientra in coda al suo posto nell'ordine del Backlog, senza un nuovo clic;
- consegnata, `open` e bloccata per un altro motivo (per esempio una Proposal che richiede non è approvata): resta Open, con i motivi della sua scheda;
- non consegnata durante il lavoro (interrotto, o il developer ha scelto `Keep`): resta com'è, da raffinare, Open obsoleta o Draft rimasta a metà che `Approve` riprende;
- `rejected` (anche con `Remove`), `discarded` o `approved`: nulla.

Poi parte la prima Proposal della coda ancora da raffinare; quelle che non lo sono più (approvate, rifiutate o non più obsolete) escono dalla coda senza partire. Se l'istruzione della prossima non parte davvero, la coda si svuota, le Proposal che aspettavano tornano da raffinare e compare l'avviso `Trama: refining <numero breve> did not start: <motivo>.`. Una Proposal riallineata non si approva mai finché non è consegnata, e un raffinamento che finisce in qualunque modo non perde la Proposal né il lavoro fatto.

Gli avvisi stanno in cima alla Board, con il pulsante di chiusura degli altri avvisi; i testi sono in inglese e non seguono `trama.language`.

## Quadro per il webview
Al messaggio `snapshot` (`refresh` ~669-673) l'host aggiunge `refinement: { enabled, running, queued }`: `enabled` l'impostazione, `running` l'identità della Proposal in raffinamento o nulla, `queued` le identità in coda, in ordine. Il webview ne ricava `to refine`, `refining`, `queued` e i motivi di `Approve`/`Cancel`.

## Accettazione
Con l'impostazione accesa: due design che toccano lo stesso file, il primo approvato e il secondo `to refine`; `Approve` che lo raffina e lo approva con i suoi Task; tre Proposal premute di fila che si raffinano una alla volta nell'ordine del Backlog; `Cancel` su una in coda; il terminale chiuso a metà, con la Draft che torna `to refine` e riprende con `Approve`; un'altra approvazione durante il raffinamento, con la Proposal che rientra in coda; la modifica già nel Modello con `Remove` e con `Keep`. Con l'impostazione spenta, il badge `stale` e `Approve` disabilitato come prima.
