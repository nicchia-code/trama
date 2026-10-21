---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
  - requirements/quality#agent-terminal
drift: null
proposal: u4osxzox
agent: false
created: 2026-10-21T15:20:49.406Z
finished: 2026-10-21T15:26:31.565Z
---
# Terminale con agente scomparso

Quando il Task è fatto, il terminale omp dell'agente non resta più in corso per sempre se l'agente muore senza segnale.

Mentre l'agente lavora (Agent running), all'arrivo di `agent-hook.STARTED` (`trama hook start <pid>`) Trama ricorda quale processo è l'agente di quel terminale, anche fuori dalla finestra, nella memoria locale dell'utente, così che anche una finestra ricaricata sappia se quell'agente è ancora vivo; nient'altro cambia e il terminale resta in Agent running.

A ogni controllo di esecuzione (`time.CHECK_DUE`, all'apertura del progetto nella finestra e poi ogni 60 secondi, solo finché c'è un lavoro in corso o un Task preso):
- se il processo indicato dall'hook non esiste più oppure, quando l'hook non l'ha indicato, non esiste più la shell del terminale, il lavoro finisce come per una fine anomala del comando: Run finito, Task presi rilasciati, annunci ritirati con il solito avviso, schede in attesa liberate, sequenza di Run all fermata. Con `trama.autoExit` acceso Trama chiude il terminale (Closed) con `terminal.dispose()`, senza rilasciare o ritirare una seconda volta né avvisare due volte; con `trama.autoExit` spento il terminale resta aperto con la shell (Agent idle);
- se il terminale non esiste più senza che Trama ne abbia visto la chiusura, Run, Task presi e annunci finiscono come per la chiusura (Closed).

In tutti e tre i casi in cima alla Board compare l'avviso `Trama stopped following <job>: <reason>.`, che dice quale terminale Trama ha smesso di seguire e perché. Nel dubbio (processo che esiste) il controllo lascia tutto com'è: non libera mai il lavoro di un agente vivo, anche se fermo. Il controllo non lancia processi, non legge il codice e non scrive nulla quando non trova niente: per ogni lavoro costa solo una verifica dell'esistenza di un processo; senza lavori e senza Task presi non gira. Chiudere un terminale già chiuso non blocca l'editor e non lancia errori.

L'accettazione esercita: omp ucciso con `SIGKILL` mentre lavora, che entro un minuto chiude il Run con l'avviso, rilascia i Task e ritira i ghost; un omp vivo e fermo che resta in corso; una finestra ricaricata con un omp ancora vivo il cui Task resta preso, e poi liberato quando quel omp muore; un Task preso rimasto dopo la chiusura dell'editor, liberato all'apertura; un lavoro della chat mai legato chiuso dopo un minuto; `trama task check` nei suoi cinque esiti.
