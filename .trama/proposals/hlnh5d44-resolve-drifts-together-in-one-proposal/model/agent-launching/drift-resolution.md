# Drift resolution

Il pulsante Resolve Drifts e l'esclusione fra lui e i Run che realizzano i Task (Run all To do, il Run di un singolo Task e Run this design). Resolve Drifts manda l'agente a risolvere insieme tutti i Drift aperti al momento del clic: l'agente chiede al developer, con un round di domande, cosa deve succedere per ciascun Drift, e scrive una Proposal di risoluzione che porta tutte le decisioni (vedi il Drift e la Proposal), o più Proposal in catena quando i Drift sono tanti. Un Drift la cui domanda è saltata resta fuori dalla risoluzione e resta aperto.

Una risoluzione e un Run non lavorano mai insieme: mentre un Run lanciato da Trama non è finito Resolve Drifts non si può usare, e mentre l'agente di Resolve Drifts non ha finito non si può lanciare nessun Run. Scansioni, design e import non sono toccati. Resolve Drifts non si può usare nemmeno finché una Proposal di risoluzione aspetta una decisione, ancora in scrittura o aperta, e nemmeno quando non c'è nessun Drift aperto. Quando non si può usare il pulsante resta visibile ma disabilitato, e dice perché.

Un lavoro lanciato da Trama finisce quando finisce il comando che Trama ha scritto nel suo terminale, quando quel terminale è chiuso, oppure, con il launcher della chat, quando il turno dell'agente nella sua conversazione di Trama finisce, è interrotto o la conversazione è chiusa. Per un lavoro di cui Trama non può vedere la fine con certezza (una finestra del terminale esterno, che chiusa a mano non lo dice, un terminale che non segnala la fine dei comandi, la chat di un editor senza hook) vale anche la quiete: quindici minuti in cui l'agente non fa nulla che Trama veda, contati come per gli annunci e fermi mentre un round di domande è aperto.

Questa Machine vive nella finestra dell'editor: non è scritta nel progetto, e riaprire l'editor la riporta a Free. Conta solo ciò che Trama ha lanciato dai suoi pulsanti; un agente avviato dal developer senza Trama non la tocca.

## States

### Free (initial)
Nessun Run e nessuna risoluzione lanciati da Trama sono in corso. I Run seguono le loro regole (vedi il Task); Resolve Drifts si può usare se c'è almeno un Drift aperto e nessuna Proposal di risoluzione aspetta una decisione.
- `developer.ASK_AGENT` → Running tasks: solo per Run all To do, il Run di un Task o Run this design, e solo se l'istruzione è davvero inviata, nel terminale o nella chat.
- `developer.ASK_AGENT` → Resolving: solo per Resolve Drifts, solo se c'è almeno un Drift aperto e nessuna Proposal di risoluzione è ancora in scrittura o aperta, e solo se l'istruzione è davvero inviata. Altrimenti non parte nulla e il developer è avvisato del perché. L'istruzione copre tutti i Drift aperti in quel momento; con un launcher del terminale annuncia la Proposal di risoluzione, così la Board ne mostra subito il ghost (vedi Agent terminal).

### Running tasks
Almeno un Run lanciato da Trama non è finito. Resolve Drifts è disabilitato e un suo lancio è rifiutato, dicendo che un Run è in corso. Altri Run si possono lanciare secondo le loro regole, e ognuno è seguito per conto suo: la fine di un Run mentre un altro continua non cambia nulla.
- `terminal.COMMAND_ENDED` → Free: è finito il comando dell'ultimo Run ancora in corso.
- `terminal.CLOSED` → Free: è stato chiuso il terminale dell'ultimo Run ancora in corso.
- `cursor-chat.AGENT_STOPPED` → Free: è finito il turno della conversazione dell'ultimo Run ancora in corso.
- `cursor-chat.AGENT_INTERRUPTED` → Free: è stato interrotto il turno della conversazione dell'ultimo Run ancora in corso.
- `cursor-chat.CONVERSATION_CLOSED` → Free: è stata chiusa la conversazione dell'ultimo Run ancora in corso.
- `time.QUIET_PERIOD_ELAPSED` → Free: solo se ogni Run ancora in corso è uno di quelli di cui Trama non può vedere la fine con certezza; sono tutti considerati finiti.

### Resolving
L'agente di Resolve Drifts non ha finito. Run all To do, il Run di ogni Task e Run this design sono disabilitati e un loro lancio è rifiutato, dicendo che una risoluzione dei Drift è in corso; anche Resolve Drifts è disabilitato. Scansioni, design e import si lanciano come sempre.
- `terminal.COMMAND_ENDED` → Free: è finito il comando di Resolve Drifts. Se la Proposal di risoluzione è stata consegnata, i Run tornano liberi, mentre Resolve Drifts resta disabilitato finché quella Proposal non è decisa; se l'agente ha finito senza consegnarla, i Drift restano aperti e Resolve Drifts torna disponibile.
- `terminal.CLOSED` → Free: è stato chiuso il terminale di Resolve Drifts, con le stesse conseguenze.
- `cursor-chat.AGENT_STOPPED` → Free: è finito il turno della conversazione di Resolve Drifts, con le stesse conseguenze.
- `cursor-chat.AGENT_INTERRUPTED` → Free: è stato interrotto il turno della conversazione di Resolve Drifts, con le stesse conseguenze.
- `cursor-chat.CONVERSATION_CLOSED` → Free: è stata chiusa la conversazione di Resolve Drifts, con le stesse conseguenze.
- `time.QUIET_PERIOD_ELAPSED` → Free: solo se Trama non può vedere con certezza la fine dell'agente di Resolve Drifts; la risoluzione è considerata finita, con le stesse conseguenze.
