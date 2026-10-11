---
column: done
technical: false
refs:
  - agent-terminal/Agent running
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
drift: null
proposal: iyil1j92
agent: false
created: 2026-10-11T17:07:25.441Z
finished: 2026-10-11T17:20:56.513Z
---
# Open the agent terminal in Windows PowerShell and warn once per window when the default shell is not supported

Su Windows, quando la shell predefinita dei terminali non è Windows PowerShell 5.1, PowerShell 7 o Git Bash (cmd, un profilo WSL o qualunque altra), il terminale dell'agente si crea con la shell di Windows PowerShell 5.1 solo per quel terminale, e la riga è citata per Windows PowerShell 5.1; il profilo predefinito del developer non cambia. Trama mostra un messaggio informativo senza pulsanti, in inglese e indipendente da `trama.language`: `Trama: the default terminal shell (<shell>) is not supported for agents on Windows; the agent runs in Windows PowerShell.`, con `<shell>` il nome del programma della shell predefinita (per esempio `cmd.exe` o `wsl.exe`). L'avviso compare solo la prima volta in quella finestra dell'editor: i terminali successivi della stessa finestra non lo mostrano più finché la finestra non si riapre. Per il resto la corsa non cambia: nome, hook, fine del comando e chiusura sono quelli di ogni terminale dell'agente. Oggi il terminale usa sempre la shell predefinita e la tratta come POSIX se non la riconosce.
