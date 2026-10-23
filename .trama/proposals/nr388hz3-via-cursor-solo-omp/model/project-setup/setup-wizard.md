# Setup wizard

Il wizard che guida il developer, a passi, a mettere Trama in una cartella e a scegliere le impostazioni principali di Trama, per poi confermare tutto insieme da un riepilogo. Nulla si salva e nulla si crea prima di quella conferma: chiudere il pannello o annullare a metà non lascia tracce. Ogni passo parte dai valori attuali delle impostazioni utente del developer, così chi ha già configurato Trama deve solo andare avanti.

Il wizard ha tre modi, che differiscono per i passi che mostra e per ciò che fa alla conferma:

- **Primo setup**: in una cartella che non è un progetto Trama, è la scheda Get Started stessa (vedi il Panel). Mostra tutti i passi: percorso, agente, modelli, progetto, cartelle da importare (solo con Import from Code), avanzate e riepilogo. La conferma salva le impostazioni, inizializza la cartella scelta (vedi il Project) e prosegue con il percorso scelto.
- **Impostazioni**: in un progetto, dal pulsante Guided setup in cima alla scheda Settings, che mostra il wizard al posto del modulo delle impostazioni. Mostra solo agente, modelli, progetto, avanzate e riepilogo. La conferma salva soltanto le impostazioni.
- **Modello vuoto**: in un progetto con il Modello vuoto, dai pulsanti Import from Code e Start from Scratch del Diagramma o dal comando Import from Code, con il percorso già scelto; il pannello passa alla scheda Settings, che mostra il wizard. Mostra agente, modelli, progetto, le cartelle da importare solo con Import from Code, avanzate e riepilogo. La conferma salva le impostazioni e prosegue con il percorso, senza inizializzare nulla perché il progetto c'è già.

Le impostazioni che il wizard chiede sono un sottoinsieme di quelle della scheda Settings, con gli stessi titoli, gli stessi controlli e le stesse spiegazioni: la lingua non è fra i passi e resta nella scheda Settings. Proseguire con Import from Code chiede all'agente di descrivere il codice esistente lasciando fuori le cartelle escluse nel wizard; proseguire con Start from Scratch apre la richiesta di setup del progetto (vedi la Design request). Le cartelle escluse valgono solo per quell'import: non si salvano e non cambiano scan e Run successivi.

## States

### Closed (initial)
Nessun wizard è aperto: in un progetto la scheda Settings mostra il modulo delle impostazioni.
- `developer.OPEN_PANEL` → Path: la cartella non è un progetto Trama e il pannello si apre, o era chiuso e torna, su Get Started. Il wizard parte dal primo passo, in modo primo setup.
- `workspace.MODEL_CHANGED` → Path: la cartella non è più un progetto Trama e il pannello torna a Get Started. Il wizard parte dal primo passo, in modo primo setup.
- `developer.OPEN_GUIDED_SETUP` → Agent: il developer preme Guided setup nella scheda Settings di un progetto. Il wizard si apre in modo impostazioni.
- `developer.OPEN_GUIDED_SETUP` → Agent: il developer preme Import from Code o Start from Scratch nel Diagramma con il Modello vuoto, o lancia il comando Import from Code in un progetto con il Modello vuoto. Il wizard si apre in modo Modello vuoto con quel percorso già scelto. Il comando Import from Code con un Modello non vuoto non apre il wizard e lancia l'import come prima, senza cartelle escluse.

### Open
Il wizard mostra un passo alla volta, con l'indicazione di quali passi del suo modo ci sono e di quale si sta guardando. In ogni passo il developer cambia liberamente i valori; Back e Next li conservano, anche tornando indietro di più passi. Un'impostazione cambiata da fuori mentre il wizard è aperto, per esempio dalle impostazioni dell'editor, non sovrascrive i valori del wizard: il riepilogo confronta con il valore che vale in quel momento.
- `developer.CLOSE_PANEL` → Closed: il wizard dimentica tutte le scelte fatte; nulla è salvato. Riaprendo il pannello su Get Started, il wizard riparte dal primo passo con i valori attuali.
- `developer.CANCEL_SETUP` → Closed: solo nei modi impostazioni e Modello vuoto. Nulla è salvato e nulla parte; il wizard dimentica le scelte.
- `workspace.MODEL_CHANGED` → Closed: in modo primo setup, la cartella è diventata un progetto Trama da fuori, per esempio da un'altra finestra o dal controllo di versione. Nulla è salvato e il pannello passa al progetto.
- `workspace.MODEL_CHANGED` → Path: nei modi impostazioni e Modello vuoto, la cartella non è più un progetto Trama. Le scelte sono dimenticate e il wizard riparte dal primo passo in Get Started, in modo primo setup.

#### Path (initial)
Solo nel primo setup. Il developer sceglie come mettere Trama nella cartella: Import from Code, per un progetto che ha già il suo codice, o Start from Scratch, per un applicativo ancora da costruire. All'inizio nessuno dei due è scelto. Con più cartelle nell'area di lavoro il developer sceglie qui anche quale inizializzare; all'inizio è scelta la prima. Quando è scelto Start from Scratch e la cartella scelta contiene già dei file, un avviso nel passo stesso dice che Start from Scratch li ignora salvo che la richiesta li nomini, mentre Import from Code li descrive; il developer può cambiare percorso subito, senza dialoghi.
- `developer.NEXT_SETUP_STEP` → Agent: solo con un percorso scelto; senza, Next non è disponibile e dice perché.

#### Agent
omp, l'unico agente con cui Trama lavora: dove trovare omp, dove si apre il suo terminale e se i lavori di Trama ignorano i file di istruzioni degli agenti (vedi l'Agent terminal). Il passo verifica omp ogni volta che si mostra o che il percorso di omp cambia, e mostra il risultato: se omp risponde, con quanti modelli, oppure perché non risponde. Una verifica fallita è un avviso e non impedisce di andare avanti.

Ogni volta che il passo si mostra, Trama cerca anche i file di istruzioni che gli agenti caricano da soli: quelli più comuni nella cartella del progetto (nel primo setup quella scelta nel passo Path), quelli generali nelle cartelle che la contengono fino alla cartella home esclusa, e quelli dell'utente. Un file vuoto non conta. Quando ne trova, un avviso dice che l'agente li carica in ogni lavoro di Trama e consiglia di toglierli dal repository o di controllare che non contraddicano Trama, ed elenca i file trovati, uno per riga; scegliere un file lo apre in una scheda dell'editor e il wizard resta dov'è. Con i file di istruzioni ignorati, l'avviso dice anche che i lavori di Trama non li leggono. L'avviso non impedisce di andare avanti e non cambia nulla nei file; senza file trovati non compare.
- `developer.NEXT_SETUP_STEP` → Models
- `developer.PREVIOUS_SETUP_STEP` → Path: solo nel primo setup; negli altri modi Agent è il primo passo e Back non è disponibile.

#### Models
I tre ruoli dei modelli (analisi, scansione, esecuzione) e il numero massimo di sotto-agenti in parallelo. Una frase del passo consiglia, a parole e senza nominare modelli, il peso di ciascun ruolo: il modello più capace per l'analisi, uno intermedio per l'esecuzione, uno veloce e leggero per la scansione. Il wizard non sceglie né ordina i modelli in base al consiglio. I modelli suggeriti sono quelli che dichiara l'omp scelto nel passo precedente, anche se il suo percorso non è ancora salvato. Un numero di sotto-agenti non valido mostra perché e Next non è disponibile finché non torna valido.
- `developer.NEXT_SETUP_STEP` → Project: solo con valori validi.
- `developer.PREVIOUS_SETUP_STEP` → Agent

#### Project
La cartella in cui Trama installa le skill dell'agente. Quando il workspace ha un valore che prevale su quello utente, un avviso dice quale vale davvero.
- `developer.NEXT_SETUP_STEP` → Folders: il percorso è Import from Code.
- `developer.NEXT_SETUP_STEP` → Advanced: il percorso è Start from Scratch, o il wizard è in modo impostazioni.
- `developer.PREVIOUS_SETUP_STEP` → Models

#### Folders
Solo con Import from Code. L'albero delle cartelle della cartella scelta, con tutte le cartelle incluse all'inizio; le cartelle nascoste e quelle che il controllo di versione ignora non compaiono. Il developer toglie le cartelle che l'agente non deve importare; togliere una cartella toglie anche tutto ciò che contiene. Le scelte restano tornando indietro e cambiando passi, ma si perdono se il developer cambia la cartella da inizializzare.
- `developer.NEXT_SETUP_STEP` → Advanced: solo con almeno una cartella, o un file al primo livello, ancora incluso; altrimenti Next non è disponibile e dice perché.
- `developer.PREVIOUS_SETUP_STEP` → Project

#### Advanced
Il tema del pannello e le funzioni facoltative del gruppo Features. Il passo si può saltare.
- `developer.NEXT_SETUP_STEP` → Summary
- `developer.SKIP_SETUP_STEP` → Summary: i valori del passo tornano a quelli attuali, anche quelli già cambiati nel passo.
- `developer.PREVIOUS_SETUP_STEP` → Folders: il percorso è Import from Code.
- `developer.PREVIOUS_SETUP_STEP` → Project: il percorso è Start from Scratch, o il wizard è in modo impostazioni.

#### Summary
Tutte le scelte del wizard, passo per passo: il percorso e la cartella, ogni impostazione dei passi con il suo valore, con evidenziate quelle che cambiano il valore attuale, e le cartelle escluse. Ogni riga riporta al suo passo. Mentre la conferma è in corso, comprese le domande e gli avvisi che apre, nessun pulsante del wizard si può premere.
- `developer.OPEN_SETUP_STEP` → Path: il developer sceglie la riga del percorso o della cartella, solo nel primo setup.
- `developer.OPEN_SETUP_STEP` → Agent: il developer sceglie una riga dell'agente.
- `developer.OPEN_SETUP_STEP` → Models: il developer sceglie una riga dei modelli.
- `developer.OPEN_SETUP_STEP` → Project: il developer sceglie la riga della cartella delle skill.
- `developer.OPEN_SETUP_STEP` → Folders: il developer sceglie la riga delle cartelle escluse, solo con Import from Code.
- `developer.OPEN_SETUP_STEP` → Advanced: il developer sceglie una riga del tema o delle funzioni facoltative.
- `developer.PREVIOUS_SETUP_STEP` → Advanced
- `developer.INITIALIZE_PROJECT` → Closed: in modo primo setup il developer conferma e tutto riesce. Le impostazioni che cambiano sono salvate nelle impostazioni utente, come dalla scheda Settings; poi Trama inizializza la cartella scelta, con la cartella delle skill scelta (vedi il Project); poi prosegue con il percorso: con Import from Code chiede all'agente di descrivere il codice lasciando fuori le cartelle escluse, con Start from Scratch apre la richiesta di setup. Il pannello mostra il progetto.
- `developer.INITIALIZE_PROJECT` → Summary: in modo primo setup, il salvataggio di un'impostazione fallisce, il developer rifiuta di sovrascrivere skill personalizzate, oppure l'inizializzazione fallisce. Le impostazioni già salvate restano salvate e nulla parte. Il riepilogo mostra il motivo, salvo per un rifiuto, e la conferma si può ripetere senza rifare i passi.
- `developer.CONFIRM_SETUP` → Closed: nei modi impostazioni e Modello vuoto il developer conferma e ogni salvataggio riesce. Le impostazioni che cambiano sono salvate nelle impostazioni utente; in modo Modello vuoto Trama prosegue poi con il percorso, come nel primo setup ma senza inizializzare.
- `developer.CONFIRM_SETUP` → Summary: il salvataggio di un'impostazione fallisce. Le impostazioni già salvate restano salvate e nulla parte; il riepilogo mostra il motivo e la conferma si può ripetere.
