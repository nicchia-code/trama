# Drift resolution

La risoluzione raccoglie i Drift aperti del progetto e li porta a una decisione coerente. Il developer la chiede dalla Board in due modi: Resolve all, in fondo alla colonna Blocked, raccoglie tutti i Drift aperti; Resolve, sulla scheda di un Drift, raccoglie soltanto quel Drift. Sono la stessa Resolve Drifts con un ambito diverso: stesse regole, stessa delega, stesse esclusioni, e una sola risoluzione per volta sul progetto. Senza delega automatica, Resolve Drifts conserva il flusso attuale: un round di domande, una Proposal di risoluzione da approvare e Task da avviare a mano. Una domanda saltata lascia il Drift fuori dalla risoluzione e aperto. Mentre l'agente di risoluzione lavora, le schede dei Drift che ha raccolto restano in Blocked segnate come in risoluzione.

Il developer può delegare la scelta dei Drift non critici oppure di tutti i Drift, inclusi quelli critici. La delega sceglie sempre la prima correzione raccomandata già presente nel Drift: prepara una risoluzione aggregata, la consegna, la approva e fa eseguire le correzioni e le origini ancora da completare. Non sceglie autonomamente di adeguare il Modello al codice né prende lavoro estraneo.

Prima di cominciare una raccolta automatica devono essere finiti tutti gli scan e i Run lanciati da Trama sul progetto, in qualunque finestra. Una sola risoluzione opera sul progetto. I Drift sono raccolti quando l'istruzione parte davvero; scan avviati dopo non interrompono quella raccolta, e i loro Drift aspettano la successiva. Anche dopo le correzioni e la ripresa delle origini si possono trovare nuovi Drift: finché ci sono casi ammissibili, la delega continua, senza un limite aggiuntivo di cicli. Un Drift ricorrente, seguito di uno già risolto, non è mai ammissibile: una correzione che riproduce la stessa differenza, o ne crea una nuova realizzando il suo Task, si ferma al developer invece di far ripartire il ciclo.

Un'approvazione non avvia più nessuno scan. Ogni Run, anche quello automatico delle correzioni, comincia con un pre-flight che confronta il codice dove i suoi Task stanno per lavorare, e può finire con la scansione mirata di fine corsa: entrambi sono parte del Run e la barriera li aspetta con lui. Un pre-flight fallito o interrotto è registrato come uno scan fallito: non sospende la delega e il Run parte lo stesso.

Resolve Drifts applica sempre la delega corrente. Con delega ai soli non critici, i critici e le eccezioni seguono un flusso manuale separato; se il developer avvia una raccolta mista, questi casi vengono affrontati prima degli automatici. La risoluzione manuale e la sua approvazione non avviano automaticamente i loro Task. Senza un clic, l'automatismo tratta i casi ammissibili senza aprire domande sui critici esclusi. Un caso senza correzione raccomandata o fallito può richiedere domande manuali anche con delega totale; non si inventa una scelta e non si saltano i controlli.

I Run e la preparazione delle risoluzioni continuano a escludersi a vicenda. Una risoluzione ancora in scrittura o aperta impedisce un'altra raccolta. Design, import e nuove scansioni possono partire come prima; una nuova scansione non sospende il lavoro già avviato. La fine di un lavoro segue il suo terminale o la sua conversazione, mai una quiete o un timer. Uno scan conta come finito quando finisce il suo lavoro, con qualunque esito: un controllo fallito o un agente chiuso o interrotto prima del controllo non fermano la delega.

La delega è verificata prima di ogni scelta, approvazione e nuovo Run. Ritirarla impedisce nuovi passi automatici, ma il Task già iniziato può concludersi. I risultati già approvati non sono annullati. Un caso fallito non viene riprovato dal ciclo successivo: serve una richiesta esplicita, una modifica del Drift o uno scan avviato dal developer. Gli altri casi indipendenti possono proseguire. Uno scan fallito, o finito senza un controllo riuscito, non sospende la delega: conta come finito e la raccolta procede come dopo uno scan riuscito.

Il coordinamento riguarda solo lavori lanciati da Trama, anche fra più finestre dello stesso progetto; non segue agenti avviati fuori da Trama. Riaprire l'editor perde il ricordo dei lavori: i file restano, ma la delega non riparte subito sui Drift esistenti. Serve la fine di uno scan, con qualunque esito, o una richiesta esplicita. I Run manuali conservano le loro regole.

## States

### Free (initial)
Nessun Run e nessun agente di risoluzione è in corso. La delega può iniziare una raccolta soltanto se è stata resa nuovamente operativa dopo l'apertura dell'editor, non ci sono scan in corso, esiste almeno un Drift ammissibile e nessuna risoluzione aspetta una decisione. Se ci sono soltanto critici esclusi, Drift ricorrenti o casi falliti, non parte nulla da solo.
- `developer.ASK_AGENT` → Running tasks: un Run manuale parte davvero; valgono le regole dei Task.
- `developer.ASK_AGENT` → Resolving: Resolve Drifts parte davvero, con Resolve all su tutti i Drift aperti o con Resolve sul solo Drift scelto, ancora aperto e fuori da ogni risoluzione, con Drift da raccogliere e nessuna risoluzione da decidere. Rende operativa la delega che aspettava la ripresa dopo l'apertura dell'editor; applica la modalità corrente ai Drift raccolti e, con casi misti, prepara prima il gruppo manuale. Una parte automatica aspetta comunque gli scan già in corso.
- `developer.ASK_AGENT` → In attesa delle scansioni: parte davvero uno scan del progetto e la delega è attiva.
- `workspace.MODEL_CHANGED` → Resolving: la delega operativa trova Drift ammissibili, nessuno scan o Run è in corso e non c'è una risoluzione da decidere; una sola istruzione automatica parte per il progetto e fotografa i Drift ammissibili.
- `COLLECTION_STARTED` → Resolving: dopo la fine di tutti gli scan e Run, una raccolta automatica autorizzata parte davvero. Vale anche per la rivalutazione dopo un Run o una decisione manuale, senza richiedere un altro cambiamento ai file.
- `SCAN_BARRIER_CLEARED` → Resolving: gli scan già in corso sono tutti terminati, con qualunque esito, non ci sono Run né risoluzioni da decidere e una raccolta ammissibile parte davvero.
- `SCAN_BARRIER_CLEARED` → Free: gli scan sono terminati e rendono operativa la delega, ma nessuna raccolta deve partire.
- `developer.SET_DRIFT_AUTOPILOT` → Free: cambia la delega. Ritirarla impedisce nuovi passi; attivarla non supera la ripresa richiesta dopo l'apertura dell'editor. Se è già operativa, il progetto viene rivalutato per una nuova raccolta.

### In attesa delle scansioni
La delega aspetta che finiscano tutti gli scan già lanciati sul progetto. Gli scan che partono durante l'attesa si aggiungono alla stessa raccolta. Nessun Drift viene scelto automaticamente prima della barriera.
- `developer.ASK_AGENT` → Running tasks: parte un Run manuale; la raccolta automatica aspetta anche questo, con il suo pre-flight e il suo eventuale scan di fine corsa.
- `developer.ASK_AGENT` → Resolving: Resolve Drifts può affrontare soltanto i casi manuali mentre gli scan continuano. I casi automatici restano in attesa.
- `agent.FINISH_CHECK` → In attesa delle scansioni: lo scan dichiara il suo esito, riuscito o fallito; si aspetta ancora la fine del suo lavoro e degli altri scan e Run. Un esito fallito non sospende la delega.
- `SCAN_BARRIER_CLEARED` → Resolving: tutti gli scan sono terminati, con qualunque esito, nessun Run è in corso e una raccolta automatica ammissibile parte davvero.
- `SCAN_BARRIER_CLEARED` → Free: tutti gli scan sono terminati, con qualunque esito, ma non si può o non serve avviare una raccolta.
- `developer.SET_DRIFT_AUTOPILOT` → Free: il developer ritira la delega; gli scan continuano, senza nuove scelte automatiche.

### Running tasks
Almeno un Run è in corso. Resolve Drifts e nuove raccolte automatiche aspettano; altri Run manuali seguono le regole esistenti. Un Run automatico prende soltanto le correzioni della propria risoluzione e le loro origini ancora da completare, rispettando i blocchi e senza riprendere origini già finite. Se un Task fallisce, non viene ritentato; prosegue il lavoro indipendente. Una correzione chiusa senza modifiche, perché il codice faceva già ciò che dice il Model, non è un caso fallito: è un esito riuscito, la sua origine diventa eseguibile come dopo ogni correzione finita e il ciclo prosegue. Una sequenza di Run per modello, di Run all o del Run automatico (vedi il Task), conta come un solo Run: la fine di un suo Run che lascia partire il successivo non è la fine dell'ultimo Run. Una correzione sta sempre nel gruppo della sua origine, perché appartiene alla stessa Proposal, o a nessuna come lei.

Alla fine di ogni Run lanciato da Trama (un Task, Run all, il Run automatico), qualunque cosa lo concluda e anche quando non ha realizzato nessun Task, Trama guarda i Task del suo ambito che erano eseguibili al lancio: se qualcuno di loro è in To do e bloccato, da un Drift o in attesa del Task che corregge il suo Drift, l'editor mostra un avviso che li nomina, ciascuno con ciò che lo blocca, e offre di aprire la Board. Così un Task fermato durante il Run non resta indietro senza che il developer lo sappia, anche quando il terminale del Run si è già chiuso. Una sequenza di Run per modello dà un solo avviso, alla sua fine. Se nessun Task è rimasto bloccato, non compare nulla. L'avviso non avvia nulla: quando il blocco cade, il Task torna eseguibile e lo avvia il developer, come sempre.
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
- `agent.FINISH_CHECK` → Running tasks: è riuscito il pre-flight o lo scan di fine corsa, ma il Run non è ancora finito; nessuna nuova raccolta parte prima della sua fine.
- `agent.FINISH_CHECK` → Running tasks: il pre-flight dichiara esito fallito; è registrato come uno scan fallito, la delega non è sospesa e il Run parte lo stesso sui suoi Task non bloccati.
- `agent.FINISH_CHECK` → Running tasks: il controllo finale dichiara esito fallito; il Run continua soltanto sui casi indipendenti e la prosecuzione automatica compromessa resta ferma. Le nuove raccolte, dopo la fine del Run, non sono sospese.
- `developer.SET_DRIFT_AUTOPILOT` → Running tasks: cambia la delega; nessun nuovo Task automatico inizia senza essere ancora autorizzato. Il Task già iniziato non viene interrotto forzatamente.

### Resolving
Un solo agente prepara una risoluzione manuale o automatica del progetto. Nessun Run parte prima che quell'agente abbia finito. La parte manuale chiede decisioni e viene consegnata al developer; una domanda saltata resta fuori. La parte automatica contiene soltanto le prime correzioni raccomandate di Drift ancora ammissibili. Un caso non valido resta fuori e richiede intervento, senza impedire la consegna degli altri casi indipendenti. Una raccolta vuota non crea una risoluzione.
- `proposal.SUBMITTED` → Resolving: se è la risoluzione automatica della raccolta corrente e tutte le sue scelte sono ancora autorizzate e valide, viene concessa la sua approvazione automatica. Una risoluzione manuale aspetta invece il developer. Un'approvazione non applicabile conserva la Proposal aperta e segnala l'intervento richiesto.
- `proposal.APPROVED` → Resolving: la risoluzione automatica crea le correzioni; il Run attende la fine dell'agente che l'ha preparata. Una risoluzione manuale non avvia Run automatici.
- `agent-hook.IDLE` → Running tasks: l'agente della risoluzione ha finito e parte davvero il Run automatico ancora autorizzato delle sue correzioni e origini. Uno scan avviato dopo la raccolta e ancora in corso non trattiene il Run: i suoi Drift passano al ciclo successivo.
- `terminal.COMMAND_ENDED` → Running tasks: l'agente della risoluzione ha finito, con le stesse condizioni; una fine anomala non vale come autorizzazione di risultati incompleti.
- `editor-chat.AGENT_STOPPED` → Running tasks: il turno della risoluzione è finito e il Run automatico parte davvero, con le stesse condizioni.
- `agent-hook.IDLE` → Free: l'agente della risoluzione ha finito senza avviare un Run automatico e non ci sono scan attivi. Una Proposal consegnata ma non decisa continua a impedire nuove raccolte.
- `terminal.COMMAND_ENDED` → Free: è finito il comando della risoluzione, alle stesse condizioni.
- `terminal.CLOSED` → Free: è stato chiuso il terminale della risoluzione, alle stesse condizioni; nessun nuovo Run parte da una chiusura o interruzione.
- `editor-chat.AGENT_STOPPED` → Free: è finito il turno della risoluzione, alle stesse condizioni.
- `editor-chat.AGENT_INTERRUPTED` → Free: è stato interrotto il turno della risoluzione, alle stesse condizioni; nessun nuovo Run parte dall'interruzione.
- `editor-chat.CONVERSATION_CLOSED` → Free: è stata chiusa la conversazione della risoluzione, alle stesse condizioni.
- `agent-hook.IDLE` → In attesa delle scansioni: la risoluzione termina senza avviare un Run automatico e uno scan è ancora in corso, con delega attiva.
- `terminal.COMMAND_ENDED` → In attesa delle scansioni: la risoluzione termina, alle stesse condizioni.
- `terminal.CLOSED` → In attesa delle scansioni: la risoluzione viene chiusa, alle stesse condizioni.
- `editor-chat.AGENT_STOPPED` → In attesa delle scansioni: termina il turno della risoluzione, alle stesse condizioni.
- `editor-chat.AGENT_INTERRUPTED` → In attesa delle scansioni: viene interrotto il turno della risoluzione, alle stesse condizioni.
- `editor-chat.CONVERSATION_CLOSED` → In attesa delle scansioni: viene chiusa la conversazione della risoluzione, alle stesse condizioni.
- `developer.SET_DRIFT_AUTOPILOT` → Resolving: la nuova delega vale prima della prossima scelta o approvazione. Ritirarla lascia la Proposal da esaminare e impedisce il Run automatico; non annulla le decisioni già applicate.
- `agent.FINISH_CHECK` → Resolving: uno scan avviato dopo la raccolta dichiara il suo esito, riuscito o fallito; la raccolta corrente prosegue e le successive non sono sospese.

## Events

### COLLECTION_STARTED
Una raccolta automatica di Drift parte davvero verso l'agente scelto, dopo la barriera iniziale e con un unico responsabile del progetto. Può aprire un terminale come un Resolve Drifts manuale.

### AUTOMATIC_APPROVAL_GRANTED
Una risoluzione automatica consegnata della raccolta corrente è ancora autorizzata e ha superato tutti i controlli ordinari; Trama può approvarla per la delega del developer. Non autorizza una Proposal ordinaria, un import, una risoluzione manuale né modifiche al Modello.

### AUTOMATIC_RUN_STARTED
Dopo la fine dell'agente di risoluzione parte davvero il Run autorizzato delle sole correzioni approvate e delle loro origini ancora da completare. Può aprire un nuovo terminale; non riusa quello della risoluzione.

### SCAN_BARRIER_CLEARED
L'ultimo scan del progetto termina, con qualunque esito, e nessun altro scan resta in corso. Una dichiarazione di controllo, riuscito o fallito, da sola non emette questo fatto: serve la fine del lavoro dello scan.
