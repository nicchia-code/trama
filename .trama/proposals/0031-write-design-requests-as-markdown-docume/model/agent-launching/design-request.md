# Design request

Una richiesta di design scritta: un documento Markdown in cui il developer descrive con calma il cambiamento che vuole, con il comportamento, i casi limite e i Requisiti che ha già in mente, invece della riga singola della richiesta rapida. Nasce quando il developer chiede un design con Design…, da uno dei pulsanti del pannello o dalla palette dei comandi, e vive finché l'agente non ne ha fatto una Proposal.

Il documento parte vuoto, senza modello né sezioni suggerite. Il titolo della richiesta è il suo primo titolo di primo livello oppure, se non ne ha, la sua prima riga non vuota.

L'agente riceve sempre un'istruzione di una riga che nomina il file della richiesta, così il testo può essere lungo quanto serve, con qualunque launcher. La skill di design legge tutta la richiesta e intervista comunque il developer su ogni decisione, come per una richiesta rapida: la richiesta è il punto di partenza, non una risposta alle domande.

La richiesta rapida di una riga resta come prima, con Quick request, e non passa da questa Machine.

## States

### Writing (initial)
Il developer sta scrivendo la richiesta in una scheda dell'editor che Trama ha aperto per questo. Il documento non è ancora salvato da nessuna parte nel progetto. La scheda ha il pulsante Send to agent.
- `developer.ASK_AGENT` → Sent: il developer preme Send to agent e il testo non è vuoto. Trama salva il testo così com'è come nuovo file di richiesta del progetto, la scheda diventa quel file e l'istruzione che nomina la richiesta parte verso l'agente, con il launcher scelto, come ogni richiesta di design (vedi l'Agent terminal); con il launcher del terminale il fantasma sul Board prende il titolo della richiesta.
- `developer.ASK_AGENT` → Writing: il developer preme Send to agent ma il testo è vuoto o fatto solo di spazi. Non si salva e non si invia nulla, e il developer è avvisato che deve prima scrivere la richiesta.
- `developer.CLOSE_REQUEST` → Abandoned: l'editor si comporta come con ogni documento senza titolo e può chiedere di salvarlo; Trama non salva nulla e non invia nulla.

### Sent
La richiesta è un file del progetto e l'agente l'ha ricevuta almeno una volta. Il developer può riaprirla, correggerla e inviarla di nuovo quante volte vuole, anche se nel frattempo un agente ci sta già lavorando: ogni invio può far nascere un design. Una richiesta che nessuna Proposal consuma, per esempio perché l'agente si è fermato o il developer ha cambiato idea, resta come file finché il developer non la cancella. Il pannello non la mostra.
- `developer.ASK_AGENT` → Sent: il developer preme Send to agent sulla scheda del file. Le modifiche non salvate sono salvate prima, poi parte la stessa istruzione che nomina la richiesta. Un testo diventato vuoto non è inviato, come da Writing.
- `proposal.SUBMITTED` → Consumed: solo per la Proposal legata a questa richiesta. Trama cancella il file della richiesta; se la sua scheda è aperta e non ha modifiche non salvate la chiude, altrimenti la lascia all'editor.
- `workspace.REQUEST_DELETED` → Consumed: il file è stato cancellato da fuori; Trama non fa nulla.

### Abandoned (final)
Il documento è stato chiuso senza essere mai inviato. Trama non ne tiene traccia.

### Consumed (final)
La richiesta non esiste più. Le Proposal che ne sono nate restano come sono.
