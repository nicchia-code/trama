---
column: done
technical: true
refs:
  - requirements/tech#General
drift: null
proposal: null
agent: false
created: 2026-10-11T17:08:06.656Z
finished: 2026-10-11T17:20:00.591Z
---
# Say in the README that Windows is a preview and that trama.exe is unsigned

La README elenca Windows x64 accanto alle altre piattaforme e lo dice in anteprima, finché la verifica manuale di `docs/uat.md` su Windows 11 x64 (VS Code e Cursor, omp e Claude Code, Windows PowerShell 5.1, PowerShell 7 e Git Bash) non passa; `docs/uat.md` contiene quella verifica. La README dice anche che `trama.exe` non è firmato e che Windows SmartScreen o un antivirus possono avvisare al primo avvio, e che la riga di comando si distribuisce solo dentro il `.vsix`. Oggi la README non nomina Windows.
