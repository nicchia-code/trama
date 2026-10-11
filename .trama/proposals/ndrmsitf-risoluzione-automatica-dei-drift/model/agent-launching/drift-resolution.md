# Drift resolution

La risoluzione raccoglie i Drift aperti del progetto e li porta a una decisione coerente. Senza delega automatica, Resolve Drifts conserva il flusso attuale: un round di domande, una Proposal di risoluzione da approvare e Task da avviare a mano. Una domanda saltata lascia il Drift fuori dalla risoluzione e aperto.

Il developer può delegare la scelta dei Drift non critici oppure di tutti i Drift, inclusi quelli critici. La delega sceglie sempre la prima correzione raccomandata già presente nel Drift: prepara una risoluzione aggregata, la consegna, la approva e fa eseguire le correzioni e le origini ancora da completare. Non sceglie autonomamente di adeguare il Modello al codice né prende lavoro estraneo.

Prima di cominciare una raccolta automatica devono essere finiti tutti gli scan e i Run lanciati da Trama sul progetto, in qualunque finestra. Una sola risoluzione opera sul progetto. I Drift sono raccolti quando l'istruzione parte davvero; scan avviati dopo non interrompono quella raccolta, e i loro Drift aspettano la successiva. Anche dopo le correzioni e la ripresa delle origini si possono trovare nuovi Drift: finché ci sono casi ammissibili, la delega continua, senza un limite aggiuntivo di cicli.

Resolve Drifts applica sempre la delega corrente. Con delega ai soli non critici, i critici e le eccezioni seguono un flusso manuale separato; se il developer avvia una raccolta mista, questi casi vengono affrontati prima degli automatici. La risoluzione manuale e la sua approvazione non avviano automaticamente i loro Task. Senza un clic, l'automatismo tratta i casi ammissibili senza aprire domande sui critici esclusi. Un caso senza correzione raccomandata o fallito può richiedere domande manuali anche con delega totale; non si inventa una scelta e non si saltano i controlli.

I Run e la preparazione delle risoluzioni continuano a escludersi a vicenda. Una risoluzione ancora in scrittura o aperta impedisce un'altra raccolta. Design, import e nuove scansioni possono partire come prima; una nuova scansione non sospende il lavoro già avviato. La fine di un lavoro segue il suo terminale o la sua conversazione, mai una quiete o un timer. Per dichiarare riuscito uno scan deve essere stato concluso anche il suo controllo: chiudere o interrompere l'agente non basta.

La delega è verificata prima di ogni scelta, approvazione e nuovo Run. Ritirarla impedisce nuovi passi automatici, ma il Task già iniziato può concludersi. I risultati già approvati non sono annullati. Un caso fallito non viene riprovato dal ciclo successivo: serve una richiesta esplicita, una modifica del Drift o uno scan avviato dal developer. Gli altri casi indipendenti possono proseguire. Uno scan fallito sospende invece le nuove raccolte automatiche fino a uno scan riuscito o una richiesta esplicita di risoluzione.

Il coordinamento riguarda solo lavori lanciati da Trama, anche fra più finestre dello stesso progetto; non segue agenti avviati fuori da Trama. Riaprire l'editor perde il ricordo dei lavori: i file restano, ma la delega non riparte subito sui Drift esistenti. Serve uno scan riuscito o una richiesta esplicita. I Run manuali conservano le loro regole.

## States

### Free (initial)
Nessun Run e nessun agente di risoluzione è in corso. La delega può iniziare una raccolta soltanto se è stata resa nuovamente operativa dopo l'apertura dell'editor, non ci sono scan in corso, esiste almeno un Drift ammissibile e nessuna risoluzione aspetta una decisione. Se ci sono soltanto critici esclusi o casi falliti, non parte nulla da solo.
- `developer.ASK_AGENT` → Running tasks: un Run manuale parte davvero; valgono le regole dei Task.
- `developer.ASK_AGENT` → Resolving: Resolve Drifts parte davvero, con Drift aperti e nessuna risoluzione da decidere. Riattiva la delega sospesa; applica la modalità corrente e, con casi misti, prepara prima il gruppo manuale. Una parte automatica aspetta comunque gli scan già in corso.
- `developer.ASK_AGENT` → In attesa delle scansioni: parte davvero uno scan del progetto e la delega è attiva.
- `proposal.APPROVED` → In attesa delle scansioni: l'approvazione ordinaria avvia davvero uno scan e la delega è attiva. Un import o una risoluzione non avviano questo scan.
- `workspace.MODEL_CHANGED` → Resolving: la delega operativa trova Drift ammissibili, nessuno scan o Run è in corso e non c'è una risoluzione da decidere; una sola istruzione automatica parte per il progetto e fotografa i Drift ammissibili.
- `COLLECTION_STARTED` → Resolving: dopo la fine di tutti gli scan e Run, una raccolta automatica autorizzata parte davvero. Vale anche per la rivalutazione dopo un Run o una decisione manuale, senza richiedere un altro cambiamento ai file.
- `SCAN_BARRIER_CLEARED` → Resolving: gli scan già in corso sono tutti terminati, quelli richiesti sono riusciti, non ci sono Run né risoluzioni da decidere e una raccolta ammissibile parte davvero.
- `SCAN_BARRIER_CLEARED` → Free: gli scan sono terminati con successo e riattivano la delega, ma nessuna raccolta deve partire.
- `developer.SET_DRIFT_AUTOPILOT` → Free: cambia la delega. Ritirarla impedisce nuovi passi; attivarla non supera la ripresa richiesta dopo l'apertura dell'editor o il fallimento di uno scan. Se è già operativa, il progetto viene rivalutato per una nuova raccolta.

### In attesa delle scansioni
La delega aspetta che finiscano tutti gli scan già lanciati sul progetto. Gli scan che partono durante l'attesa si aggiungono alla stessa raccolta. Nessun Drift viene scelto automaticamente prima della barriera.
- `developer.ASK_AGENT` → Running tasks: parte un Run manuale; la raccolta automatica aspetta anche questo e il suo eventuale scan di fine corsa.
- `developer.ASK_AGENT` → Resolving: Resolve Drifts può affrontare soltanto i casi manuali mentre gli scan continuano. I casi automatici restano in attesa.
- `agent.FINISH_CHECK` → In attesa delle scansioni: lo scan dichiara esito riuscito; si ricorda l'esito, ma si aspetta ancora la fine del suo lavoro e degli altri scan e Run.
- `agent.FINISH_CHECK` → Sospeso: il controllo dello scan dichiara esito fallito; nessuna nuova raccolta parte da quei risultati parziali.
- `SCAN_BARRIER_CLEARED` → Resolving: tutti gli scan sono terminati con successo, nessun Run è in corso e una raccolta automatica ammissibile parte davvero.
- `SCAN_BARRIER_CLEARED` → Free: tutti gli scan sono terminati con successo ma non si può o non serve avviare una raccolta.
- `agent-hook.IDLE` → Sospeso: termina uno scan senza avere concluso il proprio controllo; nuove raccolte automatiche sono sospese.
- `terminal.COMMAND_ENDED` → Sospeso: lo scan termina senza un controllo riuscito.
- `terminal.CLOSED` → Sospeso: uno scan viene chiuso prima del proprio controllo riuscito.
- `editor-chat.AGENT_STOPPED` → Sospeso: il turno dello scan finisce senza un controllo riuscito.
- `editor-chat.AGENT_INTERRUPTED` → Sospeso: lo scan viene interrotto prima del proprio controllo riuscito.
- `editor-chat.CONVERSATION_CLOSED` → Sospeso: la conversazione dello scan viene chiusa prima del proprio controllo riuscito.
- `developer.SET_DRIFT_AUTOPILOT` → Free: il developer ritira la delega; gli scan continuano, senza nuove scelte automatiche.

### Running tasks
Almeno un Run è in corso. Resolve Drifts e nuove raccolte automatiche aspettano; altri Run manuali seguono le regole esistenti. Un Run automatico prende soltanto le correzioni della propria risoluzione e le loro origini ancora da completare, rispettando i blocchi e senza riprendere origini già finite. Se un Task fallisce, non viene ritentato; prosegue il lavoro indipendente.
- `agent-hook.IDLE` → Free: termina l'ultimo Run, non ci sono scan ancora in corso; il progetto viene rivalutato per eventuali nuove raccolte, senza riaprire i casi falliti.
- `terminal.COMMAND_ENDED` → Free: termina l'ultimo Run, alle stesse condizioni; una fine anomala conserva i risultati e segnala il fallimento.
- `terminal.CLOSED` → Free: viene chiuso l'ultimo Run, alle stesse condizioni.
- `editor-chat.AGENT_STOPPED` → Free: termina il turno dell'ultimo Run, alle stesse condizioni.
- `editor-chat.AGENT_INTERRUPTED` → Free: viene interrotto l'ultimo Run, alle stesse condizioni.
- `editor-chat.CONVERSATION_CLOSED` → Free: viene chiusa la conversazione dell'ultimo Run, alle stesse condizioni.
- `agent-hook.IDLE` → In attesa delle scansioni: termina l'ultimo Run, ma uno scan continua e la delega è attiva.
- `terminal.COMMAND_ENDED` → In attesa delle scansioni: termina l'ultimo Run, alle stesse condizioni.
- `terminal.CLOSED` → In attesa delle scansioni: viene chiuso l'ultimo Run, alle stesse condizioni.
- `editor-chat.AGENT_STOPPED` → In attesa delle scansioni: termina il turno dell'ultimo Run, alle stesse condizioni.
- `editor-chat.AGENT_INTERRUPTED` → In attesa delle scansioni: viene interrotto l'ultimo Run, alle stesse condizioni.
- `editor-chat.CONVERSATION_CLOSED` → In attesa delle scansioni: viene chiusa la conversazione dell'ultimo Run, alle stesse condizioni.
- `agent.FINISH_CHECK` → Running tasks: è riuscito lo scan di fine corsa, ma il Run non è ancora finito; nessuna nuova raccolta parte prima della sua fine.
- `agent.FINISH_CHECK` → Running tasks: il controllo dichiara esito fallito; il Run continua soltanto sui casi indipendenti e la prosecuzione automatica compromessa resta sospesa, senza dichiarare lo scan riuscito.
- `developer.SET_DRIFT_AUTOPILOT` → Running tasks: cambia la delega; nessun nuovo Task automatico inizia senza essere ancora autorizzato. Il Task già iniziato non viene interrotto forzatamente.

### Resolving
Un solo agente prepara una risoluzione manuale o automatica del progetto. Nessun Run parte prima che quell'agente abbia finito. La parte manuale chiede decisioni e viene consegnata al developer; una domanda saltata resta fuori. La parte automatica contiene soltanto le prime correzioni raccomandate di Drift ancora ammissibili. Un caso non valido resta fuori e richiede intervento, senza impedire la consegna degli altri casi indipendenti. Una raccolta vuota non crea una risoluzione.
- `proposal.SUBMITTED` → Resolving: se è la risoluzione automatica della raccolta corrente e tutte le sue scelte sono ancora autorizzate e valide, viene concessa la sua approvazione automatica. Una risoluzione manuale aspetta invece il developer. Un'approvazione non applicabile conserva la Proposal aperta e segnala l'intervento richiesto.
- `proposal.APPROVED` → Resolving: la risoluzione automatica crea le correzioni; il Run attende la fine dell'agente che l'ha preparata. Una risoluzione manuale non avvia Run automatici.
- `agent-hook.IDLE` → Running tasks: l'agente della risoluzione ha finito e parte davvero il Run automatico ancora autorizzato delle sue correzioni e origini.
- `terminal.COMMAND_ENDED` → Running tasks: l'agente della risoluzione ha finito, con le stesse condizioni; una fine anomala non vale come autorizzazione di risultati incompleti.
- `editor-chat.AGENT_STOPPED` → Running tasks: il turno della risoluzione è finito e il Run automatico parte davvero.
- `agent-hook.IDLE` → Free: l'agente della risoluzione ha finito senza avviare un Run automatico e non ci sono scan attivi. Una Proposal consegnata ma non decisa continua a impedire nuove raccolte.
- `terminal.COMMAND_ENDED` → Free: è finito il comando della risoluzione, alle stesse condizioni.
- `terminal.CLOSED` → Free: è stato chiuso il terminale della risoluzione, alle stesse condizioni; nessun nuovo Run parte da una chiusura o interruzione.
- `editor-chat.AGENT_STOPPED` → Free: è finito il turno della risoluzione, alle stesse condizioni.
- `editor-chat.AGENT_INTERRUPTED` → Free: è stato interrotto il turno della risoluzione, alle stesse condizioni; nessun nuovo Run parte dall'interruzione.
- `editor-chat.CONVERSATION_CLOSED` → Free: è stata chiusa la conversazione della risoluzione, alle stesse condizioni.
- `agent-hook.IDLE` → In attesa delle scansioni: la risoluzione termina senza Run automatico e uno scan successivo è ancora in corso, con delega attiva.
- `terminal.COMMAND_ENDED` → In attesa delle scansioni: la risoluzione termina, alle stesse condizioni.
- `terminal.CLOSED` → In attesa delle scansioni: la risoluzione viene chiusa, alle stesse condizioni.
- `editor-chat.AGENT_STOPPED` → In attesa delle scansioni: termina il turno della risoluzione, alle stesse condizioni.
- `editor-chat.AGENT_INTERRUPTED` → In attesa delle scansioni: viene interrotto il turno della risoluzione, alle stesse condizioni.
- `editor-chat.CONVERSATION_CLOSED` → In attesa delle scansioni: viene chiusa la conversazione della risoluzione, alle stesse condizioni.
- `developer.SET_DRIFT_AUTOPILOT` → Resolving: la nuova delega vale prima della prossima scelta o approvazione. Ritirarla lascia la Proposal da esaminare e impedisce il Run automatico; non annulla le decisioni già applicate.
- `agent.FINISH_CHECK` → Resolving: uno scan avviato dopo la raccolta dichiara un fallimento; la raccolta corrente prosegue, ma quelle nuove restano sospese fino alla ripresa prevista.

### Sospeso
Uno scan non è riuscito. Non partono nuove raccolte automatiche; Drift, Proposal e Task già scritti restano. La sospensione non vieta i Run manuali né interrompe una raccolta già avviata prima del fallimento di uno scan successivo.
- `developer.ASK_AGENT` → Resolving: il developer avvia davvero Resolve Drifts, quando nessun Run o altra risoluzione è in corso; la richiesta esplicita riattiva la delega, applica la modalità corrente e affronta le eccezioni manualmente. I passi automatici aspettano gli scan ancora attivi.
- `developer.ASK_AGENT` → Running tasks: il developer avvia un Run manuale; la sospensione delle raccolte automatiche resta finché uno scan riesce o viene chiesta esplicitamente una risoluzione.
- `agent.FINISH_CHECK` → In attesa delle scansioni: uno scan dichiara esito riuscito e riattiva la delega; si aspetta comunque la fine del suo lavoro e degli altri scan.
- `SCAN_BARRIER_CLEARED` → Resolving: gli scan riusciti sono tutti terminati, nessun Run continua, non ci sono risoluzioni da decidere e una raccolta automatica ammissibile parte davvero.
- `SCAN_BARRIER_CLEARED` → Free: gli scan riusciti sono terminati e nessuna raccolta deve partire.
- `developer.SET_DRIFT_AUTOPILOT` → Free: il developer ritira la delega. Il fallimento non è dimenticato e riattivare la delega non basta a riaprire le raccolte.

## Events

### COLLECTION_STARTED
Una raccolta automatica di Drift parte davvero verso l'agente scelto, dopo la barriera iniziale e con un unico responsabile del progetto. Può aprire un terminale come un Resolve Drifts manuale.

### AUTOMATIC_APPROVAL_GRANTED
Una risoluzione automatica consegnata della raccolta corrente è ancora autorizzata e ha superato tutti i controlli ordinari; Trama può approvarla per la delega del developer. Non autorizza una Proposal ordinaria, un import, una risoluzione manuale né modifiche al Modello.

### AUTOMATIC_RUN_STARTED
Dopo la fine dell'agente di risoluzione parte davvero il Run autorizzato delle sole correzioni approvate e delle loro origini ancora da completare. Può aprire un nuovo terminale; non riusa quello della risoluzione.

### SCAN_BARRIER_CLEARED
L'ultimo scan del progetto termina dopo il proprio controllo riuscito e nessun altro scan resta in corso. Una dichiarazione di controllo completato, da sola, non emette questo fatto; un ritiro o un fallimento non lo emettono.
