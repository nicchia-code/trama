---
column: done
technical: true
refs:
  - requirements/quality#General
drift: null
proposal: q90tj59p
agent: false
created: 2026-10-28T16:50:19.603Z
finished: 2026-10-28T18:21:05.885Z
---
# Host mai bloccato

Sul computer di lavoro dello sviluppatore (macOS, con antivirus/EDR che ispeziona ogni avvio di processo e ogni accesso ai file) ogni operazione dell'estensione ha un ritardo, dalla comparsa di una chat al cambio di scheda. Questo Task rende vero che il thread dell'host dell'editor non resta mai fermo ad aspettare qualcosa fuori di sé, che digitare, salvare e cambiare scheda non costano nulla, e aggiunge il canale di diagnostica `Trama Performance` per vedere dove resta il tempo. Le correzioni pensate per Windows sono incluse comunque.

La parte git di `requirements/quality#General` (git mai sincrono nell'host, `origin` e cartelle git letti una volta per finestra e di nuovo solo quando cambia la configurazione di git) è di un altro Task di questa Proposal (git asincrono e `origin` conservato); qui non va rifatta.

## Cosa deve essere vero alla fine

- Nessuna attesa attiva nell'host: una scrittura ritentata (`src/core/atomic-write.ts`, fino a 1 s quando la rinomina è rifiutata con EPERM/EACCES/EBUSY) e l'attesa di un lock (`src/core/file-lock.ts`, fino a 10 s) non usano più `Atomics.wait`: fra un tentativo e l'altro cedono il thread (attesa asincrona, per esempio una variante `async` di `writeFileAtomic` e di `withFileLock` usata dall'host). Le stesse funzioni possono restare sincrone nella riga di comando, che è un processo breve e non serve nessun editor; l'host usa solo le varianti che cedono.
- Nessun altro processo sincrono nell'host: ogni processo che l'host avvia (git, omp, gh, ps, PowerShell, gli strumenti dei certificati di sistema) gira in modo asincrono. Oltre a git (altro Task) va verificato che nessun percorso dell'host arrivi a `execFileSync`/`spawnSync`/`execSync`.
- Il focus della finestra non scrive in modo sincrono: oggi `onDidChangeWindowState` con la finestra in primo piano chiama `server.focus()`, che riscrive il record del canale delle domande con `writeFileAtomic` sincrono (e quindi con l'eventuale attesa attiva); la scrittura diventa asincrona e non blocca l'host.
- Digitare, salvare o cambiare le schede dell'editor non avvia processi e non legge alcun file di `.trama/`:
  - `findProject` (estensione) chiama `existsSync` su `.trama` a ogni chiamata; `requestId` lo chiama a ogni modifica di qualunque documento, prima ancora di controllare lo schema `file`. Il progetto della finestra va tenuto in memoria e aggiornato dagli eventi che lo possono cambiare (watcher di `.trama`, cambio delle cartelle del workspace); il controllo dello schema e del percorso avviene prima di qualunque accesso al disco.
  - `updateContext` (cambio di editor attivo) fa `existsSync` del documento e invia sempre due `setContext`, uno con un oggetto nuovo ogni volta: va inviato solo quando il valore cambia, e l'esistenza del file di richiesta si sa dal watcher di `.trama/` invece che dal disco.
  - `forget`, chiamato a ogni cambio delle schede, fa un `existsSync` per ogni richiesta inviata: va basato sulle cancellazioni riportate dal watcher di `.trama/` (già ascoltato in `deleted`), non su letture a ogni cambio di scheda.
- Il controllo delle skill (`checkSkills` → `refreshProjectSkills`, sincrono, circa 183 file letti/confrontati) parte ancora quando lo dice `rules#project` (a ogni Open Trama), ma non blocca l'host: le sue letture e scritture diventano asincrone, o il lavoro è spezzato in passi che cedono il thread; `trama.updateSkills` resta come oggi.
- L'esportazione dei certificati di sistema all'attivazione (`exportSystemCertificates("automatic")` quando `bundleStale()`) resta asincrona: il programma parte con `execFile`; vanno resi non bloccanti anche i passi sincroni che la accompagnano all'attivazione se misurati lenti.

## Diagnostica: canale `Trama Performance`

- Un canale Output `Trama Performance` (`vscode.window.createOutputChannel`), sempre attivo, creato all'attivazione, distinto dal canale `Trama` esistente.
- Riceve una riga per ogni operazione dell'host che dura più di 200 ms: quando è finita, che cosa l'ha avviata (un cambio di file, un'azione del pannello o di una vista, un lancio, un timer, un evento dell'editor), che cosa ha fatto, quanto è durata e ogni processo avviato con la sua durata. Le operazioni più veloci non scrivono nulla.
- Il canale non viene mai in primo piano da solo (mai `show()`), e non contiene contenuti di file, prompt, risposte o impostazioni: solo nomi di operazioni, percorsi sotto `.trama/`, nomi di programmi e durate. Scriverci non avvia processi e non legge file.
- Per misurare si avvolgono i punti d'ingresso delle operazioni dell'host (gestori dei watcher, gestore dei messaggi della webview, lanci di agenti, timer, eventi dell'editor) e i punti dove l'host avvia processi (runner di git, omp, gh, ps, PowerShell, `security`), così che ogni processo sia attribuito all'operazione in corso (per esempio con `AsyncLocalStorage`).

## Accettazione

Su una macchina dove l'antivirus ispeziona ogni avvio di processo e accesso ai file: digitare e salvare in qualunque file del progetto, cambiare le schede dell'editor, cambiare le viste del pannello e mostrare il menu laterale non avviano processi e lasciano `Trama Performance` vuoto; la scheda della conversazione di un job compare subito; un'azione della Board mostra il risultato con un solo quadro. Questa accettazione di `requirements/quality#General` si verifica quando anche gli altri Task di prestazioni di questa Proposal sono fatti (git asincrono, quadro incrementale, impostazioni controllate una volta, omp Chat, lancio di omp).

## Punti del codice

- `src/core/atomic-write.ts:10-30` — `pause` con `Atomics.wait` e `renameRetrying` che riprova fino a 1 s bloccando il thread
- `src/core/file-lock.ts:7-8,36-60` — `acquire` attende il lock fino a 10 s con `pause` (`Atomics.wait`)
- `extension/src/host/questions.ts:86-90` — `onDidChangeWindowState` in primo piano chiama `server.focus()`
- `src/core/question-channel.ts:761,915-920` — `publish` e `focus` scrivono il record con `writeFileAtomic` sincrono
- `extension/src/host/design-requests.ts:68-79` — gestori di editor attivo, modifiche dei documenti, editor visibili e schede
- `extension/src/host/design-requests.ts:384-387` — `requestId` chiama `findProject` (con `existsSync`) prima del controllo dello schema, a ogni battitura in qualunque documento
- `extension/src/host/design-requests.ts:306-308` — `forget` fa un `existsSync` per ogni richiesta inviata a ogni cambio di schede
- `extension/src/host/design-requests.ts:402-411` — `updateContext` con `existsSync` e due `setContext` sempre inviati (uno con un oggetto nuovo)
- `extension/src/host/project.ts:21-25` — `findProject` fa `existsSync` di `.trama` per ogni cartella a ogni chiamata
- `extension/src/host/controller.ts:403-412` — `checkSkillsInBackground` a ogni `open()` del pannello
- `extension/src/host/project.ts:80-86` — `checkSkills` chiama `refreshProjectSkills` sincrono
- `src/cli/skill-refresh.ts:35-49` — `refreshProjectSkills`, controllo sincrono di circa 183 file
- `extension/src/host/main.ts:103-105` — esportazione automatica dei certificati all'attivazione
- `extension/src/host/system-certificates.ts:146-161` — `runProgram` con `execFile` asincrono e `readSystemStore`
- `extension/src/host/controller.ts:1146` — canale Output `Trama` esistente, modello per creare `Trama Performance`
- `extension/src/host/model-lists.ts:118`, `extension/src/host/omp-chat/client.ts:648`, `src/core/process-start.ts:64`, `src/core/git.ts:20` — punti dove l'host avvia processi, da misurare
