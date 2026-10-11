---
column: done
technical: true
refs:
  - requirements/tech#question-round
  - requirements/data#question-round
drift: null
proposal: null
agent: false
created: 2026-10-11T17:07:05.098Z
finished: 2026-10-11T17:23:31.561Z
---
# Document Windows cancellation and the window secret for trama ask

`docs/cli.md` dice che su Windows `SIGTERM` non arriva al processo e che `trama ask` si annulla con Ctrl+C, con la chiusura del suo output o della sua connessione, e che un processo ucciso senza preavviso conta come disconnessione appena l'editor vede chiudersi la pipe; oggi la sezione cita SIGINT e SIGTERM senza distinguere le piattaforme. La stessa sezione descrive la named pipe di Node senza ponte PowerShell, i permessi predefiniti di `%LOCALAPPDATA%\Trama\questions` e il segreto della finestra nei record di discovery (anche con `TRAMA_QUESTION_ENDPOINT`), al posto del paragrafo attuale sul ponte PowerShell e su `Add-Type` e della frase che elenca solo identità, endpoint e recenza del focus. Anche l'aiuto di `trama ask` in `--help` resta coerente.
