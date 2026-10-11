---
column: done
technical: true
refs:
  - requirements/tech#question-round
  - requirements/data#question-round
drift: null
proposal: null
agent: false
created: 2026-10-11T17:07:04.174Z
finished: 2026-10-11T17:21:06.604Z
---
# Use Node's named pipe on Windows and remove the PowerShell bridge

Su Windows la finestra ascolta sulla named pipe di Node (`net`, `\\.\pipe\trama-question-<uuid>`), senza nessun altro processo, e i record di discovery stanno in `%LOCALAPPDATA%\Trama\questions` con i permessi predefiniti, senza alcun controllo delle ACL. Il codice che avvia Windows PowerShell per creare la pipe (ponte con `Add-Type` e sorgente C# incorporato) e quello che lo avvia per verificare la cartella dei record spariscono, insieme ai punti che oggi falliscono chiusi se PowerShell non c'è. Linux e macOS mantengono socket Unix, permessi e controlli di oggi. La protezione dagli altri utenti locali sulla pipe viene dal segreto della finestra (Task collegato).
