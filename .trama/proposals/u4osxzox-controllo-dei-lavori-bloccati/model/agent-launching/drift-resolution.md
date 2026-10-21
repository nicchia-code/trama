# Drift resolution

La risoluzione porta un Drift aperto a una decisione del developer. Il developer la chiede dalla Board con Resolve, sulla scheda rossa di un Drift in Backlog, che raccoglie soltanto quel Drift. Resolve Drifts fa un round di domande, consegna una Proposal di risoluzione da approvare, e i Task che ne nascono si avviano a mano. Una sola risoluzione per volta sul progetto, salvo quelle nate da una domanda pronta (sotto). Una domanda saltata lascia il Drift fuori dalla risoluzione e aperto. Mentre l'agente di risoluzione lavora, la scheda del Drift che ha raccolto resta in Backlog segnata come in risoluzione. Non c'è un modo di risolvere insieme dalla Board tutti i Drift aperti, e nessuna risoluzione parte, si approva o fa partire i suoi Task da sola: ogni decisione su un Drift resta del developer.

I Drift sono raccolti quando l'istruzione parte davvero. Un'approvazione non avvia nessuno scan e nessun Run.

I Run e la preparazione delle risoluzioni si escludono a vicenda. Una risoluzione ancora in scrittura o aperta impedisce un altro Resolve, tranne una risoluzione nata da una domanda pronta, che non ne impedisce nessuno. Design, import e nuove scansioni possono partire come prima; una nuova scansione non sospende il lavoro già avviato. La fine di un lavoro segue il suo terminale o la sua conversazione, oppure il controllo di esecuzione quando trova un fatto certo (vedi l'Actor time); mai una quiete o un timer di inattività.

Con l'Async Drift Resolver, una funzione sperimentale che il developer accende per tutti i progetti, un Drift può avere una domanda pronta (vedi il Drift): la domanda che Resolve Drifts gli farebbe, preparata alla fine del lavoro che lo ha archiviato. Resolve su un Drift con una domanda pronta ancora valida non lancia nessun agente: Trama apre subito quella domanda, come un round di una sola domanda (vedi il Question round), e dalla risposta scrive e consegna da sé la risoluzione, una Proposal da approvare o rifiutare come ogni risoluzione. Una risoluzione così non impedisce nessun altro Resolve, e nessuna risoluzione in attesa impedisce il Resolve di un Drift con domanda pronta: il developer può rispondere a più Drift di fila e decidere le schede gialle dopo. Solo quando la risposta va interpretata, o quando la risoluzione scritta da Trama non passa i controlli della consegna, Trama lancia l'agente di risoluzione con la risposta già data, che non rifà la domanda. Con la funzione spenta, o senza una domanda pronta valida, Resolve lancia l'agente come sempre.

Ogni finestra dell'editor tiene conto soltanto dei lavori che ha lanciato lei: un Run o una risoluzione lanciati da un'altra finestra dello stesso progetto, o da un agente avviato fuori da Trama, non contano. Riaprire l'editor perde il ricordo dei lavori; i file restano.

## States

### Free (initial)
Nessun Run, nessun agente di risoluzione e nessuna domanda pronta aperta è in corso.
- `developer.ASK_AGENT` → Running tasks: un Run manuale parte davvero; valgono le regole dei Task.
- `developer.ASK_AGENT` → Answering a prepared question: Resolve sul solo Drift scelto, ancora aperto e fuori da ogni risoluzione, con l'Async Drift Resolver acceso e una domanda pronta ancora valida per quel Drift, anche quando altre risoluzioni aspettano una decisione. Nessun agente parte: Trama apre subito la domanda pronta.
- `developer.ASK_AGENT` → Resolving: Resolve Drifts parte davvero con Resolve sul solo Drift scelto, ancora aperto e fuori da ogni risoluzione, senza una domanda pronta valida o con l'Async Drift Resolver spento, quando nessuna risoluzione aspetta una decisione, se non quelle nate da una domanda pronta.

### Running tasks
Almeno un Run è in corso. Resolve aspetta, anche su un Drift con una domanda pronta; altri Run manuali seguono le regole esistenti. Una sequenza di Run per modello lanciata da Run all (vedi il Task) conta come un solo Run: la fine di un suo Run che lascia partire il successivo non è la fine dell'ultimo Run.
- `agent-hook.IDLE` → Free: termina l'ultimo Run.
- `terminal.COMMAND_ENDED` → Free: termina l'ultimo Run; una fine anomala conserva i risultati.
- `terminal.CLOSED` → Free: viene chiuso l'ultimo Run.
- `editor-chat.AGENT_STOPPED` → Free: termina il turno dell'ultimo Run.
- `editor-chat.AGENT_INTERRUPTED` → Free: viene interrotto l'ultimo Run.
- `editor-chat.CONVERSATION_CLOSED` → Free: viene chiusa la conversazione dell'ultimo Run.
- `time.CHECK_DUE` → Free: il controllo di esecuzione chiude l'ultimo Run: il suo agente di omp non c'è più (vedi l'Agent terminal), oppure nella chat il Run non si è legato a nessuna conversazione entro il primo controllo fatto almeno un minuto dopo l'invio, e finisce come se non fosse mai partito. È una fine anomala: una sequenza di Run all si ferma senza lanciare altri Run. In cima alla Board l'avviso dice che Trama ha smesso di seguire quel Run e perché.

### Answering a prepared question
Il developer risponde alla domanda pronta del Drift scelto; nessun agente lavora. Conta come una risoluzione in corso: nessun Run parte, nessun altro Resolve parte e Dismiss Drift è indisponibile finché la domanda è aperta.
- `question-round.ROUND_CLOSED` → Free: il developer ha scelto una Fix option, con o senza testo libero, che ne diventa la nota; oppure ha scelto, senza testo libero, di chiudere senza cambiare nulla o di tenere il comportamento che il codice ha già. Trama scrive da sé la risoluzione con quella decisione, con le modifiche della Proposal allegata al Drift quando la decisione è di adeguare il Modello, e la consegna; la scheda gialla compare subito in Backlog.
- `question-round.ROUND_CLOSED` → Resolving: il developer ha scritto un testo libero insieme a un'opzione che non è una Fix option, oppure la risoluzione scritta da Trama non ha passato i controlli della consegna (per esempio perché la Proposal allegata non si applica più al Modello di adesso), e l'istruzione parte davvero. Trama lancia l'agente di risoluzione su quel Drift con la risposta già data; l'agente non rifà la domanda e scrive la risoluzione da quella risposta.
- `question-round.ROUND_CLOSED` → Free: la risposta richiedeva l'agente ma l'istruzione non parte davvero (lasciata pronta nella chat o negli appunti). Nessuna risoluzione nasce, il Drift resta aperto con la sua domanda pronta.
- `question-round.ROUND_CLOSED` → Free: il developer ha saltato la domanda. Nessuna risoluzione nasce; il Drift resta aperto e la sua domanda resta pronta per il prossimo Resolve.
- `editor.DISCONNECTED` → Free: la finestra che mostrava la domanda è persa. Non si scrive nulla; il Drift resta aperto con la sua domanda pronta.

### Resolving
Un solo agente prepara la risoluzione del Drift raccolto. Nessun Run parte prima che quell'agente abbia finito. Chiede le decisioni al developer e consegna la risoluzione al developer; una domanda saltata lascia il Drift fuori. Una raccolta vuota non crea una risoluzione. Quando parte dopo la risposta a una domanda pronta non chiede nulla: usa quella risposta, e la risoluzione che consegna è nata da una domanda pronta.
- `agent-hook.IDLE` → Free: l'agente della risoluzione ha finito. Una Proposal consegnata ma non decisa continua a impedire un altro Resolve, se non è nata da una domanda pronta.
- `terminal.COMMAND_ENDED` → Free: è finito il comando della risoluzione.
- `terminal.CLOSED` → Free: è stato chiuso il terminale della risoluzione; nessun Run parte da una chiusura.
- `editor-chat.AGENT_STOPPED` → Free: è finito il turno della risoluzione.
- `editor-chat.AGENT_INTERRUPTED` → Free: è stato interrotto il turno della risoluzione; nessun Run parte dall'interruzione.
- `editor-chat.CONVERSATION_CLOSED` → Free: è stata chiusa la conversazione della risoluzione.
- `time.CHECK_DUE` → Free: il controllo di esecuzione chiude il lavoro della risoluzione, alle stesse condizioni dei Run; nessun Run parte da questa fine, e l'avviso compare come per un Run.

## Events

### PREPARED_RESOLUTION_WRITTEN
Emesso quando Trama, dalla risposta a una domanda pronta, ha scritto da sé la risoluzione di quel Drift come Draft e la consegna, senza agente.
