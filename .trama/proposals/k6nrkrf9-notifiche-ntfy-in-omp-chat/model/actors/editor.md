# Editor

The editor window in which Trama presents a question round to the developer. È anche l'editor che conserva le impostazioni di Trama.

## Events

### DISCONNECTED
The editor serving a question round closes or becomes unreachable before the round is complete. Applies to every active or queued round assigned to that window, not to rounds belonging to other windows. Losing focus is not disconnection.

### SETTINGS_CHANGED
Le impostazioni di Trama cambiano nell'editor, da qualunque parte: dalla scheda Settings, dalle impostazioni dell'editor, da un file di impostazioni modificato a mano o sincronizzato. Riguarda solo le impostazioni di Trama.

### CURSOR_API_KEY_CHANGED
La chiave API di Cursor che Trama conserva nel portachiavi dell'editor è stata salvata, cambiata o tolta in un'altra finestra dell'editor dello stesso utente. Il portachiavi è condiviso da tutte le finestre, quindi la chiave nuova vale già per ogni omp che questa finestra avvia; la finestra in cui il developer l'ha cambiata non riceve l'Evento.

### NTFY_TOKEN_CHANGED
The ntfy access token that Trama keeps in the editor's keychain was saved, changed or removed in another editor window of the same user. The keychain is shared by every window, so the new token already applies to this window's next notification; the window in which the developer changed it does not receive the Event.

### WINDOW_CLOSED
La finestra dell'editor con il progetto si chiude o si ricarica, e con lei finiscono i processi che l'estensione vi aveva avviato, compresi quelli delle conversazioni di omp Chat. Riguarda solo ciò che appartiene a quella finestra.
