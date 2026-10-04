# Design request

Una richiesta di design scritta: un documento Markdown in cui il developer descrive con calma il cambiamento che vuole, con il comportamento, i casi limite e i Requisiti che ha già in mente, invece della riga singola della richiesta rapida. Nasce quando il developer chiede un design con Design…, da uno dei pulsanti del pannello o dalla palette dei comandi, e vive finché l'agente non ne ha fatto una Proposal.

La richiesta è un file del progetto fin dal primo momento: Design… crea il file, vuoto e senza modello né sezioni suggerite, e lo apre in una scheda dell'editor. Il developer non deve mai scegliere dove salvarlo, e Trama lo salva da sé mentre lui scrive, così chiudere la scheda non chiede mai di salvare. Il titolo della richiesta è il suo primo titolo di primo livello oppure, se non ne ha, la sua prima riga non vuota.

Chiudere la scheda di una richiesta mai inviata è il gesto con cui la si invia; il pulsante Send to agent della scheda fa la stessa cosa in modo esplicito. Una richiesta parte una sola volta: per ripartire serve una richiesta nuova.

L'agente riceve sempre un'istruzione di una riga che nomina il file della richiesta, così il testo può essere lungo quanto serve, con qualunque launcher. La skill di design legge tutta la richiesta e intervista comunque il developer su ogni decisione, come per una richiesta rapida: la richiesta è il punto di partenza, non una risposta alle domande.

La richiesta rapida di una riga resta come prima, con Quick request, e non passa da questa Machine.

## States

### Writing (initial)
Il developer sta scrivendo la richiesta nella scheda che Trama ha aperto per questo. Il file esiste già nel progetto e Trama lo salva poco dopo ogni modifica. La scheda ha il pulsante Send to agent. Chiudere la finestra dell'editor non è chiudere la scheda: la richiesta resta su disco, mai inviata, e quando la sua scheda torna aperta, perché l'editor la ripristina o perché il developer la riapre dall'esploratore dei file, si comporta come prima.
- `developer.ASK_AGENT` → Sent: il developer preme Send to agent, il testo non è vuoto e l'istruzione parte davvero. Trama salva la richiesta, manda l'istruzione che la nomina verso l'agente, con il launcher scelto, come ogni richiesta di design (vedi l'Agent terminal), e chiude la scheda; con il launcher del terminale il fantasma sul Board prende il titolo della richiesta.
- `developer.ASK_AGENT` → Writing: il developer preme Send to agent ma il testo è vuoto o fatto solo di spazi, oppure l'istruzione non parte (per esempio perché il developer annulla la richiesta del comando dell'agente). Non si invia nulla e la scheda resta aperta; per un testo vuoto il developer è avvisato che deve prima scrivere la richiesta.
- `developer.CLOSE_REQUEST` → Sent: il developer chiude la scheda e il testo salvato non è vuoto. Parte la stessa istruzione di Send to agent, come se avesse premuto il pulsante, con il testo che è su disco.
- `developer.CLOSE_REQUEST` → Writing: il developer chiude la scheda di una richiesta con testo, ma l'istruzione non parte (per esempio perché annulla la richiesta del comando dell'agente). La scheda è chiusa e la richiesta resta su disco mai inviata, da riprendere dall'esploratore dei file.
- `developer.CLOSE_REQUEST` → Abandoned: il developer chiude la scheda e il testo salvato è vuoto o fatto solo di spazi. Trama cancella il file e non invia nulla.
- `workspace.REQUEST_DELETED` → Abandoned: il file è stato cancellato da fuori prima dell'invio. Trama non invia nulla e chiude la scheda, se è aperta e non ha modifiche non salvate.

### Sent
La richiesta è un file del progetto e l'agente l'ha ricevuta. Trama ricorda che è stata inviata anche dopo un riavvio dell'editor. Il developer può riaprirla dall'esploratore dei file e modificarla, e Trama continua a salvarla mentre scrive, ma la scheda non ha il pulsante Send to agent e chiuderla non invia nulla e non cancella nulla, anche se il testo è diventato vuoto; l'agente vede le modifiche solo se non ha ancora letto la richiesta. Una richiesta che nessuna Proposal consuma, per esempio perché l'agente si è fermato o il developer ha cambiato idea, resta come file finché il developer non la cancella. Il pannello non la mostra.
- `proposal.SUBMITTED` → Consumed: solo per la Proposal legata a questa richiesta. Trama cancella il file della richiesta; se la sua scheda è aperta e non ha modifiche non salvate la chiude, altrimenti la lascia all'editor.
- `workspace.REQUEST_DELETED` → Consumed: il file è stato cancellato da fuori; Trama chiude la scheda alle stesse condizioni e non fa nient'altro.

### Abandoned (final)
La richiesta è stata chiusa vuota o cancellata senza essere mai inviata. Il file non esiste più e Trama non ne tiene traccia.

### Consumed (final)
La richiesta non esiste più. Le Proposal che ne sono nate restano come sono.
