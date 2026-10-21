# Agent hook

L'hook che l'agente del terminale carica per dire a Trama quando ha finito, invece di lasciarglielo indovinare dal suo comando. L'agente del terminale è omp: carica il modulo di Trama con `--hook` nel comando che Trama scrive nel terminale, e l'hook avvisa l'editor con `trama hook idle`. Riguarda solo i terminali che Trama ha avviato: un agente avviato a mano dal developer non ha l'hook di Trama.

L'agente carica l'hook anche in ogni suo sotto-agente, ma solo l'agente principale dice di aver finito: un sotto-agente che finisce non dice nulla. L'hook non manda segnali di vita: non c'è più una quiete da far ripartire.

Lo stesso hook, in ogni sessione dell'agente, principale e sotto-agenti, rifiuta lo strumento di domande dell'agente e gli risponde di chiedere con il round di Trama (vedi il Question round). Lo rifiuta sempre, perché c'è solo nei terminali di Trama, e senza contattare l'editor.

## Events

### IDLE
L'agente di un terminale che Trama ha avviato ha concluso il proprio lavoro: la sessione principale è sul punto di fermarsi, senza lavoro in coda, oppure l'agente è uscito. I sotto-agenti non lo producono. Il comando dell'agente può essere ancora aperto, in attesa del prossimo prompt del developer: l'Event non libera il terminale, dice solo che nessun agente sta più lavorando lì. Se l'agente riprende per un prompt scritto a mano, Trama non torna a considerarlo in corso.
