# Agent

Un agente di programmazione che lavora per il developer. Esplora il Modello, scrive Proposal, archivia Task e Drift e realizza i Task attraverso la riga di comando di Trama. Le decisioni restano del developer: approvare, rifiutare o scartare una Proposal, risolvere un Drift, riprendere un Task e riscrivere le identità delle schede. L'agente può eseguirle per suo conto, ma è istruito a farlo solo quando il developer glielo chiede esplicitamente nella conversazione; senza quella richiesta gli chiede di decidere. Trama non gli impedisce tecnicamente di eseguirle: una decisione eseguita dall'agente produce lo stesso Evento del developer e ha le stesse condizioni e conseguenze.

Fa eccezione la scelta della prima correzione raccomandata dei Drift per i quali il developer ha attivato la delega di risoluzione: l'agente può registrarla senza un'altra domanda, dopo la barriera delle scansioni. La delega viene verificata da Trama e non si estende ad altre decisioni. L'approvazione automatica di quella risoluzione e il successivo Run sono coordinati da Trama; l'agente non si concede da solo l'approvazione di una Proposal.

## Events

### MOVE_TASK_TO_TODO
The agent puts a Task back in the To do column.

### MOVE_TASK_TO_DOING
The agent starts working on a Task and moves it to In progress.

### MOVE_TASK_TO_DONE
The agent finishes a Task and moves it to Done.

### CLOSE_TASK_UNCHANGED
L'agente chiude un Task di correzione senza cambiare il codice, perché rileggendolo ha trovato che fa già ciò che dicono il Model o il Requisito, e scrive una nota con ciò che ha verificato.

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

### CHANGE_CHECK_PHASE
L'agente dice che un controllo che ha annunciato passa a una nuova fase: dalla verifica allo scan, oppure, alla fine di una corsa, all'aggiornamento della History.

### FINISH_CHECK
L'agente dichiara concluso un controllo annunciato e distingue un esito riuscito da un fallimento. Chiudere il controllo con esito fallito elimina il ghost ma non prova che la verifica o lo scan siano riusciti.

### ASK_QUESTIONS
The agent asks the developer a round of related questions and waits for the answers.

### STOP_WAITING
The agent's wait for a question round ends without an answer because the caller stops waiting: the agent is stopped, its terminal closes, its question call is cancelled or times out, or the caller disconnects. Loss of the editor while the caller is still waiting is reported by `editor.DISCONNECTED` instead.

### VOCE_HISTORY_SCRITTA
L'agente scrive una nuova voce di History alla fine di una corsa che ha realizzato dei Task: una macro-funzionalità che quei Task hanno realizzato, che nessuna voce raccontava ancora.

### VOCE_HISTORY_AGGIORNATA
L'agente aggiorna una voce di History esistente, perché i Task realizzati da una corsa fanno parte della stessa macro-funzionalità che la voce racconta.
