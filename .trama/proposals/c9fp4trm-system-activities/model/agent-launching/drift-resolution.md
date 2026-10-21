# Drift resolution

La risoluzione porta un Drift aperto a una decisione del developer. Il developer la chiede dalla Board con Resolve, sulla scheda rossa di un Drift in Backlog, che raccoglie soltanto quel Drift. Resolve Drifts fa un round di domande, consegna una Proposal di risoluzione da approvare, e i Task che ne nascono si avviano a mano. Una sola risoluzione per volta sul progetto. Una domanda saltata lascia il Drift fuori dalla risoluzione e aperto. Mentre l'agente di risoluzione lavora, la scheda del Drift che ha raccolto resta in Backlog segnata come in risoluzione. Non c'è un modo di risolvere insieme dalla Board tutti i Drift aperti, e nessuna risoluzione parte, si approva o fa partire i suoi Task da sola: ogni decisione su un Drift resta del developer.

I Drift sono raccolti quando l'istruzione parte davvero. Un'approvazione non avvia nessuno scan e nessun Run.

I Run e la preparazione delle risoluzioni si escludono a vicenda. Una risoluzione ancora in scrittura o aperta impedisce un altro Resolve. Design, import e nuove scansioni possono partire come prima; una nuova scansione non sospende il lavoro già avviato. La fine di un lavoro segue il suo terminale o la sua conversazione, mai una quiete o un timer.

Ogni finestra dell'editor tiene conto soltanto dei lavori che ha lanciato lei: un Run o una risoluzione lanciati da un'altra finestra dello stesso progetto, o da un agente avviato fuori da Trama, non contano. Riaprire l'editor perde il ricordo dei lavori; i file restano.

## States

### Free (initial)
Nessun Run e nessun agente di risoluzione è in corso.
- `developer.ASK_AGENT` → Running tasks: un Run manuale parte davvero; valgono le regole dei Task.
- `developer.ASK_AGENT` → Resolving: Resolve Drifts parte davvero con Resolve sul solo Drift scelto, ancora aperto e fuori da ogni risoluzione, quando nessuna risoluzione aspetta una decisione.

### Running tasks
Almeno un Run è in corso. Resolve aspetta; altri Run manuali seguono le regole esistenti. Una sequenza di Run per modello lanciata da Run all (vedi il Task) conta come un solo Run: la fine di un suo Run che lascia partire il successivo non è la fine dell'ultimo Run.
- `agent-hook.IDLE` → Free: termina l'ultimo Run.
- `terminal.COMMAND_ENDED` → Free: termina l'ultimo Run; una fine anomala conserva i risultati.
- `terminal.CLOSED` → Free: viene chiuso l'ultimo Run.
- `editor-chat.AGENT_STOPPED` → Free: termina il turno dell'ultimo Run.
- `editor-chat.AGENT_INTERRUPTED` → Free: viene interrotto l'ultimo Run.
- `editor-chat.CONVERSATION_CLOSED` → Free: viene chiusa la conversazione dell'ultimo Run.

### Resolving
Un solo agente prepara la risoluzione del Drift raccolto. Nessun Run parte prima che quell'agente abbia finito. Chiede le decisioni al developer e consegna la risoluzione al developer; una domanda saltata lascia il Drift fuori. Una raccolta vuota non crea una risoluzione.
- `agent-hook.IDLE` → Free: l'agente della risoluzione ha finito. Una Proposal consegnata ma non decisa continua a impedire un altro Resolve.
- `terminal.COMMAND_ENDED` → Free: è finito il comando della risoluzione.
- `terminal.CLOSED` → Free: è stato chiuso il terminale della risoluzione; nessun Run parte da una chiusura.
- `editor-chat.AGENT_STOPPED` → Free: è finito il turno della risoluzione.
- `editor-chat.AGENT_INTERRUPTED` → Free: è stato interrotto il turno della risoluzione; nessun Run parte dall'interruzione.
- `editor-chat.CONVERSATION_CLOSED` → Free: è stata chiusa la conversazione della risoluzione.
