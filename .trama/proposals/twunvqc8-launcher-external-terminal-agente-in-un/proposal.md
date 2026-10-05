---
status: approved
base:
  actors/terminal.md: 824803d594f72db78412c27856e92320b3d52c47088e2dd2b9f0e2e7ae5eaec1
  agent-launching/agent-terminal.md: 5352857f119f2cc7175858d088a92a31401bfacad14823b1df590df6cbcc33a9
  agent-launching/feature.md: ee49585773ef650ed83e8cc087bb7801b3ac513f00ddbf7c12a8c16fea59ab65
  work/announcement.md: 2af3e34703a1887ba9980d4ec20fcd4623534002f9e861717157f5ba4203155c
  away-notifications/feature.md: 6d43b4057c883402bc6bd29f3b21336268f62c694095c7adcc2c21544a49a4aa
  requirements/tech.md: f9ebb67c5d94a91f905609967df54e6a3dd2b01e34d9d6fa4d569f27c597af15
  requirements/rules.md: 9fddf015ea8f39a28315d185183876b920a3048588887f9475aa5caac0d681c4
  requirements/ui.md: 215bcd81a5388b7b9c2146ae6e895bf0d59be5a63fab4ff214bac0aad8eba88b
  requirements/quality.md: 3de88527de4392376d19d7eae6c0bfa192f48985a529ae2a7f263e1d88b1b8c6
delete: []
created: 2026-10-05T09:05:45.202Z
---
# Launcher external-terminal: agente in un terminale esterno

Aggiunge a `trama.agentLauncher` il valore `external-terminal`: Trama apre l'agente in una finestra del terminale di sistema dell'utente invece che nel terminale integrato dell'editor.

Decisioni dell'intervista:
- Rilevamento: automatico (Linux: `TERMINAL`, `xdg-terminal-exec`, `x-terminal-emulator`, elenco di terminali noti; macOS: Terminal.app) più impostazione di override `trama.externalTerminalCommand`.
- Fine del comando tracciata: il comando è avvolto e, finito, avvisa l'estensione; la chiusura a mano della finestra non è rilevata.
- A comando finito la finestra resta aperta con una shell.
- Una finestra libera si riusa solo con Terminal.app, kitty e WezTerm; con l'override e con ogni altro terminale si apre sempre una finestra nuova.
- Se il riuso fallisce si apre una finestra nuova e il developer ne è avvisato.
- La scansione automatica dopo l'approvazione apre la finestra da sola, come con il terminale integrato.
- Se il terminale esterno non si può aprire: errore chiaro e istruzione negli appunti, nessun ripiego.

Ipotesi mie (da controllare): `auto` non cambia; il terminale dei worktree non cambia; Windows resta fuori perché l'estensione non è pubblicata per Windows; il PATH del programma `trama` incluso, `TRAMA_AGENT` e `TRAMA_TERMINAL` arrivano anche alla finestra esterna; un workspace remoto conta come «non si può aprire»; le domande dell'agente nella finestra esterna vanno alla finestra dell'editor che l'ha avviata, come per il terminale integrato.
