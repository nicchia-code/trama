# Time

The passing of time, which no one in the System controls.

## Events

### QUIET_PERIOD_ELAPSED
Fifteen minutes passed since the agent last did anything about a card it announced: announcing a card, working on its Draft or filing a card. The period does not run while a question round is open. Per un Run o una risoluzione dei Drift (vedi Drift resolution) conta ogni comando di Trama con cui l'agente cambia qualcosa: annunci, Draft e decisioni sui Drift, schede archiviate, Task spostati. Per gli annunci e per i Run contano anche i comandi di Trama con cui l'agente legge soltanto (il Modello, i Requisiti, le schede, lo smistamento), ma solo quelli dell'agente che Trama riconosce: lanciati da un terminale che Trama ha avviato o dall'agente della chat di Cursor; un comando del developer nella sua shell non conta. Per un agente con un hook (omp) conta anche il segnale di vita del suo hook, ma solo per gli annunci, i Task presi e il Run del suo terminale; un altro terminale non ne è toccato.
