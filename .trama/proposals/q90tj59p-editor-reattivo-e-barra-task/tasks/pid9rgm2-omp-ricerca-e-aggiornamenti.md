---
technical: false
refs:
  - agent-launching
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
  - requirements/tech#omp-acp
  - requirements/quality#agent-launching
---
# omp: ricerca e aggiornamenti

Sul computer di lavoro del developer (macOS, con antivirus/EDR che ispeziona ogni avvio di processo e ogni accesso ai file) ogni lancio di omp ha un ritardo: prima di ogni lavoro Trama cerca omp nel PATH, avvia `omp --version` e aspetta `omp update --check`, che può chiedere la rete e durare fino a 30 secondi. La Feature `agent-launching` ora dice che ogni finestra ricorda quale omp ha trovato e la sua versione, e che un lancio non aspetta mai il controllo degli aggiornamenti. Il developer ha deciso: il controllo degli aggiornamenti gira in background, mai aspettato da un lancio; una versione nuova trovata si installa prima del lancio successivo, che aspetta soltanto l'aggiornamento; programma e versione di omp si tengono per finestra.

## Cosa deve essere vero alla fine

**Un modulo per finestra tiene omp** (`tech#omp-acp`). Un solo modulo dell'host tiene il programma omp trovato (`findOmp`, la ricerca di `tech#agent-launching`: `trama.ompPath`, poi il PATH dell'editor, poi `~/.bun/bin` e `~/.local/bin`) e la sua versione, come una sola promessa condivisa da tutti: i lanci nel terminale e in omp Chat, Ask more, General, le riprese delle conversazioni, login e logout, `omp models --json` e `omp usage --json`. Cerca e chiede la versione solo al primo bisogno nella finestra e di nuovo dopo un cambio di `trama.ompPath`, la fine del terminale di installazione e la fine di un aggiornamento; ogni altro chiamante prende il valore tenuto, senza cercare nel PATH né avviare un processo. Oggi il PATH si cerca tre volte per ogni avvio di General e due per ogni lancio: dopo, al più una volta per finestra. L'avvio di General non chiede più `omp --version` a ogni apertura della finestra quando il modulo ha già la versione.

**omp prima di ogni lancio** (`rules#agent-terminal`). Vale per ogni istruzione (design, scan, import, implement, implement all e ogni Run di una sequenza per modello, Resolve Drifts, Unify Drifts) e per Ask more, nel terminale o in omp Chat; non vale per la ripresa di una conversazione di omp Chat dopo una ricarica. General ne usa solo la ricerca di omp, con le sue regole: non aspetta il controllo degli aggiornamenti e, quando omp manca, lo dice dentro la conversazione con Install omp, senza avviso dell'editor. In quest'ordine:
1. Trama trova omp (dal modulo, una volta per finestra). Se manca, il lancio non parte: nessun terminale, nessuna conversazione, nessun annuncio, nessun lavoro; una sequenza per modello si ferma come quando l'istruzione di un Run non parte; compare l'avviso di omp mancante (`ui#agent-terminal`, con Install omp e Open Settings). Il lavoro non riparte da sé quando omp viene installato.
2. Se l'ultimo controllo ha trovato una versione nuova, o omp è più vecchio della versione minima (`tech#omp-acp`), Trama aggiorna omp con la notifica di avanzamento (`ui#agent-terminal`) e il lancio parte dopo, con la nuova versione; un aggiornamento in corso si aspetta, mai si ripete. Un omp più vecchio del minimo che non si riesce ad aggiornare ferma il lancio con l'avviso della versione minima, come oggi.
3. Altrimenti il lancio parte subito; quando l'ultimo controllo non vale più, Trama ne avvia uno in background, non aspettato.
4. Un aggiornamento fallito lascia partire il lancio con l'omp di prima e mostra l'avviso dell'aggiornamento fallito, una volta per aggiornamento; un controllo fallito lo mostra una volta per controllo.

**Validità del controllo** (`rules#agent-terminal`, `tech#agent-terminal`). L'esito di un controllo, riuscito o fallito, vale un'ora, per tutte le finestre dell'editor e lo stesso programma omp; un cambio di `trama.ompPath` o la fine del terminale di installazione lo dimenticano. Un solo controllo alla volta. L'esito sta in `ExtensionContext.globalState`, chiave `trama.ompUpdateCheck`, `{ checkedAt, omp, version?, newer? }` (istante ISO 8601, programma omp risolto, versione attuale, `newer` la versione trovata e non ancora installata); vale quando `checkedAt` ha meno di un'ora e `omp` è il programma risolto. Il campo `newer` è nuovo: il controllo in background che trova una versione nuova non aggiorna subito, la scrive in `newer`, e il lancio successivo legge `newer` e aspetta `omp update` (una promessa per finestra); finito l'aggiornamento, il modulo rilegge la versione e `newer` sparisce. Un lancio aspetta un aggiornamento in corso, mai un controllo.

**Il wizard** (`rules#setup-wizard`): il passo `omp` resta l'unico controllo aspettato, con la stessa validità e lo stesso aggiornamento.

**Esecuzione** (invariata, `tech#omp-acp` e `tech#agent-terminal`): `omp update --check` e `omp update` con `execFile`, senza shell, argomenti fissi, il programma omp tenuto e lo stesso PATH di `omp models --json`; scadenze 30 s e 5 minuti; `omp --version` 15 s; la lettura dell'uscita di `--check` e i motivi dei fallimenti non cambiano. Nessuna conferma prima di aggiornare. La parte pura (lettura delle uscite, validità dell'esito con `newer`, ricerca del programma) sta in `src/core`, provata con `bun:test`.

**Affidabilità e prestazioni** (`quality#agent-launching`): un controllo o un aggiornamento che fallisce non ferma mai un lavoro quando omp c'è; lo ferma soltanto omp che manca. Un lancio non aspetta mai il controllo degli aggiornamenti; senza rete un lancio non aspetta nulla, e solo un aggiornamento che un controllo ha trovato trattiene il lancio successivo mentre gira.

## Dove nel codice
- `extension/src/host/omp-launch.ts:56-76` — `realLauncher` dietro `ompBeforeLaunch`: oggi `findOmp` e poi `checkedOmp` → `ensureOmpUpdated` aspettato a ogni lancio; deve prendere programma e versione dal modulo e aspettare solo un aggiornamento.
- `extension/src/host/omp-update.ts:135-180` — `ensureOmpUpdated`: `omp update --check` (30 s) e `omp --version` aspettati insieme (`:151`) e aggiornamento subito dopo il controllo; da dividere in controllo in background che scrive `newer` e aggiornamento al lancio successivo.
- `extension/src/host/omp-update.ts:186-192` — `ompVersionOnly`: il risultato non si salva mai, così General avvia `omp --version` a ogni apertura della finestra.
- `extension/src/host/omp-update.ts:48-76` — `findOmp` e `findConfiguredOmp`: la ricerca nel PATH, ripetuta da ogni chiamante.
- `extension/src/host/omp-update.ts:27-42` — `stored`/`save`/`forgetUpdateCheck`: lo stato `trama.ompUpdateCheck`, senza `newer`.
- `src/core/omp-update.ts:5-31` — `OMP_UPDATE_TTL_MS` (1 h), `StoredCheck` (aggiungere `newer`), `ompSearchFolders` (ordine di ricerca), `checkHolds`.
- `extension/src/host/omp-chat/general.ts:290-354` — `open` di General: catena seriale ricerca, versione, istruzioni, endpoint, avvio; ricerca e versione devono venire dal modulo.
- `extension/src/host/agent.ts:276-277` — dipendenze di General (`findConfiguredOmp`, `ompVersionOnly`).
- `extension/src/host/agent.ts:767` e `:900` — `ompBeforeLaunch` in `launchAgent` e in `openAskMore`.
- `extension/src/host/main.ts:126-135` — `OmpUsage` con `findConfiguredOmp` e il client ACP che cerca di nuovo nel PATH (`findOmp`) a ogni avvio di processo.
- `extension/src/host/main.ts:94-95` — cambio di `trama.ompPath` → `forgetUpdateCheck`; deve anche far ricercare il programma al modulo.
- `extension/src/host/controller.ts:514-521` — `checkAgent` del wizard: l'unico controllo aspettato.
- `extension/src/host/controller.ts:546-552`, `:567`, `:606` — fine dell'installazione (`forgetUpdateCheck` a `:549`), login e logout: chiamano `findOmp`; la fine dell'installazione deve far ricercare il modulo.
- `extension/src/host/omp-chat/usage.ts:59` — `ompUsageRunner` cerca il programma a ogni chiamata.
- `extension/src/host/model-lists.ts:118` — `omp models --json` con il programma omp; deve ricevere quello tenuto.
- `extension/src/host/omp-status.ts:30` — `ompStatus` cerca il programma di nuovo.
