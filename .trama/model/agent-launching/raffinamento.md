# Raffinamento

Il raffinamento adatta al Modello e ai Requisiti di adesso una Proposal ordinaria diventata obsoleta. Esiste solo con Auto-update Stale Proposals, una funzione spenta per impostazione predefinita che il developer accende per tutti i progetti dal gruppo Advanced dei Settings. Serve a scrivere quanti design si vogliono di fila: quando l'approvazione di uno rende obsoleti gli altri, perché cambia file che anche loro toccano, quelli non si perdono e non vanno rifatti da capo.

Con la funzione accesa, una Proposal ordinaria aperta e non allegata a un Drift che è obsoleta si mostra sulla Board come da raffinare, al posto del segno di Proposal obsoleta, e il suo Approve resta disponibile. Premere Approve non la approva: chiede a Trama di raffinarla. Un import, una Proposal di setup e una risoluzione obsoleti restano obsoleti come senza la funzione. Una Proposal bloccata anche da una Proposal che richiede e che non è ancora approvata, o della quale l'agente che l'ha consegnata non ha ancora finito il turno, non si raffina: Approve resta indisponibile con quei motivi, come oggi.

Il raffinamento lo fa l'agente di design, con il modello del ruolo di analisi, sulla stessa Proposal: tiene identità, numero breve, posto in Backlog, etichetta, modello scelto, immagini dei Task e le Proposal che la richiedono. L'agente parte dalla Proposal com'è, dal suo corpo con le decisioni già prese e dai suoi Task, e rilegge soltanto il Modello e i Requisiti di adesso dei file cambiati sotto di lei, insieme ai Drift aperti sugli elementi che tocca. Non legge il codice e non archivia Task né Drift fuori dalla Proposal. La riallinea ai file di adesso, la riscrive perché faccia la stessa modifica sul Modello di adesso, aggiorna i suoi Task e la consegna. Il developer ha già risposto nel design: l'agente non fa domande, salvo un solo round quando il Modello di adesso contraddice una decisione già presa e non si può scegliere senza di lui.

Quando l'agente trova che il Modello di adesso contiene già tutta la modifica, non la riscrive e non la approva: apre un round di domande di Trama che spiega la situazione, con due scelte, Remove, che rifiuta la Proposal, e Keep, raccomandata, che la lascia com'è, da raffinare. Un round saltato o perso vale Keep.

I raffinamenti partono uno alla volta, per finestra dell'editor. Approve su una Proposal da raffinare mentre un altro raffinamento lavora la mette in coda; la coda segue sempre l'ordine del Backlog, non quello dei clic. Una Proposal in coda si toglie con Cancel, che la riporta da raffinare senza rifiutarla; un raffinamento in corso non si annulla dalla scheda: chiudere il suo terminale lo interrompe.

Alla fine del lavoro dell'agente Trama guarda la Proposal raffinata:
- consegnata durante il raffinamento e non bloccata: è approvata, perché il developer l'ha già approvata premendo Approve; se in quel momento un Run lanciato da questa finestra è in corso, l'approvazione aspetta la fine del Run, con la scheda Open che dice che aspetta il Run, e alla fine del Run Trama la guarda di nuovo come in questo elenco;
- consegnata ma di nuovo obsoleta, perché nel frattempo un'altra approvazione ha cambiato i suoi file: rientra in coda da sola, al suo posto nell'ordine del Backlog;
- consegnata ma bloccata per un altro motivo, per esempio una Proposal che richiede non è approvata: resta Open e la Board dice perché;
- non consegnata, perché il lavoro si è interrotto o il developer ha scelto Keep: torna da raffinare; se l'agente l'aveva già riallineata resta una Draft a metà, che la Board mostra al suo posto come da raffinare e che Approve riprende;
- rifiutata con Remove: non c'è più nulla da fare.

La coda vive nella memoria della finestra: riaprire l'editor la perde e le Proposal che aspettavano tornano da raffinare. Ogni finestra conta solo i raffinamenti che ha lanciato lei. Spegnere la funzione svuota la coda, e le Proposal che aspettavano tornano obsolete come senza la funzione; il raffinamento in corso finisce come gli altri. Un raffinamento non è un Run né una risoluzione: non ferma e non è fermato da Run, Resolve, Unify Drifts, scan, design e import.

## States

### Fermo (initial)
Nessun raffinamento lavora in questa finestra e la coda è vuota.
- `developer.APPROVE_PROPOSAL` → Al lavoro: Approve su una Proposal da raffinare, o su una Draft rimasta a metà di un raffinamento, con la funzione accesa, e l'istruzione parte davvero. Trama lancia l'agente di design su quella Proposal; la scheda resta al suo posto in Backlog segnata come in raffinamento.
- `developer.APPROVE_PROPOSAL` → Fermo: l'istruzione del raffinamento non parte davvero. La Proposal resta com'era, da raffinare, e la Board dice perché.

### Al lavoro
Un agente raffina una Proposal; le altre per cui il developer ha premuto Approve aspettano in coda, ciascuna segnata sulla sua scheda.
- `developer.APPROVE_PROPOSAL` → Al lavoro: Approve su un'altra Proposal da raffinare o su una Draft rimasta a metà: entra in coda al suo posto nell'ordine del Backlog.
- `developer.ANNULLA_RAFFINAMENTO` → Al lavoro: Cancel su una Proposal in coda: esce dalla coda e torna da raffinare, senza che nessun suo file cambi. Il raffinamento in corso continua.
- `developer.CHANGE_SETTING` → Al lavoro: il developer spegne Auto-update Stale Proposals. La coda si svuota e le Proposal che aspettavano tornano obsolete come senza la funzione; il raffinamento in corso continua e finisce come gli altri.
- `agent-hook.IDLE` → Al lavoro: l'agente del raffinamento ha finito. Trama guarda la Proposal raffinata come dice la Machine, poi lancia il raffinamento della prima Proposal della coda che è ancora da raffinare, e l'istruzione parte davvero; una Proposal in coda che non è più da raffinare, perché approvata, rifiutata o non più obsoleta, esce dalla coda senza partire.
- `agent-hook.IDLE` → Fermo: l'agente del raffinamento ha finito e nella coda non resta nessuna Proposal da raffinare, oppure l'istruzione della prossima non parte davvero: allora la coda si svuota e le Proposal che aspettavano tornano da raffinare. Trama guarda la Proposal raffinata come dice la Machine.
- `omp-acp.TURN_ENDED` → Al lavoro: in una conversazione di omp Chat, omp ha risposto al prompt del raffinamento con la fine del turno; come per l'hook a riposo nel terminale, con un raffinamento successivo che parte davvero.
- `omp-acp.TURN_ENDED` → Fermo: in una conversazione di omp Chat, omp ha risposto al prompt del raffinamento con la fine del turno; come per l'hook a riposo nel terminale, senza un raffinamento successivo.
- `terminal.COMMAND_ENDED` → Al lavoro: è finito il comando del raffinamento; come quando l'agente ha finito, con un raffinamento successivo che parte davvero.
- `terminal.COMMAND_ENDED` → Fermo: è finito il comando del raffinamento; come quando l'agente ha finito, senza un raffinamento successivo.
- `terminal.CLOSED` → Al lavoro: il terminale del raffinamento è stato chiuso; come quando l'agente ha finito, con un raffinamento successivo che parte davvero.
- `terminal.CLOSED` → Fermo: il terminale del raffinamento è stato chiuso; come quando l'agente ha finito, senza un raffinamento successivo.
- `time.CHECK_DUE` → Al lavoro: il controllo di esecuzione chiude il lavoro del raffinamento, alle stesse condizioni dei Run, con l'avviso in cima alla Board; come quando l'agente ha finito, con un raffinamento successivo che parte davvero.
- `time.CHECK_DUE` → Fermo: il controllo di esecuzione chiude il lavoro del raffinamento, con l'avviso in cima alla Board; come quando l'agente ha finito, senza un raffinamento successivo.

## Events

### PROPOSAL_RAFFINATA
Emesso alla fine di un raffinamento quando la Proposal raffinata è stata consegnata durante il raffinamento, è ancora Open e non è bloccata, e nessun Run lanciato da questa finestra è in corso. Se un Run è in corso, è emesso invece alla fine di quel Run, quando la Proposal è ancora Open, non obsoleta e non bloccata; tornata obsoleta nel frattempo, rientra in coda senza approvazione.
