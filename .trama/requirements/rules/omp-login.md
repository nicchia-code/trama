---
description: "Usa quando implementi il login ai fornitori di modelli di omp dalla scheda Settings e dal wizard di setup."
---
# Login dei fornitori di omp

## developer.LOG_IN_PROVIDER
- Elenco fisso dei fornitori, in quest'ordine, come id di omp · nome breve · abbonamento:
  1. `openai-codex` · ChatGPT · Plus/Pro (Codex)
  2. `anthropic` · Anthropic · Claude Pro/Max
  3. `github-copilot` · GitHub Copilot · Copilot subscription
  4. `google-gemini-cli` · Google Gemini CLI · Cloud Code Assist
  5. `google-antigravity` · Google Antigravity · Gemini, Claude, GPT-OSS
  6. `cursor` · Cursor · Cursor subscription
  7. `xai-oauth` · xAI Grok · SuperGrok or X Premium+
- L'elenco non si legge da omp e nessun altro fornitore di omp ha un pulsante. Trama non offre l'uscita da un fornitore.
- Collegato: un fornitore è collegato quando l'elenco dei modelli di omp (la chiamata di `tech#panel/Settings`, che dà solo i modelli usabili) ha almeno un modello il cui fornitore è l'id dell'elenco, qualunque sia il modo in cui omp vi accede (login, chiave API, variabile d'ambiente). Altrimenti non è collegato. Quando omp risponde ma il suo elenco dei modelli è in errore, lo stato di ogni fornitore è sconosciuto.
- La sezione c'è solo quando la verifica di omp dice che omp risponde: nella scheda Settings lo stato di omp, nel wizard la verifica del passo `omp`. Prima del primo esito dopo che la scheda o il passo si mostra la sezione non c'è; durante le verifiche seguenti tiene gli stati che aveva finché arriva l'esito nuovo, e sparisce se l'esito dice che omp non risponde.
- Il pulsante c'è per ogni fornitore dell'elenco, in ogni stato: «Log in» per un fornitore non collegato o di stato sconosciuto, «Log in again» per uno collegato, che fa lo stesso comando (omp rinnova l'accesso o aggiunge un altro account).
- A ogni clic Trama apre un terminale integrato nuovo e visibile che esegue il login di omp per quel fornitore, `<omp> login <id>`. `<omp>` è il programma omp di Trama (`tech#agent-launching`): nella scheda Settings quello di `trama.ompPath` salvata, nel wizard quello del percorso del passo `omp`, anche se non è ancora salvato. Il terminale si apre nell'area dei terminali qualunque sia `trama.terminalLocation`; più clic aprono più terminali, e Trama non chiude né riusa un terminale di login.
- Quando il comando del terminale finisce, o il terminale si chiude prima, Trama rifà la verifica di omp della scheda Settings (stato di omp, numero dei modelli, fornitori collegati e suggerimenti dei modelli) e la verifica del passo `omp` del wizard con il programma usato dal login (`rules#setup-wizard`), se sono aperti. Non guarda l'esito del login e non mostra avvisi: l'esito resta scritto nel terminale, che resta aperto finché il developer non lo chiude.
- Nel wizard `Next` del passo `omp` richiede, oltre a omp che risponde, almeno un modello usabile, di qualunque fornitore, anche fuori dall'elenco (`rules#setup-wizard`). La scheda Settings non blocca nulla per i fornitori.
