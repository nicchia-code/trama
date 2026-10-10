# Agent

Un agente di programmazione che lavora per il developer. Esplora il Modello, scrive Proposal, archivia Task e Drift e realizza i Task attraverso la riga di comando di Trama. Le decisioni restano del developer: approvare, rifiutare o scartare una Proposal, risolvere un Drift, riprendere un Task e riscrivere le identità delle schede. L'agente può eseguirle per suo conto, ma è istruito a farlo solo quando il developer glielo chiede esplicitamente nella conversazione; senza quella richiesta gli chiede di decidere. Trama non gli impedisce tecnicamente di eseguirle: una decisione eseguita dall'agente produce lo stesso Evento del developer e ha le stesse condizioni e conseguenze.

## Events

### MOVE_TASK_TO_TODO
The agent puts a Task back in the To do column.

### MOVE_TASK_TO_DOING
The agent starts working on a Task and moves it to In progress.

### MOVE_TASK_TO_DONE
The agent finishes a Task and moves it to Done.

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
L'agente dice che un controllo che ha annunciato passa a una nuova fase, per esempio dalla verifica allo scan.

### FINISH_CHECK
L'agente dice che un controllo che ha annunciato è finito, con la verifica e lo scan conclusi o non necessari.

### ASK_QUESTIONS
The agent asks the developer a round of related questions and waits for the answers.

### STOP_WAITING
The agent's wait for a question round ends without an answer because the caller stops waiting: the agent is stopped, its terminal closes, its question call is cancelled or times out, or the caller disconnects. Loss of the editor while the caller is still waiting is reported by `editor.DISCONNECTED` instead.
