---
column: done
technical: false
refs:
  - agent-terminal/Agent running
  - requirements/tech#agent-terminal
drift: null
proposal: iyil1j92
agent: false
created: 2026-10-11T17:07:25.054Z
finished: 2026-10-11T17:13:58.551Z
---
# Quote the agent command for Windows PowerShell 5.1 and PowerShell 7 apart

Su Windows il terminale dell'agente riconosce la shell predefinita da `vscode.env.shell` e cita la riga del comando per ciascuna delle tre shell supportate: Git Bash (il `bash.exe` di Git for Windows) come le shell POSIX, PowerShell 7 (`pwsh.exe`) con le regole attuali per PowerShell, Windows PowerShell 5.1 (`powershell.exe`) con regole proprie. Windows PowerShell 5.1 toglie le virgolette doppie interne degli argomenti passati a un programma: ogni virgoletta interna, per esempio nel JSON di `--settings` e `--agents` di Claude Code, si scrive in modo che il programma la riceva intatta. Oggi `powershell.exe` e `pwsh.exe` hanno la stessa citazione e non esiste una citazione per Windows PowerShell 5.1. Il riconoscimento deve distinguere Git Bash da un altro `bash.exe` (per esempio quello di WSL in `System32`), che non è una shell supportata. Linux e macOS non cambiano.
