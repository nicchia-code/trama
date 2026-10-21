# Time

Il tempo che passa, visto dal controllo di esecuzione di Trama: un controllo piccolissimo ed economico che ogni finestra dell'editor fa da sé, per non lasciare in corso un lavoro di cui nessun segnale dirà più la fine. Il controllo guarda soltanto fatti certi: se il processo dell'agente di omp esiste ancora, se il terminale esiste ancora, se un lavoro della chat di Cursor si è legato alla sua conversazione, se qualche finestra aperta del progetto segue ancora chi tiene un Task. Non misura l'inattività e non ha soglie: un agente vivo ma fermo resta in corso, come un agente che lavora a lungo.

## Events

### CHECK_DUE
È l'ora del controllo di esecuzione di una finestra: una volta quando la finestra apre il progetto, e poi ogni minuto, ma solo mentre quella finestra ha almeno un lavoro in corso (Run, design, scan, risoluzione o import) o il progetto ha almeno un Task preso dall'agente. A riposo, senza lavori e senza Task presi, non scatta. Un controllo che non trova nulla non cambia nulla e non mostra nulla.
