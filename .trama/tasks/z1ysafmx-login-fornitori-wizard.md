---
column: done
technical: false
refs:
  - setup-wizard/omp
  - requirements/rules#setup-wizard
  - requirements/ui#setup-wizard/omp
drift: null
proposal: sokn5mx0
agent: false
created: 2026-10-24T17:21:13.456Z
finished: 2026-10-24T17:31:29.474Z
---
# Login fornitori nel wizard

Nel passo omp del setup wizard, sotto il riquadro dello stato della verifica (`OmpStatusBox`), quando omp risponde compare la sezione «Providers», la stessa del gruppo omp della scheda Settings: il componente presentazionale condiviso in `extension/src/webview/setup-shared.tsx`. Il componente, la costante `OMP_LOGIN_PROVIDERS`, il campo `providers?: string[]` in `ompStatus`/`agentCheck`, il messaggio `ompLogin { provider, ompPath? }` con il suo `parseToHost` e la funzione dell'host che apre il terminale (accanto a `installOmp`) sono già forniti da un altro Task: questo Task li monta e li usa, senza ridefinirli.

La sezione mostra i sette fornitori con abbonamento, nell'ordine fisso: ChatGPT (Plus/Pro (Codex)), Anthropic (Claude Pro/Max), GitHub Copilot (Copilot subscription), Google Gemini CLI (Cloud Code Assist), Google Antigravity (Gemini, Claude, GPT-OSS), Cursor (Cursor subscription), xAI Grok (SuperGrok or X Premium+). Ogni riga ha il nome, l'abbonamento in testo secondario, lo stato («Connected» con l'icona `CircleCheck`, «Not connected», o niente quando non è noto) e il pulsante «Log in» o «Log in again» con l'icona `LogIn`. Nessun logout.

Un fornitore è collegato quando l'omp del passo ha almeno un suo modello usabile, con qualunque modo di accesso; i dati arrivano da `agentCheck` (campo `providers`). La sezione è assente quando omp non risponde e prima del primo risultato della verifica; durante le verifiche successive le righe mantengono l'ultimo stato. Se omp risponde ma l'elenco dei modelli dà errore, le righe non mostrano lo stato e il pulsante dice «Log in».

Il clic su un pulsante invia `ompLogin { provider, ompPath }` con il percorso di omp del passo, anche se non ancora salvato. Trama apre un terminale nuovo e visibile nell'area dei terminali, «Log in to <nome breve>», che esegue `<omp> login <id>`, come Install omp. Quando il comando del terminale finisce, riuscito o no, l'host rifà `checkAgent` con quel percorso e il passo aggiorna lo stato dei fornitori e il numero dei modelli, senza notifiche. Le scelte del wizard restano.

La verifica di omp si rifà ogni volta che il passo si mostra, quando il percorso del passo cambia, quando finisce il terminale di installazione e quando finisce un terminale di login.

Validità di `Next` in `extension/src/webview/wizard/logic.ts`: è disponibile solo quando la verifica dice che omp risponde con il percorso del passo e ha almeno un modello usabile (`models > 0`), di qualunque fornitore, anche fuori dall'elenco; il login non è obbligatorio. omp che manca, che non risponde o la cui verifica è in corso tiene fermo `Next` con tooltip e motivo «omp must answer before you go on.»; omp che risponde con zero modelli usabili lo tiene fermo con «omp has no models yet. Log in to a provider or set an API key.». Un aggiornamento fallito, con omp che risponde con dei modelli, non blocca `Next`.

Test: in `test/host-setup-wizard.test.ts` il messaggio `ompLogin` dal wizard apre il terminale con il percorso del passo e, alla sua fine, rifà `checkAgent` con quel percorso; nei test della logica del wizard la validità di `Next` con zero modelli, con modelli, con omp che non risponde e con i due tooltip.
