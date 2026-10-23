# Advisor della chat

L'Advisor Scanner nella chat di Cursor (vedi Agent launching). Cursor non ha un advisor come quello di omp, quindi l'advisor della chat è di Trama: il sotto-agente di Cursor `trama-advisor`, sul modello di scansione, che confronta il codice letto e scritto con il Task, il Modello e i Requisiti. Un hook di Cursor non può avviare un sotto-agente da sé: Trama chiede all'agente di avviarlo, attraverso gli hook della chat (vedi l'Actor editor-chat), nei momenti in cui Cursor glielo permette. Trama non chiama mai un modello: la revisione la fa sempre `trama-advisor`.

Questa Machine descrive un agente guardato dall'advisor, dal suo inizio alla sua fine: l'agente principale di una conversazione a cui Trama ha mandato un Run con l'Advisor Scanner attivo, oppure un sotto-agente di quella conversazione che realizza un Task, che ha la sua revisione come con omp ogni sotto-agente ha il suo advisor. L'agente principale nasce in Al lavoro quando la conversazione del Run è legata al suo lavoro; un sotto-agente quando porta un Task in In progress. Non esiste in design, scan, import o Resolve Drifts, né con omp, dove lavora l'advisor di omp.

Le revisioni sono di tre tipi. La revisione continua guarda le modifiche mentre l'agente lavora, senza fermarlo, come l'advisor di omp: ogni round è un `trama-advisor` che l'agente avvia in background quando Trama glielo chiede, che legge i file cambiati e la parte della conversazione dell'agente scritta dall'ultimo round, e il cui esito, con le sue note, Cursor consegna da solo all'agente quando il round finisce. L'agente non aspetta mai un round e non ne controlla l'avanzamento. Ce n'è al più uno alla volta per agente, e il successivo copre tutte le modifiche arrivate nel frattempo, così una corsa non accumula sotto-agenti. La revisione del Task, quando il sotto-agente di un Task ha finito, e la revisione finale, quando l'agente principale sta per concludere la corsa, rivedono invece tutto il lavoro, controllano che le note dei round siano state corrette, e l'agente ne aspetta l'esito; ognuna si ripete finché è pulita, al più tre volte. Sono le sole attese, come con omp. Con una versione di Cursor che non consegna all'agente il testo aggiunto al risultato di uno strumento, i round non partono e nessuno lo avvisa: le modifiche non ancora riviste entrano nella revisione del Task o in quella finale.

Quando `trama-advisor` trova che il codice scritto dal Task si allontana da ciò che chiedono il Task, il Modello o i Requisiti, lo dice all'agente con le note, e l'agente lo corregge prima di portare il Task in Done. Quando la differenza sta nel codice che c'era già, fuori dal lavoro del Task, la archivia lui come Drift, come l'advisor di omp (vedi il Drift). Trama conserva le note dei round soltanto nella memoria dell'editor, per riportarle nella revisione del Task o finale: non sono informazione del progetto e si perdono se l'editor riparte.

Per ora l'avviso del Run finito senza la revisione finale non si mostra: Trama lo prepara come sempre, ma la Board non lo disegna (vedi il Panel).

## States

### Al lavoro (initial)
L'agente realizza i Task; nessuna revisione che l'agente aspetta è in corso.
- `editor-chat.TURN_FINISHING` → Revisione finale: solo per l'agente principale. Trama continua il turno chiedendo all'agente di far rivedere a `trama-advisor` la corsa intera e di aspettarne l'esito; la revisione copre anche le note dei round e le modifiche non ancora riviste, e un round in corso non conta più: se il suo esito arriva dopo, l'agente lo ignora e Trama ne dimentica le note. Il turno non finisce, quindi Task presi, annunci e lavoro restano.
- `editor-chat.SUBAGENT_STOPPED` → Revisione del Task: solo per un sotto-agente che realizza un Task. Trama gli risponde chiedendogli di far rivedere il suo Task a `trama-advisor` e di aspettarne l'esito prima di restituire il risultato; la revisione copre anche le note dei suoi round e le modifiche non ancora riviste, e un suo round in corso non conta più: se il suo esito arriva dopo, il sotto-agente lo ignora e Trama ne dimentica le note.
- `editor-chat.AGENT_STOPPED` → Finita senza revisione finale: solo per l'agente principale; il turno è finito senza che Trama potesse continuarlo, per esempio perché l'hook non ha raggiunto l'editor in tempo. Il Run finisce come ogni Run nella chat, e Trama prepara l'avviso che il Run è finito senza la revisione finale dell'Advisor, con il motivo.
- `editor-chat.AGENT_STOPPED` → Finita: per un sotto-agente, la conversazione che lo ha lanciato ha concluso il turno.
- `editor-chat.AGENT_INTERRUPTED` → Finita senza revisione finale: solo per l'agente principale; il Run è stato interrotto o è andato in errore prima della revisione finale. Trama prepara l'avviso come sopra.
- `editor-chat.AGENT_INTERRUPTED` → Finita: per un sotto-agente, la conversazione che lo ha lanciato è stata interrotta.
- `editor-chat.SUBAGENT_INTERRUPTED` → Finita: solo per quel sotto-agente; il Run continua senza la sua revisione.
- `editor-chat.CONVERSATION_CLOSED` → Finita: il developer ha chiuso la conversazione di sua scelta, quindi nessun avviso.

#### In ascolto (initial)
Nessun round di revisione continua in corso.
- `editor-chat.FILES_CHANGED` → In revisione: Trama chiede all'agente, con il risultato dello strumento che ha cambiato i file, di avviare `trama-advisor` in background sui file cambiati dall'ultimo round e sulla parte della sua conversazione scritta da allora; l'agente continua senza aspettarlo e senza controllarlo.

#### In revisione
Un round di `trama-advisor` in background rivede le modifiche, mentre l'agente continua a lavorare.
- `editor-chat.FILES_CHANGED` → In revisione: non parte un secondo round; i file cambiati si aggiungono al prossimo.
- `agent.ADVISOR_REVIEWED` → In ascolto: nessun file è cambiato nel frattempo. Se l'esito ha delle note, Cursor le consegna all'agente come risultato del round, e l'agente corregge il codice del Task senza fermarsi; Trama le conserva per la revisione del Task o finale.
- `agent.ADVISOR_REVIEWED` → In revisione: dei file sono cambiati nel frattempo; le note, se ci sono, arrivano all'agente come sopra, e Trama chiede, con il risultato del prossimo strumento dell'agente, un nuovo round in background che copre quei file e la conversazione scritta dall'ultimo round.

### Revisione del Task
Il sotto-agente aspetta l'esito di `trama-advisor` sul suo Task intero.
- `agent.ADVISOR_REVIEWED` → Finita: l'esito è pulito; il sotto-agente restituisce il suo risultato.
- `agent.ADVISOR_REVIEWED` → Correzione del Task: l'esito ha delle note; il sotto-agente corregge il codice del Task prima di finire.
- `editor-chat.SUBAGENT_STOPPED` → Revisione del Task: il sotto-agente ha finito senza aspettare l'esito; Trama gli chiede di nuovo la revisione, se non gliel'ha già chiesta tre volte per questo Task.
- `editor-chat.SUBAGENT_STOPPED` → Finita: come sopra, dopo la terza richiesta; Trama non lo fa più continuare.
- `editor-chat.SUBAGENT_INTERRUPTED` → Finita: il sotto-agente è stato fermato o è andato in errore.
- `editor-chat.AGENT_INTERRUPTED` → Finita: la conversazione che lo ha lanciato è stata interrotta.
- `editor-chat.CONVERSATION_CLOSED` → Finita: nessun avviso.

### Correzione del Task
Il sotto-agente corregge il codice del Task secondo le note; le modifiche che fa qui non hanno una revisione continua, perché le rivede la prossima revisione del Task.
- `editor-chat.SUBAGENT_STOPPED` → Revisione del Task: il Task ha avuto meno di tre revisioni; Trama chiede una nuova revisione del Task.
- `editor-chat.SUBAGENT_STOPPED` → Finita: dopo la terza revisione del Task; Trama non lo fa più continuare e il sotto-agente restituisce il suo risultato.
- `editor-chat.SUBAGENT_INTERRUPTED` → Finita: il sotto-agente è stato fermato o è andato in errore.
- `editor-chat.AGENT_INTERRUPTED` → Finita: la conversazione che lo ha lanciato è stata interrotta.
- `editor-chat.CONVERSATION_CLOSED` → Finita: nessun avviso.

### Revisione finale
L'agente principale aspetta l'esito di `trama-advisor` sulla corsa intera.
- `agent.ADVISOR_REVIEWED` → Finita: l'esito è pulito; l'agente conclude la corsa come sempre e la sua prossima fine di turno non è continuata.
- `agent.ADVISOR_REVIEWED` → Correzione finale: l'esito ha delle note; l'agente corregge prima di concludere.
- `editor-chat.TURN_FINISHING` → Revisione finale: l'agente ha concluso il turno senza aspettare l'esito; Trama continua di nuovo il turno con la revisione finale, se non l'ha già chiesta tre volte.
- `editor-chat.TURN_FINISHING` → Finita senza revisione finale: come sopra, dopo la terza richiesta; Trama non continua il turno, il Run finisce come sempre e Trama prepara l'avviso della revisione finale mancata.
- `editor-chat.AGENT_STOPPED` → Finita senza revisione finale: il turno è finito senza l'esito e senza che Trama potesse continuarlo; Trama prepara l'avviso della revisione finale mancata.
- `editor-chat.AGENT_INTERRUPTED` → Finita senza revisione finale: il developer ha interrotto la revisione, o la corsa è andata in errore; Trama prepara l'avviso della revisione finale mancata.
- `editor-chat.CONVERSATION_CLOSED` → Finita: nessun avviso.

### Correzione finale
L'agente principale corregge secondo le note della revisione finale.
- `editor-chat.TURN_FINISHING` → Revisione finale: la corsa ha avuto meno di tre revisioni finali; Trama continua il turno con una nuova revisione finale.
- `editor-chat.TURN_FINISHING` → Finita: dopo la terza revisione finale; Trama non continua il turno e il Run finisce come sempre.
- `editor-chat.AGENT_STOPPED` → Finita: il turno è finito senza che Trama potesse continuarlo; la corsa ha comunque avuto la sua revisione finale, quindi nessun avviso.
- `editor-chat.AGENT_INTERRUPTED` → Finita: nessun avviso, per la stessa ragione.
- `editor-chat.CONVERSATION_CLOSED` → Finita: nessun avviso.

### Finita (final)
L'advisor non guarda più questo agente. Le note conservate dei suoi round sono dimenticate.

### Finita senza revisione finale (final)
Il Run è finito senza un esito della revisione finale; Trama ne ha preparato l'avviso.
