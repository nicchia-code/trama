# Agent hook

Il modulo che un agente del terminale carica per dire a Trama quando ha finito, invece di lasciarglielo indovinare dal suo comando. Oggi è solo quello di omp: Trama lo carica con `--hook` nel comando che scrive nel terminale, e il modulo avvisa l'editor con `trama agent-event idle`. Riguarda solo i terminali che Trama ha avviato per omp; gli altri agenti non hanno hook e continuano a essere seguiti dalla fine del loro comando, dalla chiusura del terminale e dalla quiete.

omp carica il modulo anche in ogni suo sotto-agente, ma solo l'agente principale dice di aver finito: un sotto-agente che finisce, o la cui sessione omp chiude più tardi perché è rimasto inattivo, non dice nulla. Mentre l'agente principale o uno dei suoi sotto-agenti sta lavorando, il modulo manda da sé, senza che l'agente faccia nulla, un segnale di vita ogni cinque minuti, anche durante un singolo comando lungo come test o build. Il segnale non è un Event: conta come attività del suo terminale per i quindici minuti di quiete (vedi l'Actor time). Un omp interrotto, bloccato o ucciso smette di mandarlo, e la quiete chiude la sua corsa.

## Events

### IDLE
L'agente di un terminale che Trama ha avviato ha concluso il proprio lavoro: la sessione principale è sul punto di fermarsi, senza lavoro in coda né job asincroni dell'agente, oppure l'agente è uscito. I sotto-agenti non lo producono, nemmeno quando la loro sessione si chiude. Il comando dell'agente può essere ancora aperto, in attesa del prossimo prompt del developer: l'Event non libera il terminale, dice solo che nessun agente sta più lavorando lì. Se l'agente riprende per un prompt scritto a mano, Trama non torna a considerarlo in corso.
