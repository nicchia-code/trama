# omp Chat conversation

Una conversazione di omp Chat: la chat, nella vista omp Chat dell'editor, nella barra laterale secondaria, che prende il posto del terminale di omp quando omp Chat è accesa (vedi omp Chat). Questa Machine descrive una singola conversazione, dall'apertura alla chiusura. omp Chat esiste per sostituire il terminale di omp: una conversazione si comporta come il terminale che sostituisce, e cambia solo il modo in cui il developer vede e parla con l'agente.

omp Chat è in uso quando è accesa nelle impostazioni utente del developer, o quando lui non l'ha mai spenta, letta a ogni istruzione. Allora, ovunque il Modello dice che con omp Trama apre un terminale, Trama apre invece una conversazione nuova di omp Chat con lo stesso nome: per ogni lavoro (design, scan, Run, Resolve Drifts, Unify Drifts, import), per Quick Task e per Ask more. Come un terminale, una conversazione non si riusa mai: ogni istruzione ne apre una nuova, e più conversazioni lavorano insieme. Con omp Chat spenta, Trama apre il terminale.

Ogni conversazione ha il suo processo di omp, avviato come server ACP, nella cartella del progetto, con il contrassegno dell'agente, con l'identità che avrebbe il suo terminale e con le stesse opzioni del comando che Trama scriverebbe nel terminale: l'hook di Trama, il modello del ruolo o della Proposal, il modello di scansione per i sotto-agenti, l'Advisor Scanner, l'esclusione dei file di istruzioni, e le stesse frasi nell'istruzione. Quick Task e Ask more partono come i loro terminali: senza hook, con il modello del loro ruolo, Ask more con la sua istruzione e Quick senza nessuna. L'istruzione è il primo messaggio della conversazione, e l'agente comincia da sé.

Come omp approva i comandi di una conversazione lo dice l'approvazione di omp Chat, un'impostazione del gruppo Features che vale solo per le conversazioni, Quick Task e Ask more compresi: permissiva, per impostazione predefinita, oppure yolo. In modo permissivo omp chiede il permesso come nel terminale: quando vuole eseguire un comando o una modifica per cui nel terminale chiederebbe, la richiesta compare nel flusso della conversazione come una scheda che dice cosa omp vuole fare, con un pulsante per ogni opzione che omp offre (per esempio consentire una volta, consentire sempre, rifiutare), la scheda della conversazione nella vista segna che aspetta una risposta, e l'agente aspetta finché il developer non sceglie. Un messaggio scritto mentre la richiesta aspetta resta in coda come ogni messaggio mandato mentre l'agente lavora; Stop e la chiusura della conversazione rispondono a omp che la richiesta è annullata. In modo yolo omp non chiede mai il permesso per un comando o una modifica e la conversazione non mostra richieste di permesso. In entrambi i modi omp scrive i file del progetto da sé, su disco, come nel terminale. Il modo si sceglie all'apertura della conversazione e resta il suo anche quando riprende dopo una ricarica, con le stesse opzioni.

Per tutto ciò che il Modello dice del terminale di omp (Run, annunci e ghost, Task presi, schede in attesa della fine del turno, round di domande, controllo di esecuzione, avvisi sulla Board) una conversazione vale come quel terminale: l'hook a riposo vale come nel terminale, la fine del processo vale come la fine del comando, la chiusura della conversazione vale come la chiusura del terminale. `trama.autoExit` vale come per il terminale; `trama.terminalLocation` non conta.

Quando una conversazione si apre per un lavoro, la vista omp Chat si mostra sulla sua scheda, dove sta, senza prendere il focus: il cursore e la tastiera restano dove erano. Le conversazioni di Quick Task e di Ask more prendono anche il focus, nel campo del messaggio.

La conversazione mostra i messaggi del developer e dell'agente, il ragionamento dell'agente, le chiamate ai suoi strumenti con il loro esito e il suo piano dei todo. Il developer può scrivere in ogni momento: un messaggio mandato mentre l'agente lavora gli arriva senza fermarlo, come nel terminale di omp. Può cambiare il modello della conversazione: vale solo per lei, dal turno seguente, e non cambia i ruoli. Può fermare l'agente con Stop, dopo una conferma.

Quando l'agente chiede qualcosa con lo strumento di domande di omp, la domanda compare dentro la conversazione come un modulo da compilare, con le sue opzioni e un campo libero, e l'agente aspetta la risposta. Nei lavori di Trama lo strumento è rifiutato dall'hook e l'agente chiede con il round di Trama, come nel terminale; il modulo serve a Quick Task e ad Ask more, e a ogni altra richiesta di scelta che omp fa al developer.

## States

### Agent running (initial)
Il processo della conversazione esiste e l'agente lavora per Trama: l'hook non ha ancora detto che è a riposo. Il Run, gli annunci e i Task presi della conversazione sono in corso, come per un terminale in Agent running.
- `agent-hook.IDLE` → Closed: con `trama.autoExit` acceso. L'agente ha concluso il lavoro; Trama ferma il processo e la conversazione sparisce dalla vista, con il resoconto dell'agente, come il terminale. La fine del Run, il rilascio dei Task presi e il ritiro degli annunci seguono l'hook come nel terminale.
- `agent-hook.IDLE` → Agent idle: con `trama.autoExit` spento. L'agente ha concluso il lavoro e aspetta un messaggio del developer; finiscono il Run, i Task presi e gli annunci come sopra.
- `agent-hook.STARTED` → Agent running: Trama ricorda quale processo è l'agente, come per il terminale. Nient'altro cambia.
- `omp-acp.EXITED` → Closed: il processo è finito senza che l'hook dicesse prima di essere a riposo (interrotto, in errore o ucciso), con `trama.autoExit` acceso o spento, perché non c'è più un agente con cui continuare. Run, Task presi e annunci finiscono come per la fine del comando nel terminale; la conversazione sparisce.
- `developer.STOP_CHAT_AGENT` → Agent running: il developer ha confermato Stop. Il turno dell'agente si interrompe come con Esc nel terminale di omp; ciò che segue lo decide l'hook, come nel terminale.
- `developer.CLOSE_CHAT_CONVERSATION` → Closed: dopo la conferma, quando l'agente è in un turno. Trama ferma il processo; Run, Task presi e annunci finiscono come per la chiusura del terminale.
- `time.CHECK_DUE` → Closed: il controllo di esecuzione trova che il processo dell'agente non esiste più senza che Trama ne abbia visto la fine. Run, Task presi e annunci finiscono come per una fine anomala del comando, e in cima alla Board l'avviso dice che Trama ha smesso di seguire questa conversazione e perché, come per un terminale.
- `editor.WINDOW_CLOSED` → Waiting for the window: la finestra si chiude o si ricarica mentre l'agente lavora, e il processo finisce con lei. Trama conserva la conversazione e il lavoro che segue, per riprenderli.

### Agent idle
Il processo esiste e nessun agente lavora più per Trama: la conversazione resta nella vista e il developer può continuare a parlare con l'agente, come in un terminale a riposo. Trama non segue più ciò che vi succede: se l'agente riprende per un messaggio del developer, un nuovo hook a riposo non cambia nulla, e ciò che l'agente archivia da lì arriva sulla Board come ogni altra scheda.
- `developer.CLOSE_CHAT_CONVERSATION` → Closed: il developer chiude la conversazione, con la conferma se l'agente è in un turno per un suo messaggio, senza se è fermo. Trama ferma il processo.
- `omp-acp.EXITED` → Closed: il processo è finito da solo; la conversazione sparisce.
- `editor.WINDOW_CLOSED` → Waiting for the window: la finestra si chiude o si ricarica, e il processo finisce con lei. Trama conserva la conversazione per riprenderla.

### Waiting for the window
La finestra che conteneva la conversazione si è chiusa o ricaricata e il processo non c'è più. Trama conserva la conversazione, la sessione di omp e, se l'agente lavorava, il lavoro che seguiva, con il suo Run, i suoi annunci e i suoi Task presi. Quando una finestra riapre il progetto, Trama riapre la sessione in un processo nuovo, con le stesse opzioni, e la conversazione torna nella vista solo se la sessione si riapre: nessun recupero parziale.
- `omp-acp.SESSION_RESUMED` → Agent running: se l'agente lavorava. Trama manda alla conversazione un messaggio fisso che chiede all'agente di continuare il lavoro interrotto; Run, annunci e Task presi restano suoi. La vista omp Chat si mostra sulla conversazione senza focus, come all'apertura.
- `omp-acp.SESSION_RESUMED` → Agent idle: se l'agente era a riposo. La conversazione torna nella vista, con la sua storia, e aspetta il developer.
- `omp-acp.SESSION_NOT_RESUMED` → Closed: la conversazione si perde. Se l'agente lavorava, Run, Task presi e annunci finiscono come per un agente scomparso, e in cima alla Board l'avviso dice che Trama ha smesso di seguire questa conversazione e perché.

### Closed (final)
La conversazione non esiste più e il suo processo è fermo.

## Events

### OPENED
Trama ha aperto una conversazione nuova di omp Chat per un'istruzione, per un Quick Task o per Ask more, oppure l'ha riaperta dopo che la finestra si era chiusa o ricaricata.

### CLOSED
La conversazione è arrivata in Closed e sparisce dalla vista.
