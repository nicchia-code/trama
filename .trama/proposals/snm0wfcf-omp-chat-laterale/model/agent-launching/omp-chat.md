# omp Chat

La vista omp Chat nella barra laterale secondaria dell'editor, dove stanno le conversazioni di omp Chat (vedi omp Chat conversation). omp Chat è una funzione facoltativa del gruppo Features delle impostazioni di Trama, spenta finché il developer non la accende nelle sue impostazioni utente, e vale solo quando `trama.agent` è omp: con la chat di Cursor non fa nulla, e la scheda Settings mostra il suo interruttore disabilitato, con la nota che vale solo con omp.

Ogni finestra dell'editor ha la sua vista, con le conversazioni aperte in quella finestra. All'apertura della finestra la vista parte da Hidden e segue subito le impostazioni e le conversazioni riprese, come dicono le Transition.

Trama non apre e non chiude mai la barra laterale secondaria per mostrare la vista, salvo quando una conversazione si apre o si riprende (vedi omp Chat conversation); il developer può spostare la vista dove vuole, e lì resta.

## States

### Hidden (initial)
La vista non c'è: omp Chat è spenta, oppure `trama.agent` è la chat di Cursor, e nessuna conversazione è aperta.
- `editor.SETTINGS_CHANGED` → Empty: omp Chat è accesa e `trama.agent` è omp, anche all'apertura della finestra.
- `omp-chat-conversation.OPENED` → With conversations: una conversazione salvata è stata ripresa all'apertura della finestra, anche se nel frattempo omp Chat è stata spenta.

### Empty
La vista c'è, senza conversazioni, con un testo che dice che i lavori di Trama con omp si apriranno lì.
- `omp-chat-conversation.OPENED` → With conversations: la vista mostra la scheda della conversazione nuova.
- `editor.SETTINGS_CHANGED` → Hidden: omp Chat è stata spenta, oppure `trama.agent` è passato alla chat di Cursor.

### With conversations
La vista mostra una scheda per ogni conversazione aperta, con il nome del suo lavoro, e la conversazione della scheda scelta.
- `omp-chat-conversation.OPENED` → With conversations: si aggiunge la scheda della conversazione nuova, che diventa quella in vista.
- `omp-chat-conversation.CLOSED` → With conversations: restano altre conversazioni; se era quella in vista, la vista passa a una scheda vicina.
- `omp-chat-conversation.CLOSED` → Empty: era l'ultima, e omp Chat è accesa con `trama.agent` su omp.
- `omp-chat-conversation.CLOSED` → Hidden: era l'ultima, e omp Chat è spenta oppure `trama.agent` è la chat di Cursor.
- `editor.SETTINGS_CHANGED` → With conversations: omp Chat è stata spenta, o `trama.agent` è passato alla chat di Cursor, mentre delle conversazioni sono aperte. Le conversazioni continuano il loro lavoro e la vista resta finché l'ultima non è chiusa; le istruzioni nuove vanno al terminale di omp o alla chat di Cursor.
