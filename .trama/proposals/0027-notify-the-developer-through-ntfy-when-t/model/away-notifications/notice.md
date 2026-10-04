# Notice

Un avviso al developer lontano dal computer, su una fermata dell'agente. Ce ne sono di due tipi: l'avviso su una domanda e l'avviso sulla fine del comando dell'agente. Un avviso non è né un Task né un Drift né una Proposal: non si decide, non si sposta e non compare sulla Board.

Un avviso nasce in Waiting, ma solo se il developer ha indicato un argomento ntfy nelle impostazioni dell'editor (altrimenti non nasce nulla) e solo per un agente che Trama ha avviato in un proprio terminale: con la chat dell'editor come launcher, o con un agente avviato dal developer per conto suo, non nasce nessun avviso. L'avviso su una domanda nasce quando un round di domande dell'agente di un terminale di Trama diventa quello presentato al developer, non quando è in coda: un solo avviso per round, qualunque numero di domande abbia. L'avviso sulla fine del comando nasce quando finisce il comando che Trama ha scritto nel terminale dell'agente, con la stessa regola di riconoscimento degli annunci: se il terminale non sa dire che quel comando è finito, non nasce nulla. La chiusura del terminale è una scelta del developer e non genera avvisi.

Ciò che l'avviso dice è deciso quando parte, non quando nasce. L'avviso su una domanda mostra la domanda che il developer ha davanti in quel momento, con le etichette delle sue opzioni e la posizione nel round. L'avviso sulla fine dice se il comando è finito bene o con un errore, quando il terminale lo riporta, e riassume la Board: quante cose attendono una decisione (Proposal non in scrittura e Drift aperti), quanti Task sono in To do e quanti in In progress.

Se l'argomento viene tolto o non è valido quando i dieci secondi scadono, l'avviso non parte. Se parte e il servizio ntfy non lo accetta, Trama riprova una sola volta dopo altri dieci secondi; se fallisce ancora, lo dice al developer nell'editor, una volta sola finché un invio non riesce di nuovo.

## States

### Waiting (initial)
Sono passati meno di dieci secondi dalla fermata. Il developer può ancora rispondere da solo.
- `time.NOTICE_DELAY_ELAPSED` → Sending: l'argomento ntfy c'è ancora ed è valido. Compone il testo con quanto vero in questo momento e lo manda al servizio.
- `time.NOTICE_DELAY_ELAPSED` → Not sent: l'argomento è stato tolto nel frattempo, oppure il suo valore non è valido. Nessuna richiesta di rete; se il valore non è valido, il developer lo viene a sapere con lo stesso avviso nell'editor usato per un invio fallito.
- `question-round.ROUND_CLOSED` → Cancelled: solo per l'avviso su una domanda e solo se è il round di questo avviso: il developer ha risposto o saltato tutto, oppure l'agente ha smesso di aspettare.
- `agent-terminal.INSTRUCTION_SENT` → Cancelled: solo per gli avvisi sulla fine del comando; tutti quelli in attesa, di qualunque terminale, sono annullati, perché il developer ha già rimesso al lavoro l'agente.

### Sending
L'avviso è in viaggio verso il servizio ntfy. Vale in entrambi i tentativi.
- `ntfy.DELIVERY_SUCCEEDED` → Delivered

#### First attempt (initial)
Il primo invio.
- `ntfy.DELIVERY_FAILED` → Retrying

#### Second attempt
Il secondo invio, dopo l'attesa.
- `ntfy.DELIVERY_FAILED` → Failed: avvisa il developer nell'editor che l'avviso non è partito e perché; l'avviso non viene ripetuto. Se un avviso precedente fallito ha già mostrato questo messaggio e da allora nessun invio è riuscito, non lo mostra di nuovo.

### Retrying
Il primo invio è fallito; l'avviso aspetta dieci secondi prima di riprovare.
- `time.RETRY_DELAY_ELAPSED` → Second attempt: l'argomento c'è ancora ed è valido.
- `time.RETRY_DELAY_ELAPSED` → Not sent: l'argomento è stato tolto nel frattempo, oppure il suo valore non è valido.

### Delivered (final)
Il servizio ha accettato l'avviso. Da qui il messaggio di errore dell'editor, se era stato mostrato, può essere mostrato di nuovo al prossimo fallimento.

### Not sent (final)
L'avviso non è partito perché l'argomento non c'era più o non era valido, quindi nessuna richiesta è stata fatta.

### Cancelled (final)
Il developer ha risposto entro i dieci secondi, quindi l'avviso non serve più.

### Failed (final)
Anche il secondo invio è fallito e il developer è stato avvisato nell'editor.
