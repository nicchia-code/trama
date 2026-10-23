# omp Chat

La vista omp Chat, dove stanno le conversazioni di omp Chat (vedi omp Chat conversation). Sta in un contenitore proprio della barra laterale secondaria, a destra. omp Chat è una funzione facoltativa del gruppo Features delle impostazioni di Trama, accesa per impostazione predefinita: resta accesa finché il developer non la spegne nelle sue impostazioni utente.

Ogni finestra dell'editor ha la sua vista, con le conversazioni aperte in quella finestra. All'apertura della finestra la vista parte da Hidden e segue subito le impostazioni e le conversazioni riprese, come dicono le Transition.

Trama non apre e non chiude mai la barra laterale secondaria per mostrare la vista, salvo quando una conversazione si apre o si riprende (vedi omp Chat conversation), e non sposta mai la vista: il developer può spostarla dove vuole, e lì resta.

## States

### Hidden (initial)
La vista non c'è: omp Chat è spenta e nessuna conversazione è aperta.
- `editor.SETTINGS_CHANGED` → Empty: omp Chat è accesa, anche all'apertura della finestra.
- `omp-chat-conversation.OPENED` → With conversations: una conversazione salvata è stata ripresa all'apertura della finestra, anche se nel frattempo omp Chat è stata spenta.

### Empty
La vista c'è, senza conversazioni, con un testo che dice che i lavori di Trama con omp si apriranno lì.
- `omp-chat-conversation.OPENED` → With conversations: la vista mostra la scheda della conversazione nuova.
- `editor.SETTINGS_CHANGED` → Hidden: omp Chat è stata spenta.

### With conversations
La vista mostra una scheda per ogni conversazione aperta, con il nome del suo lavoro, e la conversazione della scheda scelta.
- `omp-chat-conversation.OPENED` → With conversations: si aggiunge la scheda della conversazione nuova, che diventa quella in vista.
- `omp-chat-conversation.CLOSED` → With conversations: restano altre conversazioni; se era quella in vista, la vista passa a una scheda vicina.
- `omp-chat-conversation.CLOSED` → Empty: era l'ultima, e omp Chat è accesa.
- `omp-chat-conversation.CLOSED` → Hidden: era l'ultima, e omp Chat è spenta.
- `editor.SETTINGS_CHANGED` → With conversations: omp Chat è stata spenta mentre delle conversazioni sono aperte. Le conversazioni continuano il loro lavoro e la vista resta finché l'ultima non è chiusa; le istruzioni nuove vanno al terminale di omp.
