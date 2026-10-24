# Agent hook

L'hook che l'agente del terminale carica per dire a Trama quando ha finito, invece di lasciarglielo indovinare dal suo comando. L'agente del terminale è omp: carica il modulo di Trama con `--hook` nel comando che Trama scrive nel terminale, e l'hook avvisa l'editor con `trama hook idle`. Riguarda solo i terminali che Trama ha avviato: un agente avviato a mano dal developer non ha l'hook di Trama.

Con omp Chat il processo di omp di una conversazione di un lavoro carica lo stesso modulo, con la stessa identità che avrebbe il terminale di quel lavoro, ma lì l'hook non dice né quale processo è l'agente né quando ha finito: Trama ha avviato quel processo e lo conosce già, e la fine del lavoro gliela dà omp stesso rispondendo al prompt (vedi l'Actor omp ACP). In una conversazione l'hook fa soltanto ciò che deve stare dentro omp: rifiuta lo strumento di domande e guarda le scritture dei file durante un Run, come sotto. Come il terminale di Ask more, la conversazione di Ask more non ha l'hook, e non lo ha nemmeno la conversazione General (vedi omp Chat General).

L'agente carica l'hook anche in ogni suo sotto-agente, ma solo l'agente principale di un terminale dice di essere partito e di aver finito: un sotto-agente che parte o finisce non lo dice all'editor. L'hook non manda segnali di vita: dice una sola volta quale processo è l'agente, e il controllo di esecuzione verifica da sé che quel processo esista ancora (vedi l'Actor time).

Lo stesso hook, in ogni sessione dell'agente, principale e sotto-agenti, rifiuta lo strumento di domande dell'agente e gli risponde di chiedere con il round di Trama (vedi il Question round). Lo rifiuta sempre, perché c'è solo nei terminali e nelle conversazioni di Trama, e senza contattare l'editor. In a job conversation the ACP client of the extension also declines any form omp asks it to show, with the same answer, so the refusal holds even if the hook did not load.

Durante un Run lo stesso hook, in ogni sessione, guarda anche le scritture dei file: prenota il file per il sotto-agente che lo scrive per primo e ferma la scrittura di chi non lo tiene (vedi la Prenotazione di un file). Quando un sotto-agente finisce la sua corsa, l'hook cancella le sue prenotazioni, sempre senza contattare l'editor.

## Events

### STARTED
La sessione principale dell'agente di un terminale che Trama ha avviato è partita, e l'hook dice a Trama quale processo è l'agente. Arriva una volta per terminale, prima del lavoro; i sotto-agenti non lo producono, e non lo produce una conversazione di omp Chat, di cui Trama conosce già il processo che ha avviato. Se si perde, Trama non sa quale processo è l'agente e il controllo di esecuzione guarda il processo della shell del terminale.

### IDLE
L'agente di un terminale che Trama ha avviato ha concluso il proprio lavoro: la sessione principale è sul punto di fermarsi, senza lavoro in coda, oppure l'agente è uscito. I sotto-agenti non lo producono, e non lo produce una conversazione di omp Chat, la cui fine del lavoro è `omp-acp.TURN_ENDED`. Il comando dell'agente può essere ancora aperto, in attesa del prossimo prompt del developer: l'Event non libera il terminale, dice solo che nessun agente sta più lavorando lì. Se l'agente riprende per un prompt scritto a mano, Trama non torna a considerarlo in corso.

### SOTTO_AGENTE_FINITO
Un sotto-agente dell'agente di un terminale o di una conversazione che Trama ha avviato ha finito la sua corsa: ha dato il suo risultato e non ha altro lavoro in coda. L'hook lo vede da sé e cancella le prenotazioni di quel sotto-agente, senza dirlo all'editor. Non riguarda la sessione principale, la cui fine è IDLE nel terminale e `omp-acp.TURN_ENDED` in una conversazione, né gli advisor.
