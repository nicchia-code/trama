# Proposal

A change to the Model and its Requirements suggested by the agent, with the full new version of every file it touches and the files it removes. It has no effect until the developer approves it. Approved, rejected and discarded Proposals stay as history.

Una Proposal nuova nasce con un'identità propria, non presa da un contatore condiviso con le altre, e ricorda l'istante in cui è stata creata. Quell'istante ne fissa il posto: la più vecchia prima. Due Proposal create nello stesso istante si ordinano per identità. Una Proposal già numerata, che non ricorda l'istante, resta leggibile e sta prima di quelle che lo ricordano; fra le numerate l'ordine è il numero.

Dalla nascita, anche da Draft, una Proposal ha un numero breve temporaneo, `P3`, che il developer usa per leggere la Board e per citarla, al posto dell'identità permanente. La Proposal lo tiene finché non è approvata, rifiutata o scartata e allora lo libera; da quel momento si mostra con la sua identità permanente.

A Proposal is created by the agent as a Draft, either as an ordinary change or as an import that describes existing code. It may be written on top of other Proposals that are drafts, open or approved (never rejected or discarded ones); it is then drawn, checked and approved on top of them. Only when the agent has finished writing it does the agent hand it over, and only then does it await the developer.

Una Proposal può anche essere una risoluzione di Drift: la scrive l'agente lanciato con Resolve Drifts (vedi Drift resolution). Oltre ai file che cambia, elenca i Drift aperti che risolve, ciascuno con la decisione presa dal developer: adeguare il Modello al codice, chiudere il Drift senza cambiare nulla, oppure correggere il codice con un'opzione e una nota. Ogni Drift sta in una sola risoluzione da decidere. Quando i Drift sono tanti l'agente divide la risoluzione in più Proposal che si richiedono in catena, ciascuna con i suoi Drift. Come un import, le sue modifiche descrivono codice che esiste già.

Una Proposal può nascere da una richiesta di design scritta (vedi la Design request): l'agente la lega a quella richiesta quando la crea. Solo la prima Proposal di un design è legata alla richiesta; quelle che la seguono la richiedono e non sono legate a nulla.

Una Proposal può essere allegata a un Drift aperto (vedi il Drift): finché lo è, il developer non la vede e non la decide da sola. Non ha una scheda propria fra ciò che aspetta una decisione, e un'approvazione o un rifiuto diretti sono rifiutati, lasciandola com'è e dicendo di decidere sul Drift. Quando il Drift è risolto, la Proposal è già decisa con lui; una Proposal rimasta aperta di un Drift risolto prima di questa regola torna una Proposal come le altre.

## States

### Draft (initial)
The agent is still writing it. The developer cannot approve or reject it, and it is not counted among what awaits a decision: an approval or a rejection attempted now is refused, saying the Proposal is still being written. The same holds for the acceptance of a Drift's attached Proposal. Proposals that require it stay blocked.
- `agent.SUBMIT_PROPOSAL` → Open: only if the Proposal would be valid once applied and every file it holds was registered with it. Being stale or waiting for other Proposals does not prevent the hand-over. If it is refused, the Proposal stays Draft and the agent is told what to fix. Ogni consegna riuscita, anche quella che segue una modifica, fa sapere che la Proposal è stata consegnata. Una risoluzione si consegna solo se elenca almeno un Drift e ogni Drift che elenca è ancora aperto e non sta in un'altra risoluzione da decidere, e se nessun Drift che chiede di correggere il codice punta al Modello senza che, con la risoluzione applicata, resti alcuno dei suoi elementi del Modello, nemmeno un elemento che lo conteneva.
- `agent.EDIT_PROPOSAL` → Draft: the agent registers, rewrites or marks for deletion a file; nothing else changes. Per una risoluzione l'agente registra o cambia anche la decisione su un Drift aperto: rifiutata se il Drift non è aperto, sta già in un'altra risoluzione da decidere o l'opzione scelta non esiste, e la decisione di correggere il codice anche quando il Drift punta al Modello ma nessuno dei suoi elementi del Modello esiste più, nemmeno un elemento che lo conteneva: quel Drift si può solo chiudere.
- `developer.DISCARD_PROPOSAL` → Discarded: the developer gives up a draft the agent never finished; no feedback is asked. Proposals that require it are not discarded; they stay blocked, saying it was discarded.
- `drift.CODE_FIX_CHOSEN` → Discarded: il developer ha tenuto ciò che dovrebbe succedere sul Drift a cui questa Draft è allegata; la bozza è abbandonata con il Drift, senza feedback. Le Proposal che la richiedono restano bloccate, dicendo che è stata scartata.
- `drift.RESOLVED_BY_PROPOSAL` → Discarded: una risoluzione approvata ha risolto il Drift a cui questa Draft è allegata; la bozza è abbandonata con il Drift, senza feedback. Le Proposal che la richiedono restano bloccate, dicendo che è stata scartata.

### Open
Waiting for the developer, who may now see it, approve it or reject it. It may be blocked: while it is, an approval is refused and the Proposal stays Open, saying why. It is blocked when any Proposal it requires, directly or through others, is not approved yet, was rejected or discarded, does not exist or requires it back in a cycle. It is also blocked when it is stale, because a file it touches changed since the Proposal first recorded it (on top of the Proposals it requires); when some file it holds was never registered with it; or when the Model and Requirements with it applied would be invalid, for example a Requirement section pointing at a State that no longer exists. Una risoluzione è bloccata anche quando un Drift ancora aperto che chiede di correggere il codice punta al Modello e, con la risoluzione applicata, non resta alcuno dei suoi elementi del Modello, nemmeno un elemento che lo conteneva: l'approvazione è rifiutata prima di cambiare qualcosa e la risoluzione va riscritta con Resolve Drifts. Nothing prevents approving a Proposal that touches no file.
- `developer.APPROVE_PROPOSAL` → Approved: only if the Proposal is not blocked. Copies its files into the Model and Requirements, removes the files it deletes, and regenerates the Requirement skills for the agent. Rifiutata, con la Proposal che resta Open, quando è allegata a un Drift aperto: il messaggio dice di decidere su quel Drift. Per una risoluzione, nello stesso passo risolve ogni Drift che elenca ed è ancora aperto, secondo la decisione presa (vedi il Drift); un Drift già risolto in altro modo è ignorato e le modifiche al Modello restano.
- `drift.PROPOSAL_ACCEPTED` → Approved: the developer accepted a Drift's attached Proposal; the same conditions and consequences as a direct approval.
- `developer.REJECT_PROPOSAL` → Rejected: appends the developer's feedback to the Proposal when there is any; feedback is optional and a blank one adds nothing. Proposals that require it are not rejected; they stay blocked, saying it was rejected. Rifiutato, con la Proposal che resta Open, quando è allegata a un Drift aperto: il messaggio dice di decidere su quel Drift.
- `drift.CODE_FIX_CHOSEN` → Rejected: il developer ha tenuto ciò che dovrebbe succedere sul Drift a cui questa Proposal è allegata; aggiunge il feedback che il Drift è stato risolto correggendo il codice. È un rifiuto che il developer fa attraverso il Drift, non sulla Proposal. Le Proposal che la richiedono restano bloccate, dicendo che è stata rifiutata.
- `drift.RESOLVED_BY_PROPOSAL` → Rejected: una risoluzione approvata ha risolto il Drift a cui questa Proposal è allegata; aggiunge il feedback che il Drift è stato risolto da quella risoluzione. È un rifiuto che il developer fa approvando la risoluzione, non su questa Proposal. Le Proposal che la richiedono restano bloccate, dicendo che è stata rifiutata.
- `agent.EDIT_PROPOSAL` → Draft: the agent changes a file of a Proposal it had handed over. It is withdrawn from the developer until the agent hands it over again.

### Approved (final)
Part of the Model now.

### Rejected (final)
Rifiutata dal developer, oppure messa da parte con il Drift a cui era allegata: quando il developer ne tiene ciò che dovrebbe succedere o quando una risoluzione approvata lo risolve. L'agente risponde con una Proposal nuova invece di correggere questa. Una risoluzione rifiutata lascia aperti i suoi Drift.

### Discarded (final)
Given up before the agent finished writing it. Nothing is asked of the agent; it may write a new Proposal if the change is still wanted.

## Events

### SUBMITTED
Emessa ogni volta che l'agente consegna la Proposal al developer e la consegna riesce. Una consegna rifiutata non la emette. Se la Proposal è legata a una richiesta di design scritta, quella richiesta è consumata.

### APPROVED
Emitted when the Proposal becomes part of the Model. Whatever must follow reacts to it: the Requirement skills are regenerated, and for an ordinary change a scan of the Features it affects may be started. For an import Proposal no scan follows, because the Model it adds already matches the code. Nemmeno una risoluzione fa partire una scansione: le sue modifiche descrivono codice che esiste già, e i Drift che risolve sono decisi. Con Hold scan acceso la scansione non parte: la Proposal resta in sospeso fino allo spegnimento dell'interruttore (vedi Scan hold).
