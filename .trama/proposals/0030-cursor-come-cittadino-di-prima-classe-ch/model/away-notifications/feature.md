# Away notifications

Come Trama avvisa il developer che si è allontanato dal computer. Se il developer ha indicato un argomento ntfy nelle impostazioni dell'editor, Trama gli manda una notifica ogni volta che l'agente che Trama ha avviato, in un terminale o in una conversazione della chat di Cursor, si ferma e aspetta lui: quando un round di domande resta senza risposta, e quando il comando dell'agente termina (nella chat di Cursor, quando l'agente conclude il turno), per esempio perché ha finito tutti i Task, si è fermato a un Drift, ha consegnato una Proposal o è andato in errore. Senza argomento Trama non manda nulla e non cambia niente.

L'avviso parte solo dopo dieci secondi senza che il developer abbia risposto: se risponde alla domanda, o avvia subito un'altra istruzione per l'agente, non c'è nessuna notifica. Funziona con il launcher del terminale e con la chat di Cursor: con la chat di un altro editor, e con un agente che il developer avvia per conto suo, Trama non manda nessun avviso, né sulle domande né sulla fine. Se la finestra dell'editor si chiude, o il computer va in sospensione, nessun avviso parte. Un avviso che non riesce a partire non disturba il lavoro dell'agente: Trama riprova una volta e poi lo dice al developer nell'editor.

L'avviso non cambia nulla nel Model, nelle Proposal, nei Task o nei Drift: serve solo a far sapere al developer che tocca a lui.
