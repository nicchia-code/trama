---
column: done
technical: true
refs:
  - requirements/tech#agent-terminal
drift: null
proposal: null
agent: false
created: 2026-10-11T17:07:26.841Z
finished: 2026-10-11T17:26:19.330Z
---
# Test the agent command quoting of each Windows shell by running it in the real shell

La citazione di ognuna delle tre shell ha test che eseguono davvero la riga nella shell e controllano gli argomenti ricevuti dal programma, con JSON con virgolette, spazi, `$`, backtick e caratteri non ASCII. Su `windows-latest` girano con Windows PowerShell 5.1, PowerShell 7 e Git Bash; su Linux e macOS con `sh`. Oggi i test di citazione controllano solo le stringhe prodotte per PowerShell e cmd e provano la shell vera solo per POSIX.
