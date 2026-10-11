---
column: done
technical: false
refs:
  - agent-terminal/Agent running
  - requirements/rules#agent-terminal
drift: null
proposal: iyil1j92
agent: false
created: 2026-10-11T17:07:26.391Z
finished: 2026-10-11T17:23:40.748Z
---
# Tell Cursor's chat the full path of trama.exe on Windows

Nella chat di Cursor su Windows la seconda riga dell'istruzione, dopo la frase della lingua se c'è, è `The trama command may not be on your PATH. Run it by its full path: <percorso assoluto di trama.exe incluso nell'estensione>`, senza un comando di shell, perché la shell dell'agente di Cursor su Windows non è nota. Oggi la riga è sempre `export PATH=…`, che su Windows non ha senso. Senza un programma incluso per la piattaforma la riga non c'è; su Linux e macOS resta `export PATH="<cartella>:$PATH"`; con il terminale e con la chat di Copilot l'istruzione resta di una riga.
