# omp Chat

La vista omp Chat, dove stanno la conversazione General (vedi omp Chat General) e le conversazioni dei lavori di Trama (vedi omp Chat conversation). Sta in un contenitore proprio della barra laterale secondaria, a destra. omp Chat è una funzione facoltativa del gruppo Advanced delle impostazioni di Trama, accesa per impostazione predefinita: resta accesa finché il developer non la spegne nelle sue impostazioni utente.

Ogni finestra dell'editor ha la sua vista, con la sua General e le conversazioni aperte in quella finestra. All'apertura della finestra la vista parte da Hidden e segue subito le impostazioni, General e le conversazioni riprese, come dicono le Transition. Con General presente, la sua scheda è sempre la prima; quella in vista all'apertura della finestra è General, salvo una conversazione di un lavoro ripresa, che si mostra come quando si apre.

Trama non apre e non chiude mai la barra laterale secondaria per mostrare la vista, salvo quando una conversazione di un lavoro si apre o si riprende (vedi omp Chat conversation), e non sposta mai la vista: il developer può spostarla dove vuole, e lì resta. General non apre mai la barra laterale da sé.

Ogni conversazione della vista, General, quelle dei lavori e Ask more, mostra sotto il campo del messaggio, accanto al suo selettore del modello, quanto il developer ha consumato dei limiti del suo abbonamento presso il fornitore del modello scelto in quella conversazione, finestra per finestra (per esempio le 5 ore e i 7 giorni), come omp li riporta. La barra è la stessa in ogni conversazione; cambiare il modello di una conversazione cambia subito la sua barra. Quando il fornitore del modello scelto non ha dati ma altri sì, resta solo un accesso all'uso, nello stesso posto, da cui il developer apre l'uso di ogni fornitore, che Trama chiede di nuovo a omp a ogni apertura. Prima del primo dato, o quando omp non ne dà nessuno, la barra non c'è e Trama non avvisa.

L'uso riguarda l'account del developer, non la conversazione: è uno per finestra, condiviso da tutte le schede, e pulire General, chiudere una conversazione o cambiare modello non lo azzera. Per non far partire omp a ripetizione, Trama chiede l'uso a omp quando una conversazione compare o è ripresa, General compresa, solo se la finestra non ne ha ancora nessuno e nessuna richiesta è in corso; alla fine del turno di un agente in qualunque conversazione, solo se l'ultima richiesta non è troppo recente; e sempre quando il developer apre l'uso di ogni fornitore. Lo chiede anche senza General, finché la vista ha una conversazione; una finestra senza nessuna conversazione non lo chiede.

## States

### Hidden (initial)
La vista non c'è: omp Chat è spenta, non c'è General e nessuna conversazione è aperta.
- `editor.SETTINGS_CHANGED` → Empty: omp Chat è accesa, anche all'apertura della finestra, e la finestra non ha una cartella aperta, quindi non ha General.
- `omp-chat-general.SHOWN` → With conversations: General compare, con omp Chat accesa in una finestra con una cartella; la vista mostra la sua scheda.
- `omp-chat-conversation.OPENED` → With conversations: una conversazione salvata è stata ripresa all'apertura della finestra, anche se nel frattempo omp Chat è stata spenta.

### Empty
La vista c'è, senza General e senza conversazioni, perché la finestra non ha una cartella aperta, con un testo che dice che i lavori di Trama con omp si apriranno lì.
- `omp-chat-conversation.OPENED` → With conversations: la vista mostra la scheda della conversazione nuova.
- `editor.SETTINGS_CHANGED` → Hidden: omp Chat è stata spenta.

### With conversations
La vista mostra una scheda per General, quando c'è, prima di tutte, e una per ogni conversazione aperta, con il nome del suo lavoro, nell'ordine di apertura, e la conversazione della scheda scelta.
- `omp-chat-conversation.OPENED` → With conversations: si aggiunge la scheda della conversazione nuova, dopo le altre, che diventa quella in vista.
- `omp-chat-conversation.CLOSED` → With conversations: restano General o altre conversazioni; se era quella in vista, la vista passa a una scheda vicina.
- `omp-chat-conversation.CLOSED` → Empty: era l'ultima, non c'è General e omp Chat è accesa.
- `omp-chat-conversation.CLOSED` → Hidden: era l'ultima, non c'è General e omp Chat è spenta.
- `omp-chat-general.SHOWN` → With conversations: General torna, per esempio perché omp Chat è stata riaccesa; la sua scheda si mette prima delle altre, senza cambiare quella in vista.
- `omp-chat-general.REMOVED` → With conversations: restano conversazioni dei lavori; se General era in vista, la vista passa alla prima scheda rimasta.
- `omp-chat-general.REMOVED` → Hidden: non resta nessuna conversazione.
- `editor.SETTINGS_CHANGED` → With conversations: omp Chat è stata spenta mentre delle conversazioni dei lavori sono aperte. Le conversazioni continuano il loro lavoro e la vista resta finché l'ultima non è chiusa; le istruzioni nuove vanno al terminale di omp. Ciò che succede a General lo dice omp Chat General.
