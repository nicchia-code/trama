---
column: done
technical: false
refs:
  - agent-launching
  - developer.SET_CURSOR_API_KEY
  - developer.REMOVE_CURSOR_API_KEY
  - editor.CURSOR_API_KEY_CHANGED
  - requirements/rules#developer.SET_CURSOR_API_KEY
  - requirements/rules#developer.REMOVE_CURSOR_API_KEY
  - requirements/rules#editor.CURSOR_API_KEY_CHANGED
  - requirements/rules#developer.LOG_IN_PROVIDER
  - requirements/tech#developer.SET_CURSOR_API_KEY
  - requirements/tech#developer.LOG_IN_PROVIDER
  - requirements/quality#developer.SET_CURSOR_API_KEY
  - requirements/quality#developer.LOG_IN_PROVIDER
drift: null
proposal: nrtibou1
agent: false
created: 2026-10-25T02:30:05.354Z
finished: 2026-10-25T02:40:55.806Z
---
# Chiave Cursor passata a omp

Il developer può dare a Trama una chiave API di Cursor, che Trama conserva e passa a ogni omp che avvia. Solo Cursor ha questa possibilità; gli altri fornitori della sezione Providers non cambiano. omp 18.12.6 non chiede chiavi in `omp login cursor`, ma legge la variabile d'ambiente `CURSOR_ACCESS_TOKEN` e con essa elenca i modelli con fornitore `cursor`: è l'unico modo in cui Trama passa la chiave.

Quando il Task è fatto vale quanto segue, dal lato dell'host e dell'elenco dei fornitori:

- **Conservazione.** La chiave sta solo nel portachiavi dell'editor (`ExtensionContext.secrets`, chiave `trama.cursorApiKey`), una per utente, condivisa da tutte le finestre e da tutti i progetti; una chiave nuova prende il posto della vecchia. Un modulo dell'host, `extension/src/host/cursor-api-key.ts`, la legge all'attivazione, la tiene in memoria, la aggiorna dopo ogni salvataggio o rimozione propri e a ogni `secrets.onDidChange` di quella chiave, e dà ai chiamanti in modo sincrono l'ambiente da aggiungere (`{ CURSOR_ACCESS_TOKEN: <chiave> }` o `{}`). Il nome della variabile sta solo lì. La chiave non entra mai nel webview, in un messaggio, in un log, in un file (impostazioni, progetto, `.trama/`, stato dell'estensione), in un'istruzione all'agente, negli argomenti di un processo o in una riga scritta in un terminale. Trama non la manda in rete, non la scambia e non la verifica.
- **Passaggio a omp.** Con una chiave salvata ogni processo omp che Trama avvia riceve `CURSOR_ACCESS_TOKEN` nel suo `env`, con il valore di Trama che prevale su quello ereditato dall'ambiente dell'editor: terminali dei lavori (design, scan, import, Run, Resolve Drifts, Unify Drifts) e di Ask more, terminale di login, `omp models --json`, `omp --version`, controllo e aggiornamento di omp, `omp usage --json` e il processo ACP delle conversazioni di omp Chat e di General. Senza chiave salvata Trama non aggiunge né toglie la variabile. Un processo riceve la chiave solo quando parte: i terminali e le conversazioni già aperti continuano con l'accesso che avevano, senza riavvii né avvisi. Un omp avviato a mano dal developer non riceve nulla.
- **Salvare (`developer.SET_CURSOR_API_KEY`).** Il messaggio del webview `setCursorApiKey { ompPath?: string }` (validato da `parseToHost` come `ompLogin`, senza nessun campo per la chiave) fa aprire all'host `vscode.window.showInputBox` mascherata (`password: true`, `ignoreFocusOut: true`) con titolo «Cursor API key» e testo «Paste a user API key from the Cursor dashboard. Trama keeps it in the editor's secret storage.». Un testo vuoto o di soli spazi non si conferma e la casella dice «Enter a Cursor API key.»; Esc non cambia nulla. La chiave salvata è il testo senza spazi attorno. Riuscito il salvataggio, l'host manda `cursorApiKey { saved: true }`, rifà `refreshOmp(true)` (stato di omp, fornitori, suggerimenti dei modelli) e `checkAgent` con il percorso del messaggio, come alla fine di un terminale di login. Nel wizard la chiave si salva subito e non è una scelta del wizard: non è nel riepilogo, la conferma non la scrive e Cancel non la toglie.
- **Togliere (`developer.REMOVE_CURSOR_API_KEY`).** `removeCursorApiKey { ompPath?: string }` toglie la chiave senza conferma e fa lo stesso seguito con `saved: false`. Un `CURSOR_ACCESS_TOKEN` dell'ambiente dell'editor non viene toccato: omp riceve di nuovo quello, se c'è.
- **Altre finestre (`editor.CURSOR_API_KEY_CHANGED`).** Un `secrets.onDidChange` che non segue un salvataggio o una rimozione della finestra stessa fa rileggere la chiave, mandare `cursorApiKey` e rifare `refreshOmp(true)`; il webview del wizard sul passo omp chiede di nuovo la verifica con il suo percorso. La finestra che ha fatto il cambio rifà le verifiche una volta sola.
- **Stato per il webview.** `cursorApiKey { saved: boolean }` arriva al `ready` del webview, quando la vista Settings diventa visibile e dopo ogni cambio; porta solo se una chiave c'è.
- **Errori del portachiavi.** Un `store` fallito mostra con `showErrorMessage` «Trama: could not save the Cursor API key: <motivo>.», un `delete` fallito «Trama: could not remove the Cursor API key: <motivo>.», un `get` fallito «Trama: could not read the Cursor API key: <motivo>.» una volta per lettura fallita, con il `message` dell'errore come motivo. Nulla cambia e nessuna verifica si rifà; finché la chiave non si legge omp parte senza la chiave di Trama e la riga è come senza chiave. Nessun ripiego in file o impostazioni.
- **Elenco dei fornitori.** In `OMP_LOGIN_PROVIDERS` (`extension/src/omp-login.ts`) Cursor ha abbonamento «Cursor subscription or API key» e `apiKey: true`, l'unico. La regola di collegato non cambia: Cursor è collegato quando omp ha almeno un modello usabile con fornitore `cursor`. La riservatezza del login resta: Trama non legge credenziali né account di omp; la chiave di Cursor che il developer le dà è l'unica credenziale che tiene.
- **Rischio noto, da non nascondere nei documenti.** Le chiavi utente del dashboard di Cursor, secondo la documentazione di Cursor, vanno scambiate con un access token; omp non fa lo scambio e non è verificato che una chiave del dashboard funzioni come `CURSOR_ACCESS_TOKEN`. omp elenca i modelli di Cursor anche con una chiave sbagliata, quindi la riga può dirsi collegata con una chiave non valida. La chiave, come ogni variabile d'ambiente, è visibile ai comandi che omp esegue nel suo processo.
- **Test con `bun:test`.** Ambiente del modulo con e senza chiave e precedenza su un `CURSOR_ACCESS_TOKEN` ereditato; variabile nell'`env` dei terminali dei lavori e di login (terminale finto di `test/host-agent-terminals.test.ts`) e mai nella riga di comando; variabile in `ompModels` e nello `spawn` di omp Chat; `parseToHost` per i due messaggi; controller con `SecretStorage` e `showInputBox` finti (spazi attorno, vuoto rifiutato, Esc, `store`/`delete` che falliscono con l'errore e senza verifiche, verifiche rifatte una volta, `onDidChange` da un'altra finestra).
- **Documenti.** `README.md`, `extension/README.md` e `CHANGELOG.md` descrivono la chiave API di Cursor, dove si conserva, che ogni omp avviato da Trama la riceve e il rischio noto; `docs/uat.md` ha i passi per provarla, con e senza `CURSOR_ACCESS_TOKEN` nell'ambiente.
