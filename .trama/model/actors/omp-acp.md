# omp ACP

Il processo di omp avviato come server ACP per una conversazione di omp Chat, General compresa, visto dall'estensione che lo ha avviato e che gli parla in ACP. Ogni conversazione ha il suo processo (vedi omp Chat conversation e omp Chat General). Non riguarda i terminali, né un omp avviato a mano dal developer.

## Events

### EXITED
Il processo della conversazione è finito senza che Trama lo fermasse: è uscito da solo, è andato in errore o è stato ucciso. Non arriva quando Trama ferma il processo perché la conversazione si chiude o si pulisce, né quando il processo finisce con la finestra che si chiude o si ricarica.

### SESSION_STARTED
Il processo nuovo della conversazione General è partito e ha aperto una sessione nuova di omp, pronta a ricevere i messaggi del developer.

### START_FAILED
Il processo della conversazione General non è partito o non ha aperto la sua sessione: omp manca, non risponde in tempo, esce subito o rifiuta la sessione.

### SESSION_RESUMED
Trama ha riaperto in un processo nuovo, con le stesse opzioni, la sessione di omp di una conversazione, e la sessione ha accettato di continuare: dopo che la finestra si è chiusa o ricaricata, oppure, per General, al messaggio che segue un omp chiuso da solo.

### SESSION_NOT_RESUMED
La sessione di omp di una conversazione non si è riaperta dove SESSION_RESUMED l'avrebbe riaperta: il processo nuovo non parte, la sessione non esiste più o omp rifiuta di riaprirla.
