---
description: "Usa quando implementi come finisce la corsa dell'agente nel terminale e la chiusura automatica del terminale (Auto Exit)."
---
# Fine della corsa dell'agente

## agent-terminal/Agent idle
- Con omp la fine della corsa la dice l'agente: quando ha finito (il suo hook avvisa l'editor con `trama hook idle`, vedi `tech#agent-hook`), quando il suo comando finisce senza che l'hook abbia parlato (agente interrotto, in errore o ucciso) o quando il terminale è chiuso. omp resta aperto in attesa del prossimo prompt, quindi di norma il comando non finisce da sé; il prompt scritto a mano dopo la fine non rimette la corsa in corso. Non c'è quiete: senza un segnale la corsa resta in corso finché il terminale non è chiuso, l'editor non riparte o il controllo di esecuzione non trova che il processo dell'agente non esiste più (`rules#time`); un agente vivo ma fermo resta in corso.
- Con `trama.autoExit` acceso (predefinito) Trama chiude il terminale dell'agente appena riceve l'hook a riposo o la fine del comando, con `terminal.dispose()`, in ogni posizione (area o scheda) e per ogni istruzione; lo chiude allo stesso modo quando il controllo di esecuzione trova l'agente scomparso. La chiusura rilascia i Task presi e ritira gli annunci di quel terminale solo se l'hook, la fine del comando o il controllo non l'hanno già fatto: nessun avviso doppio. Con `trama.autoExit` spento il terminale resta aperto a riposo e non è più seguito. Le chat non si chiudono mai.
