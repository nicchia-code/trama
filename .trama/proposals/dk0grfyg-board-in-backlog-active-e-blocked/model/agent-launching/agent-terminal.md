# Agent terminal

Un terminale integrato dell'editor in cui Trama avvia il comando dell'agente del developer. Trama ne apre uno nuovo per ogni istruzione che manda a un agente del terminale e non lo riusa mai: scrivere un comando in un terminale dove un agente sta ancora lavorando glielo manderebbe come messaggio, e un terminale a riposo ha già fatto il suo lavoro. Questa Machine descrive un singolo terminale, dall'apertura alla chiusura.

Il developer sceglie l'agente una volta, per tutti i progetti, con `trama.agent`: la chat dell'editor, che è la scelta predefinita (la chat di Copilot in VS Code, la chat di Cursor in Cursor), oppure omp o Claude Code, che lavorano in un terminale integrato. Con la chat l'istruzione va in una nuova conversazione dell'agente e questa Machine non entra in gioco. Con omp o Claude Code `trama.terminalLocation` dice dove si apre il terminale: nell'area dei terminali, che è la scelta predefinita, o in una scheda dell'editor. La scelta vale per ogni istruzione, import compreso, e in ogni progetto, anche appena inizializzato, con il Modello vuoto e con il pannello Trama mai aperto in quella finestra: un progetto nuovo non ha un agente suo. Non c'è nessuna domanda al primo avvio: senza una scelta vale la chat. Non ci sono altri agenti del terminale, nessun comando personalizzato e nessun terminale esterno all'editor.

Un terminale nasce in Agent running quando Trama manda un'istruzione a omp o Claude Code: per `developer.ASK_AGENT` (design, scansione, implementazione, Resolve Drifts, import), se l'istruzione parte davvero (una richiesta di design lasciata vuota non manda nulla). Un'approvazione non apre nessun terminale: dopo `proposal.APPROVED` non parte nessuna scansione. Trama apre il terminale nella cartella del progetto, con il nome del lavoro affidato, con il contrassegno dell'agente e con un'identità propria, così che ciò che l'agente annuncia da lì sia riconosciuto come suo, e vi scrive il comando dell'agente con l'istruzione e con l'hook di Trama (vedi l'Actor agent-hook). Il pre-flight di un Run e la sua scansione di fine corsa avvengono nel terminale del Run, senza aprirne un altro. Ogni istruzione porta anche il limite dei sotto-agenti insieme, `trama.maxParallelAgents` (vedi Agent launching).

Un terminale nasce allo stesso modo quando Drift resolution emette `COLLECTION_STARTED` per preparare una risoluzione automatica oppure `AUTOMATIC_RUN_STARTED` per realizzare le correzioni e le origini autorizzate. Ogni passo usa un terminale nuovo, con il ruolo del lavoro affidato; anche in chat valgono gli stessi confini di consegna, senza lanciare nulla se l'istruzione resta soltanto pronta o negli appunti.

Con la scheda dell'editor tutto ciò che vale per il terminale nell'area vale anche per lei: fine del comando, hook, annunci, avvisi, Task presi e round di domande si comportano allo stesso modo. Chiudere la scheda chiude il terminale. Quando Trama apre la scheda, la affianca alle schede già aperte nel gruppo attivo, senza mai creare un gruppo nuovo, e la porta in primo piano in quel gruppo ma non le dà il focus: il developer continua a scrivere dove stava.

Un terminale dell'agente non prende mai il focus, qualunque cosa lo avvii: un pulsante del developer o un passo automatico della delega dei Drift. Il terminale nell'area dei terminali parte senza mostrarsi: l'area non si apre e non cambia il terminale che il developer sta guardando, e il developer lo apre a mano quando vuole vedere l'agente. La scheda si mostra come detto sopra, sempre senza focus: diventa la scheda visibile del gruppo attivo, anche quando lì c'era il pannello Trama, e il developer torna alla scheda di prima cliccandola.

Ogni terminale porta il nome del lavoro che gli è affidato: il numero breve del Task quando l'istruzione implementa un solo Task, altrimenti un'etichetta per il tipo di lavoro (design, scansione, tutti i Task, risoluzione dei Drift, import). Così il developer riconosce a colpo d'occhio cosa fa ogni terminale. Il nome non cambia più dopo l'apertura.

Nella chat l'agente riceve l'istruzione e la chat la invia da sola, senza che il developer debba fare altro. In Cursor, se la chat non lo permette, l'istruzione resta pronta nella chat e aspetta la conferma e l'Invio del developer, oppure, se nemmeno questo è possibile (per esempio il testo è rifiutato da Cursor), va negli appunti e il developer è avvisato di incollarla. In VS Code, se la chat di Copilot non accetta l'istruzione, va negli appunti con lo stesso avviso. Non c'è mai un fallimento silenzioso. Cursor ha anche un'altra interfaccia per gli agenti, la finestra degli agenti: Trama non la usa, perché il pannello vive nell'editor.

Nella chat l'agente non trova da solo il programma `trama`: l'istruzione gli dice dove si trova.

Only the command Trama typed into a terminal counts as the agent's command: its start and end are what move this Machine. Another command that starts or ends in the same terminal, such as a shell start-up command or one the developer types, does not.

When the developer has chosen a language in the editor settings, every instruction Trama sends to the agent, in the chat or in the terminal and whether it comes from a button or from the Drift autopilot, also asks the agent to write in that language everything it generates, except code, which is always English. With no language chosen the instruction asks nothing about language. The choice only reaches agents that Trama starts; it changes nothing in text that already exists.

Ogni istruzione che Trama manda all'agente, nel terminale o nella chat, lo avvia sul modello del ruolo che corrisponde al lavoro (vedi Agent launching): analisi per design, import e Resolve Drifts, scansione per le scansioni, esecuzione per realizzare i Task. Quando l'agente lo permette, anche i sotto-agenti ricevono il modello del loro ruolo: quello di scansione ai sotto-agenti che confrontano le Machine. Un ruolo vuoto lascia all'agente il suo modello predefinito. Nella chat di Cursor il modello vale solo per la conversazione nuova; se l'istruzione ripiega sulla conferma o sugli appunti, parte senza modello e senza altri avvisi. Nella chat di Copilot il modello resta anche nel selettore della chat; se nessun modello di Copilot ha il nome scritto nel ruolo, l'istruzione parte lo stesso, sul modello del selettore, e il developer è avvisato del nome non trovato.

Una richiesta di design, e allo stesso modo Resolve Drifts, annuncia una Proposal (vedi l'Announcement) appena è inviata a un terminale, perché l'agente ne creerà una; l'annuncio appartiene a quel terminale. Con la chat nulla è annunciato da Trama: la Board mostra un ghost dal momento in cui l'agente comincia la Draft della Proposal.

La raccolta automatica annuncia la propria Proposal come Resolve Drifts. Il suo agente la scrive e la consegna; non la approva di propria iniziativa. Trama verifica la delega prima dell'approvazione e prima di avviare il Run successivo.

Con `trama.autoExit`, che è acceso per impostazione predefinita, Trama chiude il terminale appena l'agente va a riposo o il suo comando finisce: l'agente che aspettava il prossimo prompt è terminato con il terminale, e la conversazione e il suo ultimo resoconto spariscono con lui, mentre le schede che ha archiviato restano sulla Board. Chi vuole continuare a parlare con l'agente nel suo terminale spegne `trama.autoExit`: allora il terminale resta aperto, a riposo, finché il developer non lo chiude, e ogni istruzione successiva ne apre comunque uno nuovo.

## States

### Agent running (initial)
Il comando che Trama ha scritto nel terminale non è finito e l'agente non ha ancora detto di essere a riposo. Il Run, gli annunci e i Task presi di questo terminale sono in corso (vedi Drift resolution, l'Announcement e il Task).
- `agent-hook.IDLE` → Closed: con `trama.autoExit` acceso. L'agente ha concluso il lavoro; Trama chiude il terminale, e con lui l'agente che aspettava il prossimo prompt. La fine del Run, il rilascio dei Task presi e il ritiro degli annunci di questo terminale seguono l'hook (vedi Drift resolution, il Task e l'Announcement); la chiusura che segue non li tocca una seconda volta.
- `agent-hook.IDLE` → Agent idle: con `trama.autoExit` spento. L'agente ha concluso il lavoro ma il suo comando non è finito: aspetta il prossimo prompt del developer. Finiscono il Run, i Task presi e gli annunci di questo terminale come sopra.
- `terminal.COMMAND_ENDED` → Closed: con `trama.autoExit` acceso, solo per la fine del comando che Trama ha scritto nel terminale: l'agente è uscito senza che l'hook dicesse prima di essere a riposo (interrotto, in errore o ucciso). Trama chiude il terminale; Run, Task presi e annunci di questo terminale finiscono con la fine del comando.
- `terminal.COMMAND_ENDED` → Agent idle: con `trama.autoExit` spento, alle stesse condizioni; il terminale resta aperto con la shell.
- `terminal.CLOSED` → Closed: il developer o l'agente ha chiuso il terminale mentre l'agente lavorava; Run, Task presi e annunci di questo terminale finiscono con la chiusura.

### Agent idle
Il terminale è aperto e nessun agente vi lavora più per Trama. Trama non lo riusa e non segue più ciò che vi succede: se il developer scrive un prompt a mano e l'agente riprende, un nuovo hook a riposo o la fine del comando non cambiano nulla qui, e ciò che l'agente archivia da lì arriva sulla Board come ogni altra scheda.
- `terminal.CLOSED` → Closed: il developer o l'agente ha chiuso il terminale.

### Closed (final)
Il terminale non esiste più.
