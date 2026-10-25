---
description: "Usa quando implementi il login ai fornitori di modelli di omp o la chiave API di Cursor dalla scheda Settings e dal wizard di setup."
---
# Login dei fornitori di omp

## developer.LOG_IN_PROVIDER
- Elenco fisso dei fornitori, in quest'ordine, come id di omp · nome breve · abbonamento:
  1. `openai-codex` · ChatGPT · Plus/Pro (Codex)
  2. `anthropic` · Anthropic · Claude Pro/Max
  3. `github-copilot` · GitHub Copilot · Copilot subscription
  4. `google-gemini-cli` · Google Gemini CLI · Cloud Code Assist
  5. `google-antigravity` · Google Antigravity · Gemini, Claude, GPT-OSS
  6. `cursor` · Cursor · Cursor subscription or API key
  7. `xai-oauth` · xAI Grok · SuperGrok or X Premium+
- L'elenco non si legge da omp e nessun altro fornitore di omp ha un pulsante. L'uscita da un fornitore è in `rules#developer.LOG_OUT_PROVIDER`.
- Collegato: un fornitore è collegato quando l'elenco dei modelli di omp (la chiamata di `tech#panel/Settings`, che dà solo i modelli usabili) ha almeno un modello il cui fornitore è l'id dell'elenco, qualunque sia il modo in cui omp vi accede (login, chiave API, variabile d'ambiente). Altrimenti non è collegato. Quando omp risponde ma il suo elenco dei modelli è in errore, lo stato di ogni fornitore è sconosciuto.
- La sezione c'è solo quando la verifica di omp dice che omp risponde: nella scheda Settings lo stato di omp, nel wizard la verifica del passo `omp`. Prima del primo esito dopo che la scheda o il passo si mostra la sezione non c'è; durante le verifiche seguenti tiene gli stati che aveva finché arriva l'esito nuovo, e sparisce se l'esito dice che omp non risponde.
- Il pulsante c'è per ogni fornitore dell'elenco, in ogni stato: «Log in» per un fornitore non collegato o di stato sconosciuto, «Log in again» per uno collegato, che fa lo stesso comando (omp rinnova l'accesso o aggiunge un altro account).
- A ogni clic Trama apre un terminale integrato nuovo e visibile che esegue il login di omp per quel fornitore, `<omp> login <id>`. `<omp>` è il programma omp di Trama (`tech#agent-launching`): nella scheda Settings quello di `trama.ompPath` salvata, nel wizard quello del percorso del passo `omp`, anche se non è ancora salvato. Il terminale si apre nell'area dei terminali qualunque sia `trama.terminalLocation`; più clic aprono più terminali, e Trama non chiude né riusa un terminale di login.
- Quando il comando del terminale finisce, o il terminale si chiude prima, Trama rifà la verifica di omp della scheda Settings (stato di omp, numero dei modelli, fornitori collegati e suggerimenti dei modelli) e la verifica del passo `omp` del wizard con il programma usato dal login (`rules#setup-wizard`), se sono aperti. Non guarda l'esito del login e non mostra avvisi: l'esito resta scritto nel terminale, che resta aperto finché il developer non lo chiude.
- Nel wizard `Next` del passo `omp` richiede, oltre a omp che risponde, almeno un modello usabile, di qualunque fornitore, anche fuori dall'elenco (`rules#setup-wizard`). La scheda Settings non blocca nulla per i fornitori.

## developer.LOG_OUT_PROVIDER
- `Log out` is on a provider's row only when the row is Connected (`rules#developer.LOG_IN_PROVIDER`), in the Settings tab and in the `omp` step of the wizard; a row not connected or of unknown state has none.
- The click opens a modal editor warning first. Only its `Log out` button goes on; closing it (Esc, the close button, `Cancel`) does nothing.
- Confirmed, Trama runs `<omp> auth-broker logout <id>` without a terminal and without a shell, `<omp>` being the program of `rules#developer.LOG_IN_PROVIDER` (in the Settings tab the one of `trama.ompPath`, in the wizard the one of the step's path) and `<id>` the provider's id from the fixed list. omp removes every credential it stored for that provider (OAuth logins and keys saved by its login); it never removes environment variables, `.env` files, keys written in omp's model settings, nor Trama's Cursor API key (`rules#developer.REMOVE_CURSOR_API_KEY`).
- While the command and the following check run, the row's `Log out` shows the spinner and every button of that row (Log in, Log out and, on the Cursor row, the API key buttons) is unavailable; the other rows stay usable. A second click on the same row is therefore impossible until the check ends.
- The command fails when it exits with a code other than 0, cannot start, or has not finished within 30 seconds (then it is stopped). A failure shows the editor error of `ui#developer.LOG_OUT_PROVIDER` with the reason: the last non-empty line of omp's error output, or, without one, `exit code <n>`, `could not start omp` or `timed out`.
- Whatever the outcome, Trama then redoes the same checks as at the end of a login terminal: the Settings tab's and the wizard's `omp` step's, with the program used by the logout, when they are open. The wizard's choices stay, and `Cancel` does not undo the logout.
- After a successful logout, when the check made with the same program still lists the provider among the Connected ones, Trama shows the notice of `ui#developer.LOG_OUT_PROVIDER` once; with the models list in error (unknown state) it shows none. On the Cursor row a saved Cursor API key keeps the provider Connected: the same notice says so, and the key stays.

## developer.SET_CURSOR_API_KEY
- Solo `cursor` dell'elenco di `rules#developer.LOG_IN_PROVIDER` ha una chiave API in Trama; le righe degli altri fornitori non cambiano.
- Sulla riga Cursor, in ogni stato di collegamento (collegato, non collegato, sconosciuto), oltre a «Log in» / «Log in again» c'è il pulsante della chiave: «Set API key» senza chiave salvata, «Change API key» con una chiave salvata. Con una chiave salvata la riga dice «API key saved» e ha anche «Remove API key» (`rules#developer.REMOVE_CURSOR_API_KEY`). La riga sa solo se una chiave è salvata, mai quale.
- Il pulsante apre la casella di input dell'editor, mascherata e sempre vuota all'apertura, anche con una chiave salvata. La chiave confermata è il testo senza spazi attorno. Un testo vuoto o di soli spazi non si conferma: la casella resta aperta e dice «Enter a Cursor API key.». Esc, o la casella chiusa in altro modo, non cambia nulla. Non c'è nessun altro controllo di formato e nessuna verifica: Trama non chiama Cursor e non sa se la chiave è valida.
- Conservazione: la chiave sta solo nel portachiavi dell'editor (lo spazio segreto per utente di VS Code), una sola per utente, condivisa da tutte le finestre e da tutti i progetti; una chiave nuova prende il posto di quella di prima. Mai nelle impostazioni, in un file del progetto o di `.trama/`, nello stato dell'estensione, in un log o nel webview.
- Passaggio a omp: con una chiave salvata, ogni processo omp che Trama avvia riceve la variabile d'ambiente `CURSOR_ACCESS_TOKEN` con la chiave: i terminali dei lavori (design, scan, import, Run, Resolve Drifts, Unify Drifts) e di Ask more, le conversazioni di omp Chat compresa General, i terminali di login, il logout di `rules#developer.LOG_OUT_PROVIDER`, `omp models --json`, `omp usage --json`, la verifica della versione e l'aggiornamento di omp. Il valore di Trama prevale su un `CURSOR_ACCESS_TOKEN` dell'ambiente dell'editor. Senza chiave salvata Trama non aggiunge né toglie la variabile: omp riceve quella dell'ambiente, se c'è.
- Un processo riceve la chiave solo quando parte: un cambio vale per i processi avviati dopo; terminali e conversazioni già aperti non si chiudono, non si riavviano e non ricevono avvisi.
- Dopo il salvataggio Trama rifà subito le stesse verifiche della fine di un terminale di login (`rules#developer.LOG_IN_PROVIDER`): quella della scheda Settings (stato di omp, numero dei modelli, fornitori collegati e suggerimenti dei modelli) e quella del passo `omp` del wizard con il programma del passo, se sono aperti. Cursor è collegato con la regola di sempre: almeno un modello usabile con fornitore `cursor`.
- Nel wizard la chiave non è una scelta del wizard: si salva subito, non compare nel riepilogo, la conferma non la scrive e `Cancel` non la toglie. Una chiave che dà a omp dei modelli soddisfa la regola di `Next` del passo `omp` (`rules#setup-wizard`).
- Portachiavi che fallisce: salvare mostra l'errore dell'editor «Trama: could not save the Cursor API key: <motivo>.», nulla cambia e nessuna verifica si rifà. Una lettura che fallisce (all'attivazione o dopo un cambio) mostra «Trama: could not read the Cursor API key: <motivo>.» una volta per lettura fallita; finché non si legge, la riga è come senza chiave salvata e omp parte senza la chiave di Trama. Nessun ripiego in un file o nelle impostazioni.

## developer.REMOVE_CURSOR_API_KEY
- «Remove API key» c'è solo sulla riga Cursor e solo con una chiave salvata. Toglie la chiave dal portachiavi dell'editor subito, senza conferma, anche dal wizard, dove `Cancel` non la rimette.
- Dopo la rimozione Trama rifà subito le stesse verifiche di `rules#developer.SET_CURSOR_API_KEY`, e la riga torna a «Set API key» senza «API key saved» né «Remove API key». Trama non toglie un `CURSOR_ACCESS_TOKEN` dell'ambiente dell'editor: omp riceve di nuovo quello, se c'è.
- Un errore del portachiavi mostra «Trama: could not remove the Cursor API key: <motivo>.»; nulla cambia e nessuna verifica si rifà.

## editor.CURSOR_API_KEY_CHANGED
- Ogni finestra dell'editor segue il portachiavi: quando la chiave cambia o sparisce per mano di un'altra finestra, la finestra legge la chiave di adesso, la usa per gli omp che avvia da allora, aggiorna la riga Cursor e rifà le verifiche della scheda Settings e del passo `omp` del wizard, se sono aperti, come dopo un salvataggio. La finestra che ha fatto il cambio rifà le verifiche una volta sola.
