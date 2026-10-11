---
column: done
technical: false
refs:
  - agent-terminal/Agent running
  - requirements/tech#editor-chat
drift: null
proposal: iyil1j92
agent: false
created: 2026-10-11T17:07:27.267Z
finished: 2026-10-11T18:03:09.554Z
---
# Give Copilot's and Cursor's hook files a Windows form and recognise both forms on update

Su Windows la forma del comando degli hook è quella che la shell degli hook di ciascun editor accetta. Il file degli hook di Copilot porta accanto a `command` la variante `windows` del comando nella forma provata (per PowerShell `& "<percorso assoluto di trama.exe>" copilot-hook`); `hooks.json` di Cursor contiene la forma provata per Cursor. Il riconoscimento delle voci di Trama accetta sia la forma di oggi sia quella di Windows, così Update skills sostituisce le voci vecchie invece di aggiungerne altre. Oggi entrambi i file scrivono solo `"<percorso>" copilot-hook` e `"<percorso>" cursor-hook`, e il riconoscimento delle voci di Cursor accetta solo quella forma. La forma di Cursor non è documentata: se non si può provare, chi realizza il Task la riporta al developer con un Drift sui Requisiti.
