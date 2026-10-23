# Editor

The editor window in which Trama presents a question round to the developer. È anche l'editor che conserva le impostazioni di Trama.

## Events

### DISCONNECTED
The editor serving a question round closes or becomes unreachable before the round is complete. Applies to every active or queued round assigned to that window, not to rounds belonging to other windows. Losing focus is not disconnection.

### SETTINGS_CHANGED
Le impostazioni di Trama cambiano nell'editor, da qualunque parte: dalla scheda Settings, dalle impostazioni dell'editor, da un file di impostazioni modificato a mano o sincronizzato. Riguarda solo le impostazioni di Trama.

### WINDOW_CLOSED
La finestra dell'editor con il progetto si chiude o si ricarica, e con lei finiscono i processi che l'estensione vi aveva avviato, compresi quelli delle conversazioni di omp Chat. Riguarda solo ciò che appartiene a quella finestra.
