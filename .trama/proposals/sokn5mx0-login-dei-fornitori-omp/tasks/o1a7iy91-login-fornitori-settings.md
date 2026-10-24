---
technical: false
refs:
  - panel/Settings
---

# Login fornitori in Settings

Nel tab Settings, nel gruppo omp di `SettingsPage` (`extension/src/webview/settings/index.tsx`), subito sotto `OmpStatusBox` e prima delle impostazioni, compare la sezione «Providers»: la stessa del passo omp del wizard. Questo Task la monta e la usa; il componente presentazionale condiviso in `extension/src/webview/setup-shared.tsx`, la costante `OMP_LOGIN_PROVIDERS`, il campo `providers?: string[]` in `ompStatus`/`agentCheck`, il messaggio `ompLogin { provider, ompPath? }` con `parseToHost`, la funzione dell'host che apre il terminale accanto a `installOmp` e le verifiche rifatte alla fine sono coperti da un altro Task.

La sezione elenca i sette fornitori con abbonamento che Trama conosce, in quest'ordine, una riga ciascuno: ChatGPT (Plus/Pro (Codex)), Anthropic (Claude Pro/Max), GitHub Copilot (Copilot subscription), Google Gemini CLI (Cloud Code Assist), Google Antigravity (Gemini, Claude, GPT-OSS), Cursor (Cursor subscription), xAI Grok (SuperGrok or X Premium+). Ogni riga mostra il nome breve, l'abbonamento come testo secondario, lo stato e il pulsante del login con l'icona `LogIn`. Un fornitore è collegato quando omp ha almeno un suo modello usabile, comunque omp vi acceda (il suo id compare in `providers` di `ompStatus`): la riga dice «Connected» con `CircleCheck` e il pulsante «Log in again»; gli altri dicono «Not connected» e «Log in». Nessun logout, nessun altro fornitore di omp.

Visibilità e stati:
- La sezione c'è solo quando l'ultimo `ompStatus` dice che omp risponde; prima del primo esito non c'è.
- Alla prima verifica compare con il suo esito; nelle verifiche seguenti le righe tengono l'ultimo stato dei fornitori finché arriva quello nuovo.
- Quando omp risponde ma `providers` manca (l'elenco dei modelli è in errore), le righe non mostrano lo stato e i pulsanti dicono «Log in».

Il clic su un pulsante, possibile solo quando omp risponde, invia `ompLogin { provider }` con l'id omp del fornitore e senza `ompPath`. L'host apre un terminale nuovo e visibile «Log in to <nome breve>» nell'area dei terminali; quando il comando finisce, riuscito o no, l'host rifà in silenzio la verifica (`refreshOmp(true)`) e il tab si aggiorna con il nuovo `ompStatus`, senza notifiche.

Test in `test/webview-settings.test.tsx`: sezione assente prima del primo esito e quando omp non risponde; ordine e testi delle sette righe; stato collegato/non collegato e testo del pulsante; righe senza stato con `providers` mancante; ultimo stato mantenuto durante una nuova verifica; il clic invia `ompLogin` con il solo `provider`.
