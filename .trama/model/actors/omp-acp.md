# omp ACP

Il processo di omp avviato come server ACP per una conversazione di omp Chat, General compresa, visto dall'estensione che lo ha avviato e che gli parla in ACP. Ogni conversazione ha il suo processo (vedi omp Chat conversation e omp Chat General). Non riguarda i terminali, né un omp avviato a mano dal developer.

The extension owns this process: it spawned it, so it knows which process the agent is and is told at once when it ends, without asking the hook and without polling it while the window lives. Everything this Actor reports reaches Trama over the ACP connection or from the process itself, never through a `trama` command run by the agent.

## Events

### EXITED
Il processo della conversazione è finito senza che Trama lo fermasse: è uscito da solo, è andato in errore o è stato ucciso. Counts as exited also when the ACP connection closes while the process is still there, because nothing can reach the agent any more. Non arriva quando Trama ferma il processo perché la conversazione si chiude o si pulisce, né quando il processo finisce con la finestra che si chiude o si ricarica. The reason Trama gives for it includes the last lines omp wrote on its error output.

### SESSION_STARTED
Il processo nuovo della conversazione General è partito e ha aperto una sessione nuova di omp, pronta a ricevere i messaggi del developer.

### START_FAILED
Il processo della conversazione General non è partito o non ha aperto la sua sessione: omp manca, non risponde in tempo, esce subito o rifiuta la sessione. The time limit covers the whole opening, from the start of the process to the session ready to receive messages; the reason includes the last lines omp wrote on its error output.

### SESSION_RESUMED
Trama ha riaperto in un processo nuovo, con le stesse opzioni, la sessione di omp di una conversazione, e la sessione ha accettato di continuare: dopo che la finestra si è chiusa o ricaricata, oppure, per General, al messaggio che segue un omp chiuso da solo.

### SESSION_NOT_RESUMED
La sessione di omp di una conversazione non si è riaperta dove SESSION_RESUMED l'avrebbe riaperta: il processo nuovo non parte, la sessione non esiste più, omp rifiuta di riaprirla o non risponde entro lo stesso limite di tempo dell'apertura.

### PERMISSION_REQUESTED
omp asks the developer's permission, in a conversation of omp Chat, before running a command or making a change for which it would ask in the terminal. It happens only with the permissive approval of omp Chat; with yolo omp never asks. The agent waits until the developer chooses, or until the request is cancelled by Stop, by the closing of the conversation, by the end of the process or by the end of the turn.

### TURN_ENDED
omp has answered a prompt Trama sent to the conversation of a job, that is every conversation that loads Trama's hook (design, scan, Run, Resolve Drifts, Unify Drifts, import, refinement), with the reason the turn stopped: the agent ended its turn, the developer stopped it with Stop, the model refused, or the model reached its token limit. It counts only when no message of the developer is waiting to be delivered to the agent: a queued message starts a new turn and its answer will be the one that counts. When omp refuses the prompt itself (for example for authentication or for the model), the answer is an error and counts as a turn ended for that reason. It replaces, for job conversations, the idle signal the hook gives in a terminal. Ask more and General, which have no hook, do not produce it.
