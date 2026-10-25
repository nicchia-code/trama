# Time

Il tempo che passa, visto dal controllo di esecuzione di Trama: un controllo piccolissimo ed economico che ogni finestra dell'editor fa da sé, per non lasciare in corso un lavoro di cui nessun segnale dirà più la fine. Il controllo guarda soltanto fatti certi: se il processo dell'agente di omp di un terminale esiste ancora, se il terminale esiste ancora, se chi tiene un Task è ancora vivo, se un ghost appartiene ancora a qualcuno. Non misura l'inattività e non ha soglie: un agente vivo ma fermo resta in corso, come un agente che lavora a lungo.

The check never polls the omp processes of the conversations of omp Chat open in its own window: the window started them and is told at once when one ends (see the Actor omp ACP). It looks at a conversation only when its window is gone, through the process Trama recorded for it.

Who holds a Task or owns a ghost is alive when the window that follows that terminal or conversation says so. When no open window follows it, it is alive only if the agent process Trama recorded for it still exists and is still that same process, not another one that took its place after it ended. A window that does not answer in time counts as following nothing, and Trama looks at the recorded process instead.

Time also measures the two short waits of an away notification (see Notice), in the window that holds it: the quiet before it goes and the pause before its only retry. These waits never touch the execution check.

## Events

### CHECK_DUE
È l'ora del controllo di esecuzione di una finestra: una volta quando la finestra apre il progetto, e poi ogni minuto, ma solo mentre quella finestra ha almeno un lavoro in corso in un terminale (Run, design, scan, risoluzione o import), il progetto ha almeno un Task preso dall'agente, o il progetto ha almeno un ghost che nessun terminale o conversazione di quella finestra possiede. A riposo, senza lavori in un terminale, senza Task presi e senza ghost altrui, non scatta. Un controllo che non trova nulla non cambia nulla e non mostra nulla.

### NOTICE_DELAY_ELAPSED
The wait of a notice is over: thirty seconds of quiet, counted as its Requirements say, for a notice about a finished window, a question round or a permission request; no wait at all for a notice about an agent that stopped abnormally, or about a window whose last job closed its conversation with Auto Exit.

### RETRY_DELAY_ELAPSED
Ten seconds have passed since the first attempt to send a notice failed.
