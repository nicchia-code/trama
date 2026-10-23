# omp ACP

Il processo di omp avviato come server ACP per una conversazione di omp Chat, visto dall'estensione che lo ha avviato e che gli parla in ACP. Ogni conversazione ha il suo processo (vedi omp Chat conversation). Non riguarda i terminali, né un omp avviato a mano dal developer.

## Events

### EXITED
Il processo della conversazione è finito senza che Trama lo fermasse: è uscito da solo, è andato in errore o è stato ucciso. Non arriva quando Trama ferma il processo perché la conversazione si chiude, né quando il processo finisce con la finestra che si chiude o si ricarica.

### SESSION_RESUMED
Dopo che la finestra si è chiusa o ricaricata, Trama ha riaperto in un processo nuovo, con le stesse opzioni, la sessione di omp di una conversazione salvata, e la sessione ha accettato di continuare.

### SESSION_NOT_RESUMED
Dopo che la finestra si è chiusa o ricaricata, la sessione di omp di una conversazione salvata non si è riaperta: il processo nuovo non parte, la sessione non esiste più o omp rifiuta di riaprirla.
