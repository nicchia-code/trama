---
column: done
technical: true
refs:
  - requirements/tech#General
drift: null
proposal: null
agent: false
created: 2026-10-11T17:08:06.169Z
finished: 2026-10-11T17:17:11.855Z
---
# Package win32-x64 and build, test and smoke-test it on windows-latest

Il progetto produce un `.vsix` `win32-x64` con `trama.exe` dentro (nessun pacchetto arm64) e il flusso di rilascio lo costruisce e lo prova su `windows-latest` con le stesse fasi delle altre piattaforme: type-check, tutti i test e smoke test del binario estratto dal `.vsix` (`trama.exe --help`, `init`, `validate`, e `copilot-hook` con `{}` su standard input, che risponde `{}` ed esce con 0). Oggi i pacchetti sono solo `linux-x64` e `darwin-arm64`. A lavoro finito i test non dipendono da `process.getuid`, `/tmp`, `sh`, link simbolici o `SIGTERM` su Windows; ciò che su Windows non esiste si salta solo lì, con il motivo scritto nel test.
