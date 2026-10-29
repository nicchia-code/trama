---
column: done
technical: true
refs:
  - requirements/tech#team
  - requirements/rules#manager-mode
  - requirements/tech#solo-merge
  - requirements/tech#solo-switch
  - requirements/tech#menu-laterale
  - requirements/quality#menu-laterale
drift: null
proposal: q90tj59p
agent: false
created: 2026-10-28T16:50:19.603Z
finished: 2026-10-28T17:34:54.594Z
---
# git asincrono e origin

Sul computer di lavoro del developer (macOS, con antivirus/EDR che ispeziona ogni avvio di processo e ogni accesso ai file) ogni avvio sincrono di `git` blocca l'host dell'editor: oggi una foto del progetto ne lancia almeno tre, Team di più, e il menu laterale ricalcola lo stato di Merge a ogni salvataggio di un file. Quando questo Task è finito, l'host dell'editor non chiama mai `git` in modo sincrono; la riga di comando resta com'è, con il `git()` sincrono.

## git asincrono
- `src/core/git.ts` offre la forma asincrona (`execFile`/`spawn` senza shell, gli stessi argomenti fissi, `--no-optional-locks`, `GIT_TERMINAL_PROMPT=0` e lo stesso limite di tempo, chiuso con SIGKILL) accanto a quella sincrona, che resta solo per la riga di comando. Le correzioni per Windows sono incluse: il processo di `git` parte con `windowsHide: true`.
- Le funzioni di `src/core/solo-merge.ts` e `src/core/solo-mode.ts` che l'host usa (disponibilità di Merge, ramo corrente, modifiche tracciate, merge aperto, file in conflitto, elenco dei rami, aggiornato o no, merge, abort, fine del merge ricordato, `gitPlace`, `trackedSoloFiles`, stato di Solo mode) hanno una forma asincrona che usa la forma asincrona di `git`; la riga di comando continua a usare quelle sincrone. Lo stesso vale per la lettura di origin (`git remote get-url origin`) di `src/core/manager-mode.ts`: la logica pura (lettura e scrittura di `.trama/manager/mode.json`, interpretazione dell'indirizzo) resta senza `git`, e `managerStatus`/`teamUnavailableReason` nell'host ricevono origin dal modulo qui sotto invece di leggerla.
- Ogni chiamata `git` dell'host (stato di Merge, menu, Merge nell'editor, Solo mode, origin, cartelle del wizard) passa dalla forma asincrona. `execFileSync` sparisce da `extension/src/host/`.

## origin una volta per finestra
- Un modulo dell'host, uno per finestra, tiene l'origin del progetto: l'indirizzo e il repository GitHub che ne deriva (`<owner>/<repo>` minuscolo, secondo `rules#manager-mode`), o nessuno. Lo legge in modo asincrono quando la finestra apre il progetto e di nuovo solo quando un `FileSystemWatcher` sul file `config` della directory git comune segnala un cambiamento; quando il valore cambia avvisa i suoi ascoltatori. Nessun origin, nessun git o una chiamata fallita valgono come nessun remote origin.
- Il pannello (`postManager`, `teamRepository`, il `githubRepo` del messaggio `snapshot`, la scelta tra Team e apertura ordinaria di `trama.showTeam`/`show team`), il menu laterale (`team`, `manager`), Team (persone, GitHub Project, `githubTarget`), il PR Check, la risposta a `trama team show`, le richieste di design e omp Chat leggono questo valore e non chiamano mai `readOrigin`. Un'apertura del pannello, una foto, una comparsa della vista Team o della scheda Settings non rileggono origin.
- Al cambiamento di origin il menu laterale e la vista Team seguono senza ricaricare la finestra: il pannello riceve `managerMode` di nuovo; se origin smette di essere su GitHub mentre il pannello mostra Team, il pannello passa alla Board; se Manager mode si spegne mentre mostra Team, la vista tiene solo `Pull Requests`.
- La creazione della vista omp Chat (il `ready` del webview) non avvia `git`: `githubRepo` viene dal valore della finestra, e il messaggio `githubRepo` riparte quando origin cambia.

## Solo mode
- L'host tiene l'ultimo messaggio `soloMode { available, solo, tracked }`; lo ricalcola in modo asincrono solo alla prima necessità nella finestra, dopo ogni scrittura e quando la directory git segnala un cambiamento di `index` o `info/exclude`. Ogni volta che Settings diventa visibile manda l'ultimo valore senza avviare `git`; fuori da un progetto non lo manda.

## Stato di Merge solo con il menu visibile
- `extension/src/host/solo-merge.ts` ricava le directory git (`rev-parse --git-dir --git-common-dir`) in modo asincrono, una volta per finestra e di nuovo quando cambia la configurazione di git, e osserva con un `FileSystemWatcher` `HEAD`, `MERGE_HEAD`, `index`, i refs e `packed-refs`, con la pausa di 150 ms. Spariscono il watcher `**/*` sui file della copia di lavoro e l'ascoltatore di `onDidSaveTextDocument` (e il loro timer di 500 ms): salvare o cambiare un file del progetto non ricalcola mai lo stato di Merge.
- Il merge ricordato si controlla ancora all'attivazione e a ogni controllo di esecuzione (`tech#agent-launching`), in modo asincrono.
- Lo stato di Merge di `menuState` si calcola in background solo mentre il menu laterale è visibile: quando diventa visibile e, finché è visibile, dopo la pausa di 150 ms del watcher della directory git. Mentre un calcolo è in corso il menu mostra l'ultimo stato; due calcoli non si sovrappongono mai, e uno chiesto nel frattempo parte una volta sola alla fine.

## Menu laterale
- Calcolare `menuState` non avvia nessun processo: `team` e `manager` vengono dall'origin della finestra (con Manager mode letto da `.trama/manager/mode.json`) e `merge` dall'ultimo stato calcolato. `MenuSurface.mergeState` e `MenuSurface.manager` diventano letture sincrone di valori già noti. Il messaggio riparte a ogni nuova foto, a ogni cambiamento delle cartelle e delle impostazioni, a ogni cambiamento di origin e a ogni nuovo stato di Merge.
- Al cambio di vista del pannello (`onDidChangeShownView`) e quando il menu ridiventa visibile (`onDidChangeVisibility`) l'host rimanda l'ultimo stato con solo `panelView` riletto, senza foto, file letti o processi avviati; con il menu che ridiventa visibile parte in più, in background, il calcolo dello stato di Merge. I test in `test/host-menu.test.ts` verificano che un cambio di vista e una nuova visibilità mandino il nuovo evidenziato senza chiamare `facts`, `mergeState` o `manager` della superficie.

## Fatto quando
- Nessuna chiamata sincrona a `git` (`spawnSync`, `execFileSync`, `git()`/`gitRun` sincroni) è raggiungibile dall'host dell'editor; i test della riga di comando con `git` sincrono passano come oggi.
- Test: origin letta una volta all'apertura e di nuovo solo dopo un cambiamento di `config`; menu nascosto → nessun calcolo dello stato di Merge; salvataggio di un file → nessun calcolo; cambiamento di `HEAD` con menu visibile → un calcolo dopo 150 ms; richieste durante un calcolo → un solo calcolo in più alla fine.
- `CHANGELOG.md` registra che l'editor non blocca più su `git`.

## Dove nel codice
- `src/core/git.ts:19-22` — `gitRun` con `spawnSync`, forma sincrona che resta per la riga di comando
- `src/core/git.ts:36-40` — `gitRunAsync` con `spawn`, senza `windowsHide`: diventa la forma dell'host
- `src/core/manager-mode.ts:61` — `readOrigin`, `git remote get-url origin` sincrono
- `src/core/manager-mode.ts:69-70,79-83` — `managerStatus` e `teamUnavailableReason` leggono origin a ogni chiamata
- `src/core/solo-merge.ts:63-101` — `rev-parse --git-path`, `symbolic-ref`, `status --porcelain` sincroni di `mergeAvailability`
- `src/core/solo-merge.ts:106-233` — rami, `isUpToDate`, `conflictedFiles`, `startMerge`, `abortMerge`, `settleMerge` sincroni usati dall'host
- `src/core/solo-mode.ts:159-164,176-177` — `gitPlace` (`rev-parse`) e `trackedSoloFiles` (`ls-files`) sincroni
- `extension/src/host/solo-mode.ts:8,11` — `inGitRepository` e `soloModeMessage` con `git` sincrono
- `extension/src/host/manager-mode.ts:6-7` — `managerModeMessage` chiama `managerStatus`
- `extension/src/host/controller.ts:168-176` — `originRepository` e `teamRepository` leggono origin
- `extension/src/host/controller.ts:326` — `inGitRepository` e `readOrigin` per le cartelle del wizard
- `extension/src/host/controller.ts:366-369` — `show("team")` legge origin
- `extension/src/host/controller.ts:897-905` — `postSolo` ricalcola Solo mode con `git` a ogni invio
- `extension/src/host/controller.ts:918-925` — `postManager` legge origin a ogni invio
- `extension/src/host/controller.ts:1007-1017` — `issueStates` e `teamTarget` chiamano `githubTarget`
- `extension/src/host/controller.ts:1098-1103` — `openedTeam` e i suoi `teamTarget`/`teamRepository` a ogni comparsa di Team
- `extension/src/host/controller.ts:1337-1339` — `postManager` a ogni foto
- `extension/src/host/controller.ts:1370-1371` — `readOrigin` e `teamRepository` a ogni `snapshot`
- `extension/src/host/controller.ts:993,2355` — `teamUnavailableReason` nei fatti delle schede e nei lanci
- `extension/src/host/design-requests.ts:106` — `teamUnavailableReason` legge origin
- `extension/src/host/team/github.ts:181-183` — `githubTarget` rilegge origin a ogni chiamata
- `extension/src/host/team/people.ts:196-198` — `teamAnswer` legge origin per `trama team show`
- `extension/src/host/menu/view.ts:86-95` — il menu si aggiorna anche su `soloMerge.onDidChange`
- `extension/src/host/menu/view.ts:182-192` — `mergeState` e `manager` della superficie chiamano `git`
- `extension/src/host/menu/model.ts:78-86` — `state()` chiama `mergeState()` e `manager()`
- `extension/src/host/solo-merge.ts:23-31` — `gitDirectories` con `execFileSync rev-parse`
- `extension/src/host/solo-merge.ts:53-68` — watcher `**/*` e `onDidSaveTextDocument` che ricalcolano lo stato
- `extension/src/host/solo-merge.ts:71-83` — `state()` con `git` sincrono
- `extension/src/host/solo-merge.ts:239-268` — `follow`, watcher della directory git, `fileEvent`/`filesChanged`
- `extension/src/host/omp-chat/view-model.ts:111-125` — `webviewReady` chiede `githubRepo()`
- `extension/src/host/omp-chat/view.ts:85-88` — `githubRepo` con `readOrigin` sincrono
