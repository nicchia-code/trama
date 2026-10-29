---
column: done
technical: true
refs:
  - requirements/tech#time
  - requirements/tech#agent-hook
  - requirements/quality#agent-terminal
drift: null
proposal: q90tj59p
agent: false
created: 2026-10-28T16:50:19.603Z
finished: 2026-10-28T17:54:07.114Z
---
# Controllo esecuzione leggero

Sul computer di lavoro del developer (macOS con antivirus/EDR che ispeziona ogni avvio di processo e ogni accesso ai file) il controllo di esecuzione e la registrazione dei processi degli agenti aggiungono ritardi. Va reso leggero; le correzioni per Windows sono incluse.

Quando è finito deve valere:

- Decidere se il timer del controllo va armato si fa sul quadro di `src/core` (`quality#panel`), quando arriva un quadro nuovo: un evento grezzo del watcher in `.trama/tasks/`, `announcements/` o `issues/` non legge mai Task, issue o annunci dal disco. Il quadro è costruito da un altro Task e viene dato al controllo come ascoltatore; questo Task fa sì che il controllo lo usi.
- Anche la corsa del controllo legge i Task presi e gli annunci dal quadro già in memoria, non dal disco (`releaseTasks` e il resto delle conseguenze restano le funzioni di fine già in uso).
- La lettura dell'istante di avvio di un processo (`ps -o lstart= -p <pid>` su macOS, PowerShell su Windows, `/proc` su Linux) è sempre asincrona nell'host dell'editor e non blocca nulla: quando l'host registra il processo di un terminale (`agent-started`) o di una conversazione, scrive subito il pid e aggiunge l'istante di avvio quando la lettura finisce. Un lancio, l'apertura di una conversazione e `trama hook start` non la aspettano mai. Finché l'istante non c'è, il processo vale vivo se `process.kill(pid, 0)` non dà `ESRCH`.
- `trama hook start <pid>` non avvia nessun processo: manda all'editor solo `agent-started` con terminale e pid e finisce subito; l'editor legge l'istante di avvio dopo, in background, così un PowerShell o un `ps` lento non fa mai superare all'hook i suoi 3 secondi di timeout. Restano gli esiti: 0 anche senza editor, progetto, `TRAMA_TERMINAL` o con un `<pid>` non intero positivo (senza mandare nulla), 2 solo per uso sbagliato.
- Le letture degli istanti di avvio dei processi seguiti non vanno fatte una alla volta in serie.

Punti del codice:
- `extension/src/host/execution-check.ts:11` — `pending()` legge con `listTasks` tutti i Task, issue e annunci dal disco
- `extension/src/host/execution-check.ts:47-50` — watcher su `.trama/{tasks,announcements,issues}` senza debounce che richiama `pending()` a ogni create/change
- `extension/src/host/execution-check.ts:80-84` — armo del timer da sostituire con la decisione sul quadro
- `extension/src/host/agent.ts:497-507` — corsa del controllo
- `src/core/task-release.ts:26` — lettura dei Task dal disco invece che dal quadro
- `src/core/task-release.ts:76` — idem
- `src/core/agent-processes.ts:84-88` — registrazione che attende `processStartTime` prima di scrivere la voce
- `src/core/agent-processes.ts:106-121` — vivacità con `process.kill(pid, 0)` e confronto dell'istante; va accettata la voce senza `processStart` ancora in arrivo
- `src/core/process-start.ts:51-66` — `ps -o lstart=` / `powershell (Get-Process).StartTime` con timeout di 5 secondi
- `extension/src/host/follow-facts.ts:22-25` — legge i fatti un processo alla volta
- `extension/src/host/agent.ts:199` — registrazione del processo di una conversazione
- `extension/src/omp/trama-hook.ts:41` — hook che esegue `trama hook start` con timeout di 3 secondi
- `extension/src/omp/trama-hook.ts:50` — hook che esegue `trama hook idle` con timeout di 3 secondi
- `src/cli/commands/hook.ts:31-33` — comando `trama hook start`: deve solo mandare il pid, senza avviare processi
