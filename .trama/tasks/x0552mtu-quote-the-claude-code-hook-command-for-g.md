---
column: done
technical: false
refs:
  - agent-terminal/Agent running
  - requirements/tech#agent-hook
drift: null
proposal: iyil1j92
agent: false
created: 2026-10-11T17:07:25.917Z
finished: 2026-10-11T17:22:31.310Z
---
# Quote the Claude Code hook command for Git Bash with forward slashes on Windows

Su Windows Claude Code esegue i comandi degli hook con Git Bash, qualunque sia la shell del terminale. Il comando di hook dentro il JSON di `--settings` (`<trama> agent-event idle`) è quindi sempre citato per Git Bash, con il percorso assoluto di `trama.exe` scritto a barre in avanti (per esempio `'C:/Users/…/bin/trama.exe' agent-event idle`); solo il JSON intero è poi citato per la shell del terminale (Windows PowerShell 5.1, PowerShell 7 o Git Bash). Oggi quel percorso è citato per la shell del terminale e con le barre del sistema. Su Linux e macOS non cambia nulla.
