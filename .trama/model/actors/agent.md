# Agent

Un agente di programmazione che lavora per il developer. Esplora il Modello, scrive Proposal, archivia Task e Drift e realizza i Task attraverso la riga di comando di Trama. Le decisioni restano del developer: approvare, rifiutare o scartare una Proposal, risolvere un Drift, riprendere un Task e riscrivere le identità delle schede. L'agente può eseguirle per suo conto, ma è istruito a farlo solo quando il developer glielo chiede esplicitamente nella conversazione; senza quella richiesta si ferma e dice al developer che la decisione è sua, sulla Board, senza fargliene una domanda. Trama non gli impedisce tecnicamente di eseguirle: una decisione eseguita dall'agente produce lo stesso Evento del developer e ha le stesse condizioni e conseguenze.

Nel lavoro di Trama l'agente fa domande al developer solo con i round di domande di Trama, mai con il proprio strumento di domande né scrivendo le domande nella conversazione.

## Events

### MOVE_TASK_TO_TODO
The agent puts a Task back in the To do column.

### MOVE_TASK_TO_DOING
The agent starts working on a Task and moves it to In progress.

### MOVE_TASK_TO_DONE
The agent finishes a Task and moves it to Done.

### CHECK_TASK
L'agente chiede a Trama della salute di chi tiene un Task In progress preso dall'agente: per esempio l'agente principale di una corsa che, prima di chiuderla, trova nel suo ambito Task presi da altri. Trama fa subito, in una finestra aperta del progetto, il controllo di esecuzione su chi tiene quel Task e risponde se è vivo o se il Task è stato liberato, con il motivo. Senza un editor del progetto raggiungibile risponde che non può verificare e non cambia nulla. Domandare non prende il Task.

### CLOSE_TASK_UNCHANGED
L'agente chiude un Task di correzione senza cambiare il codice, perché rileggendolo ha trovato che fa già ciò che dicono il Model o il Requisito, e scrive una nota con ciò che ha verificato.

### DECLARE_TASK_PROGRESS
The agent, or the sub-agent working on a Task, says roughly how far along the Task it has taken is, as a percentage it judges by itself.

### START_PROPOSAL
The agent starts writing a new Proposal, which begins as a Draft.

### SUBMIT_PROPOSAL
The agent says it has finished writing a Proposal and hands it over to the developer.

### EDIT_PROPOSAL
The agent registers a file with a Proposal, rewrites it or marks a file for deletion. In una risoluzione di Drift registra o cambia anche la decisione presa su un Drift.

### FILE_TASK
The agent files a new Task.

### FILE_DRIFT
The agent files a new Drift.

### UNIFY_DRIFTS
L'agente di Unify Drifts registra il Drift unificato e, nello stesso passo, chiude i Drift che unisce: il Drift nuovo nasce Open e ognuno di quelli uniti diventa Unified. O succede tutto o non succede nulla.

### FILE_COMPARISON
L'agente, o un suo sotto-agente, finisce il confronto di una Machine e archivia in un solo passo tutti i Task e i Drift che ha trovato, anche nessuno; un Drift del blocco può portare allegata una Draft, che l'agente consegna subito dopo.

### CHANGE_CHECK_PHASE
L'agente dice che un controllo che ha annunciato passa a una nuova fase: dalla verifica allo scan, oppure, alla fine di una corsa, all'aggiornamento della History.

### FINISH_CHECK
L'agente dichiara concluso un controllo annunciato e distingue un esito riuscito da un fallimento. Chiudere il controllo con esito fallito elimina il ghost ma non prova che la verifica o lo scan siano riusciti.

### ASK_QUESTIONS
The agent asks the developer a round of related questions and waits for the answers.

### TOOL_DOMANDE_CHIAMATO
L'agente prova a fare una domanda al developer con il proprio strumento di domande invece che con un round di Trama. In una conversazione o in un terminale di Trama l'hook di Trama lo rifiuta prima che la domanda compaia; altrove lo strumento funziona e Trama non lo vede.

### STOP_WAITING
The agent's wait for a question round ends without an answer because the caller stops waiting: the agent is stopped, its terminal closes, its question call is cancelled, or the caller disconnects. L'agente non mette nessun limite di tempo alla sua attesa, quindi l'attesa non scade mai da sola. Loss of the editor while the caller is still waiting is reported by `editor.DISCONNECTED` instead.

### VOCE_HISTORY_SCRITTA
L'agente scrive una nuova voce di History alla fine di una corsa che ha realizzato dei Task: una macro-funzionalità che quei Task hanno realizzato, che nessuna voce raccontava ancora.

### VOCE_HISTORY_AGGIORNATA
L'agente aggiorna una voce di History esistente, perché i Task realizzati da una corsa fanno parte della stessa macro-funzionalità che la voce racconta.

### ADVISOR_REVIEWED
Il sotto-agente `trama-advisor` consegna a Trama l'esito di una revisione dell'Advisor della chat: pulita, oppure con le note su ciò che il codice scritto dal Task fa diversamente da quanto chiedono il Task, il Modello o i Requisiti. Le differenze nel codice che c'era già non sono note: le ha già archiviate come Drift.
