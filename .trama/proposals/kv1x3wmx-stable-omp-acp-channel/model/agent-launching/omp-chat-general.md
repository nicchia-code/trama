# omp Chat General

La conversazione General di omp Chat: una chat per ragionare con omp, sempre presente nella vista omp Chat di ogni finestra che ha una cartella aperta, mentre omp Chat è in uso (vedi omp Chat). È uno strumento di brainstorming: il developer vi esplora idee, problemi e alternative sul progetto e su Trama, e l'agente ragiona con lui, legge ciò che serve e fa domande nella chat, ma non parte da solo con nessun lavoro. Scrive qualcosa (una Proposal, un Task tolto, una correzione, un commit) solo quando il developer glielo ordina esplicitamente, per esempio per un lavoro piccolo e di fiducia come «committa il codice». Ogni finestra ha la sua General, nella sua cartella.

General non ha hook né skill di un lavoro e non le arriva nessuna delle frasi delle istruzioni dei lavori, ma ha una sua istruzione di Trama: dice all'agente che General è la chat di Trama nell'editor, uno strumento di brainstorming in cui ragiona con il developer sul progetto e su Trama; che legge liberamente ciò che serve; che non scrive nulla, né in Trama né nei file del progetto, se il developer non lo ordina esplicitamente, e che un desiderio, un problema o un'idea non sono un ordine; che quando il ragionamento arriva a qualcosa da mettere per iscritto lo dice in una riga e aspetta; e che non modifica mai a mano la cartella di Trama. L'istruzione non è un messaggio: l'agente la riceve all'avvio, General resta vuota finché il developer non scrive e l'istruzione non compare nella conversazione. Quando omp non permette di dargliela all'avvio, Trama la unisce invece al primo messaggio del developer, segnata come istruzione e distinta dal messaggio, e di nuovo al primo messaggio dopo ogni pulizia; anche allora la conversazione mostra soltanto il messaggio del developer. General parte con il modello del ruolo di analisi, segue l'approvazione e l'Intent Tracing di omp Chat come le altre conversazioni (vedi omp Chat conversation) e ha il selettore del modello, che vale solo per lei e torna al ruolo quando General si pulisce. Quando l'agente chiede qualcosa con lo strumento di domande di omp, la domanda compare in General come un modulo, come nelle altre conversazioni senza hook.

General non è un lavoro di Trama: non ha un ghost né un annuncio al lancio, non tiene in corso il controllo di esecuzione, non conta per l'esclusione fra i Run né per Resolve Drifts e non è mai rifiutata per un altro lavoro in corso. Il suo processo ha però il contrassegno dell'agente e un'identità propria, della stessa forma di quella di un terminale o di una conversazione di un lavoro, così la riga di comando di Trama la riconosce e ciò che l'agente annuncia o archivia da lì, quando il developer glielo chiede, arriva sulla Board come suo e i suoi round di domande sono legati a General: le schede che consegna non aspettano la fine del turno, perché senza hook Trama non riconosce la fine di un turno, e gli annunci ancora in attesa si ritirano, con l'avviso di mancata consegna, quando il suo processo finisce o General si pulisce.

La scheda di General è sempre la prima della vista e non si sposta. Al posto della chiusura ha la pulizia: chiudere la scheda di General la pulisce, cioè ferma il suo agente, scarta la conversazione e la sua sessione, lascia la scheda vuota e fa partire subito un omp nuovo. Vuota, General mostra un testo che dice che lì si parla con omp nella cartella e che i lavori di Trama si aprono nelle loro schede. General non apre mai da sé la barra laterale secondaria e non prende mai il focus: la vista si mostra solo quando il developer la apre o quando si apre un lavoro.

Un problema di omp non lascia mai General senza scheda e non apre mai un terminale né un avviso dell'editor: il motivo compare dentro la conversazione, con le ultime righe che omp ha scritto sul suo output di errore, e Trama riprova solo quando il developer manda il messaggio seguente. Come per le altre conversazioni, l'avvio ha un solo limite di tempo per tutta l'apertura, la ripresa compresa, una connessione chiusa vale come un omp uscito da solo, e quando Trama ferma il processo di General (pulizia, spegnimento, chiusura) ferma prima il turno e chiude la sessione, poi termina omp con ogni comando che omp ha avviato.

Sotto il campo del messaggio, accanto al selettore del modello, General mostra quanto il developer ha consumato dei limiti del suo abbonamento presso il fornitore del modello scelto in General, finestra per finestra (per esempio le 5 ore e i 7 giorni), come omp li riporta. Trama chiede l'uso a omp quando General compare e dopo ogni turno di un agente in qualunque conversazione di omp Chat della finestra; prima del primo dato, o quando omp non ne dà nessuno, non mostra nulla e non avvisa. Quando il fornitore del modello scelto non ha dati ma altri sì, resta solo un accesso all'uso, nello stesso posto. Il developer può aprire da lì l'uso di ogni fornitore, che Trama chiede di nuovo a omp a ogni apertura. L'uso riguarda l'account del developer, non la conversazione: pulire General o cambiare modello non lo azzera.

## States

### Absent (initial)
In questa finestra non c'è General: omp Chat non è in uso, oppure la finestra non ha una cartella aperta.
- `editor.SETTINGS_CHANGED` → Starting: omp Chat è in uso e la finestra ha una cartella aperta, anche all'apertura della finestra, senza una General salvata da riprendere. Trama avvia omp per General, che compare nella vista come prima scheda, vuota.

### Starting
Il processo di omp di General parte e apre una sessione nuova. La scheda c'è già: vuota con il suo testo, oppure con la storia di prima quando una sessione chiusa da sola non si è riaperta. Il developer può già scrivere: un messaggio mandato ora aspetta che la sessione sia aperta.
- `omp-acp.SESSION_STARTED` → Ready: la sessione è aperta; il messaggio in attesa, se c'è, parte ora.
- `omp-acp.START_FAILED` → Stopped: il motivo compare in fondo alla conversazione; quando omp manca, la conversazione lo dice con Install omp. Il messaggio in attesa, se c'è, torna nel campo per riprovare.
- `developer.CLEAR_GENERAL` → Starting: Trama ferma l'avvio, scarta la conversazione e fa partire un omp nuovo, vuoto.
- `editor.SETTINGS_CHANGED` → Absent: omp Chat è stata spenta. Trama ferma il processo e General sparisce dalla vista.
- `editor.WINDOW_CLOSED` → Absent: la finestra si chiude o si ricarica prima che la sessione sia aperta. Non c'è nulla da riprendere: alla riapertura General parte di nuovo, vuota.

### Ready
Il processo esiste e la sessione è aperta: il developer parla con l'agente, che può essere fermo o in un turno per un suo messaggio.
- `developer.SEND_CHAT_MESSAGE` → Ready: il messaggio va all'agente; mentre l'agente è in un turno segue la scelta fra Steer e Queue, come nelle altre conversazioni: con Steer gli arriva subito senza fermarlo, con Queue quando finirebbe il turno.
- `developer.STOP_CHAT_AGENT` → Ready: il turno dell'agente si interrompe; General resta com'è.
- `developer.CLEAR_GENERAL` → Starting: dopo la conferma quando l'agente è in un turno, subito quando è fermo. Trama ferma il processo, scarta la conversazione e la sua sessione e ritira gli annunci ancora in attesa dell'agente; la scheda resta, vuota, e un omp nuovo parte subito.
- `omp-acp.EXITED` → Stopped: il processo è finito da solo. Il motivo compare in fondo alla conversazione, la storia resta visibile e gli annunci ancora in attesa dell'agente si ritirano. Trama non riprova da sé.
- `editor.SETTINGS_CHANGED` → Absent: omp Chat è stata spenta mentre l'agente è fermo. Trama ferma il processo e scarta la conversazione; General sparisce dalla vista.
- `editor.SETTINGS_CHANGED` → Kept after switch-off: omp Chat è stata spenta mentre l'agente è in un turno. General resta, con il suo agente al lavoro.
- `editor.WINDOW_CLOSED` → Waiting for the window: la finestra si chiude o si ricarica e il processo finisce con lei. Trama conserva la sessione di General per riprenderla.

### Stopped
General non ha un processo: omp non è partito o si è chiuso da solo. La conversazione mostra la sua storia, se ce n'è, e in fondo il motivo; il developer può scrivere.
- `developer.SEND_CHAT_MESSAGE` → Resuming: il processo di prima si era chiuso da solo con una sessione aperta. Trama avvia un omp nuovo che riapre quella sessione; il messaggio aspetta.
- `developer.SEND_CHAT_MESSAGE` → Starting: General non aveva una sessione, perché omp non era partito o mancava. Trama avvia un omp nuovo con una sessione nuova; il messaggio aspetta.
- `developer.CLEAR_GENERAL` → Starting: senza conferma. Trama scarta la conversazione e la sua sessione e fa partire subito un omp nuovo, vuoto.
- `editor.SETTINGS_CHANGED` → Absent: omp Chat è stata spenta; General sparisce dalla vista.
- `editor.WINDOW_CLOSED` → Waiting for the window: General aveva una sessione; Trama la conserva per riprenderla.
- `editor.WINDOW_CLOSED` → Absent: General non aveva una sessione; alla riapertura parte di nuovo, vuota.

### Resuming
Un omp nuovo riapre la sessione di General dopo che il precedente si era chiuso da solo; il messaggio del developer aspetta.
- `omp-acp.SESSION_RESUMED` → Ready: la sessione si è riaperta e l'agente ricorda la conversazione; il messaggio in attesa parte ora.
- `omp-acp.SESSION_NOT_RESUMED` → Starting: la sessione non si riapre. Trama avvia una sessione nuova; la storia di prima resta visibile sopra, ma l'agente non la conosce, e il messaggio aspetta la sessione nuova.
- `developer.CLEAR_GENERAL` → Starting: Trama ferma la ripresa, scarta la conversazione e fa partire un omp nuovo, vuoto.
- `editor.SETTINGS_CHANGED` → Absent: omp Chat è stata spenta; General sparisce dalla vista.
- `editor.WINDOW_CLOSED` → Waiting for the window: Trama conserva la sessione per riprenderla alla riapertura.

### Waiting for the window
La finestra si è chiusa o ricaricata e il processo di General non c'è più; Trama conserva la sua sessione. Quando una finestra riapre la stessa cartella, Trama riapre la sessione in un processo nuovo, con le stesse opzioni.
- `omp-acp.SESSION_RESUMED` → Ready: General torna nella vista, prima scheda, con la sua storia, e aspetta il developer anche se l'agente era in un turno: Trama non gli manda nessun messaggio di ripresa.
- `omp-acp.SESSION_NOT_RESUMED` → Starting: General riparte vuota, con una sessione nuova, senza avvisi sulla Board.
- `editor.SETTINGS_CHANGED` → Absent: alla riapertura omp Chat non è in uso. Trama scarta la sessione conservata.

### Kept after switch-off
omp Chat è stata spenta mentre l'agente di General era in un turno. General resta nella vista finché il developer non la chiude: la sua scheda ora la chiude invece di pulirla, e il developer può continuare a scrivere.
- `developer.SEND_CHAT_MESSAGE` → Kept after switch-off: il messaggio va all'agente come in Ready, con la stessa scelta fra Steer e Queue.
- `developer.STOP_CHAT_AGENT` → Kept after switch-off: il turno dell'agente si interrompe; General resta.
- `developer.CLOSE_CHAT_CONVERSATION` → Absent: con la conferma se l'agente è in un turno, senza se è fermo. Trama ferma il processo e scarta la conversazione; General sparisce dalla vista.
- `omp-acp.EXITED` → Absent: il processo è finito da solo; General sparisce dalla vista.
- `editor.SETTINGS_CHANGED` → Ready: omp Chat è tornata in uso. General torna com'era, con la scheda che la pulisce.
- `editor.WINDOW_CLOSED` → Absent: la finestra si chiude o si ricarica; General non si riprende.

## Events

### SHOWN
General compare nella vista omp Chat della finestra: quando lascia Absent, e quando torna, ripresa o ripartita, alla riapertura della finestra.

### REMOVED
General arriva in Absent e sparisce dalla vista omp Chat della finestra.
