---
description: "Usa per invio, contenuto e consumo delle richieste di design scritte."
---
# Regole delle richieste di design

## design-request
- Il titolo di una richiesta scritta è il testo del primo titolo `#` di primo livello fuori dai blocchi di codice, senza i `#` e gli spazi attorno; se non c'è, la prima riga non vuota, senza spazi attorno. Il titolo serve solo al fantasma con un agente del terminale: il nome del file non dipende dal testo.
- Un testo è vuoto quando, tolti gli spazi e gli a capo, non resta nulla. Send to agent su un testo vuoto non invia, non chiude la scheda e mostra l'avviso «Trama: write the design request before sending it.». Chiudere la scheda di una richiesta mai inviata con il testo vuoto su disco cancella il file senza avvisi.
- Chiudendo la scheda, il testo inviato è quello su disco in quel momento: se l'editor ha chiesto di salvare e il developer ha rifiutato, vale l'ultima versione salvata, e se questa è vuota la richiesta è cancellata.
- Il testo è salvato esattamente come il developer l'ha scritto: Trama non aggiunge front matter, titoli o sezioni e non lo riformatta.
- Una richiesta è inviata al più una volta: solo il primo invio che parte davvero la segna come inviata. Un invio che non parte (per esempio l'istruzione finisce negli appunti perché la chat non la accetta) non la segna, e la richiesta resta in Writing. Con un agente del terminale l'invio fa un annuncio, come ogni richiesta di design.
- Solo la prima Proposal aperta dall'agente per una richiesta è legata a essa. Le Proposal che la seguono con `--requires` non sono legate. Legare una Proposal a una richiesta che non esiste non impedisce di crearla: il risultato dice solo che la richiesta non è stata trovata, e la Proposal non è legata a nulla.
- La consegna riuscita di una Proposal legata cancella il file della richiesta, se esiste ancora. Una consegna rifiutata non cancella nulla. Se il file è già sparito la consegna non fallisce. Se più Proposal sono legate alla stessa richiesta, la prima consegna la consuma; le altre consegnano normalmente.
- Chiudere la scheda dopo la cancellazione: solo se il documento non ha modifiche non salvate; con modifiche non salvate la scheda resta, e quello che il developer ne fa è affare dell'editor.
- La skill `trama-design`, ricevuta una richiesta scritta, legge tutto il file prima di esplorare il Model. Il contenuto è il punto di partenza dell'intervista, che resta completa: ogni decisione della richiesta è comunque presentata come domanda con le sue opzioni, mettendo come raccomandazione quella che la richiesta indica. Se il file non esiste più, la skill lo dice al developer e si ferma, senza aprire nessuna Proposal.
