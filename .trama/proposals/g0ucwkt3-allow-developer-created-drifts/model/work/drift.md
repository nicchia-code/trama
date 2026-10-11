# Drift

Una differenza trovata dall'agente o dal developer fra il codice e il Model, oppure fra il codice e un Requisito, sulla quale il developer deve decidere. Per impostazione predefinita si corregge il codice; l'agente allega una Proposal solo quando il codice gestisce un caso importante che il Model ha dimenticato.

Un Drift nuovo nasce con un'identità propria, non presa da un contatore condiviso con gli altri, e ricorda l'istante in cui è stato creato. Quell'istante ne fissa il posto: il più vecchio prima. Due Drift creati nello stesso istante si ordinano per identità. Un Drift già numerato, che non ricorda l'istante, resta leggibile e sta prima di quelli che lo ricordano; fra i numerati l'ordine è il numero.

Finché è aperto, un Drift ha anche un numero breve temporaneo, `D3`, che il developer usa per leggere la Board e per citarlo, al posto dell'identità permanente. Il Drift lo prende appena la copia di lavoro lo vede e lo libera quando è risolto, in qualunque modo; da quel momento si mostra con la sua identità permanente.

Un Drift nasce Open quando l'agente o il developer registra una differenza e punta sempre ad almeno un elemento del Model o un Requisito. Anche il developer può registrarlo direttamente dalla riga di comando, senza che un agente lo stia creando; la creazione non decide quale lato tenere. Un Drift che l'agente registra mentre realizza un Task ricorda quel Task, la sua origine.

A Drift always states two sides: what happens (what the code does) and what should happen (what the Model or the Requirement says). The developer always decides by keeping one of the two sides: keeping what should happen has the code fixed; keeping what happens means the Model is left to match the code, through the attached Proposal when there is one and by changing nothing when there is none. There is no way to leave a Drift without keeping a side. Quando il Drift è risolto da una Proposal di risoluzione (vedi sotto), il Modello si adegua attraverso quella, e la Proposal allegata è messa da parte.

Una Proposal allegata a un Drift aperto appartiene al Drift: non è una decisione a sé e il developer non la vede. Non si approva né si rifiuta da sola, non è una scheda da decidere e la scheda del Drift non la mostra: è materiale che l'agente usa quando risolve i Drift. Tenere uno dei due lati decide anche la Proposal: tenere ciò che succede dalla riga di comando la accetta, tenere ciò che dovrebbe succedere la mette da parte, e una Proposal di risoluzione approvata la mette da parte in ogni caso. Si può allegare a un Drift solo una Proposal che l'agente sta ancora scrivendo o che è aperta, e che non è già allegata a un altro Drift aperto; l'agente la allega prima di consegnarla, così non compare mai da sola. Un Drift risolto non trattiene più la sua Proposal.

Nel pannello il developer non decide su un singolo Drift: la sua scheda, nella Board e nel Diagramma, mostra il titolo, i due lati e i riferimenti del Drift, senza nessun modo di decidere. I Drift si risolvono insieme con Resolve Drifts (vedi Drift resolution): l'agente chiede al developer, per ogni Drift aperto, cosa deve succedere, e scrive una Proposal di risoluzione, o più Proposal in catena quando i Drift sono tanti, che porta la decisione presa su ciascuno: adeguare il Modello al codice, chiudere il Drift senza cambiare nulla, oppure correggere il codice con una delle Fix options e la nota del developer. Un Drift sta in una sola Proposal di risoluzione da decidere. Approvarla risolve, tutti insieme, i Drift che elenca e che sono ancora aperti; rifiutarla o scartarla li lascia aperti, con le loro Proposal allegate. Dalla riga di comando il developer può ancora decidere su un Drift alla volta.

Nella Board un Drift aperto nasce con una scheda rossa. Quando una Proposal di risoluzione che lo elenca è consegnata, la Proposal e i suoi Drift aperti diventano una sola scheda gialla: la Proposal in testa, con ciò che cambia e le decisioni, e sotto le righe dei Drift che portano ai loro dettagli nel Diagramma. La scheda rossa di ciascuno di quei Drift sparisce dalla Board, ma il Drift resta aperto, visibile nel Diagramma e continua a bloccare gli stessi Task. Finché la risoluzione è ancora in scrittura, ogni Drift resta rosso. Se la risoluzione torna in scrittura, è rifiutata o scartata, le schede dei Drift ancora aperti tornano rosse; approvarla li risolve come prima. Ogni risoluzione della catena unifica solo i propri Drift.

Keeping what should happen is not one single way: every new Drift also offers the developer two to five ways to fix the code, written by the agent, the first being the one it recommends. The developer cannot have the code fixed without choosing one of them, and may add a note to the choice. Keeping what happens needs no such choice. A Drift that was filed before options existed and is still Open has none; keeping what should happen then needs no choice.

Both sides are written for a developer reading them at a glance: in terms of behaviour, not of the code's inner workings. A Drift may also note where in the code the difference was seen; that note is only a pointer for whoever fixes the code and plays no part in the decision.

While it is Open a Drift blocks Tasks, because the work on them would be built on a difference nobody has decided yet. It blocks its origin Task, if any, and every Task not yet Done that concerns the same thing: the same element or one inside the other, counting the Requirements that apply to an element as part of it (a Requirement's General section counts only for the Tasks that name it). A Drift found by a Scan has no origin and blocks only the Tasks that concern the same thing. A Drift that no open Task concerns blocks nothing. A blocked Task cannot be started by the agent; see the Task.

## States

### Open (initial)
Waiting for the developer's decision.
- `developer.FIX_DRIFT_CODE` → Code to be fixed: the developer keeps the side of what should happen, choosing one of the Drift's fix options and, if they want, adding a note. Refused, with the Drift staying Open and the refusal saying that an option must be chosen, when the Drift has options and none is named, or when the one named does not exist. Rifiutata anche, con il Drift che resta Open e il rifiuto che dice che si può solo chiudere, quando il Drift punta al Modello ma nessuno dei suoi elementi del Modello esiste più, nemmeno un elemento che lo conteneva. Creates a Task in To do that points to the same elements and carries the Drift's description, the chosen option and the developer's note; un elemento che non esiste più è sostituito da quello più vicino che lo conteneva e c'è ancora, e uno che non ha più alcun contenitore è lasciato fuori. The Task is a Technical Task when the Drift points only to Requirements. The origin Task, if it is not Done, goes back to To do and stays blocked until the Task created here is Done. Se il Drift ha una Proposal allegata, questa è messa da parte con lui: rifiutata se era aperta, scartata se l'agente la stava ancora scrivendo. Solo dalla riga di comando.
- `developer.ACCEPT_DRIFT_PROPOSAL` → Proposal accepted: the developer keeps the side of what happens, only if a Proposal is attached to the Drift and that Proposal can still be approved; the attached Proposal is approved as if the developer had approved it. If it cannot be approved (still being written, rejected, discarded, already approved, stale, invalid or waiting for others) nothing changes and the Drift stays Open, saying why. The Tasks it blocked are free again. Solo dalla riga di comando.
- `developer.DISMISS_DRIFT` → Dismissed: the developer keeps the side of what happens, only if no Proposal is attached to the Drift; closes the Drift with no change to code or Model, recording that the code was kept. With a Proposal attached nothing changes and the Drift stays Open: the developer accepts that Proposal or fixes the code. The Tasks it blocked are free again. Solo dalla riga di comando.
- `proposal.APPROVED` → Proposal accepted: solo se la Proposal approvata è una risoluzione che elenca questo Drift con la decisione di adeguare il Modello al codice. Il Modello è già cambiato con la Proposal di risoluzione; la Proposal allegata al Drift, se c'è, è messa da parte. I Task che bloccava tornano liberi e la sua origine resta dov'è.
- `proposal.APPROVED` → Dismissed: solo se la Proposal approvata è una risoluzione che elenca questo Drift con la decisione di chiuderlo senza cambiare nulla. Né il codice né il Modello cambiano per questo Drift; la Proposal allegata, se c'è, è messa da parte. I Task che bloccava tornano liberi e la sua origine resta dov'è.
- `proposal.APPROVED` → Code to be fixed: solo se la Proposal approvata è una risoluzione che elenca questo Drift con la decisione di correggere il codice, con l'opzione scelta e, se il developer l'ha scritta, la nota. Crea il Task di correzione come quando il developer tiene ciò che dovrebbe succedere, con la sua origine che torna in To do se non è Done; la Proposal allegata, se c'è, è messa da parte.

### Code to be fixed (final)
The developer decided the Model or the Requirement is right. The Task created for it carries on the work. The other Tasks it blocked are free again; its origin Task waits for the Task created here.

### Proposal accepted (final)
The developer kept what happens: the Model changed to match the code.

### Dismissed (final)
Il developer ha tenuto ciò che succede e né il codice né il Modello sono cambiati: nessuna Proposal era allegata, oppure una Proposal di risoluzione ha deciso di chiudere il Drift senza cambiare nulla.

## Events

### PROPOSAL_ACCEPTED
Emitted when the developer accepts the Proposal attached to the Drift. The Proposal reacts as if it had been approved directly.

### CODE_FIX_CHOSEN
Emesso quando il developer, dalla riga di comando, tiene il lato di ciò che dovrebbe succedere su un Drift che ha una Proposal allegata. La Proposal reagisce venendo messa da parte.

### RESOLVED_BY_PROPOSAL
Emesso quando una Proposal di risoluzione approvata risolve, in qualunque modo, un Drift che ha una Proposal allegata. La Proposal allegata reagisce venendo messa da parte.
