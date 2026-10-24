---
created: 2026-10-21T15:37:46.163Z
updated: 2026-10-21T15:37:46.163Z
summary: "Ogni finestra controlla ogni minuto, solo con lavori o Task presi, se l'agente c'è ancora: lavori non seguiti chiusi, Task rilasciati, ghost ritirati, avviso sulla Board, `trama task check` e `trama hook start`."
tasks:
  - z01qm7ia
  - yym5fvgm
  - g1kctrbn
  - mf6tycye
  - iun3pcny
  - 04qjmn5c
  - 4539ej14
  - dfek53vr
  - 3gucetfk
cleared:
  04qjmn5c:
    title: Annunci ritirati dal controllo
    proposal: u4osxzox
    tag: Controllo esecuzione
    finished: 2026-10-21T15:36:30.817Z
    refs:
      - announcement
      - requirements/rules#announcement
      - requirements/tech#announcement
      - requirements/ui#announcement
  z01qm7ia:
    title: Controllo di esecuzione
    proposal: u4osxzox
    tag: Controllo esecuzione
    finished: 2026-10-21T15:34:57.802Z
    refs:
      - time
      - agent-launching
      - requirements/rules#time
      - requirements/tech#time
  mf6tycye:
    title: Fine lavori dal controllo
    proposal: u4osxzox
    tag: Controllo esecuzione
    finished: 2026-10-21T15:31:10.876Z
    refs:
      - drift-resolution
      - requirements/rules#drift-resolution
      - requirements/data#drift-resolution
      - requirements/rules#agent-launching
      - requirements/tech#agent-launching
  g1kctrbn:
    title: Terminale con agente scomparso
    proposal: u4osxzox
    tag: Controllo esecuzione
    finished: 2026-10-21T15:26:31.565Z
    refs:
      - agent-terminal
      - requirements/rules#agent-terminal
      - requirements/quality#agent-terminal
  3gucetfk:
    title: Comando task check
    proposal: u4osxzox
    tag: Controllo esecuzione
    finished: 2026-10-21T15:25:18.892Z
    refs:
      - agent.CHECK_TASK
      - requirements/rules#agent.CHECK_TASK
      - requirements/tech#agent.CHECK_TASK
      - requirements/cli#General
  iun3pcny:
    title: Rilascio dei Task non seguiti
    proposal: u4osxzox
    tag: Controllo esecuzione
    finished: 2026-10-21T15:24:01.130Z
    refs:
      - task/Taken by the agent/time.CHECK_DUE
      - task/Taken by the agent/agent.CHECK_TASK
  dfek53vr:
    title: sessionEnd come interruzione
    proposal: u4osxzox
    tag: Controllo esecuzione
    finished: 2026-10-21T15:22:31.872Z
    refs:
      - editor-chat
      - requirements/tech#editor-chat
  yym5fvgm:
    title: Hook start di omp
    proposal: u4osxzox
    tag: Controllo esecuzione
    finished: 2026-10-21T15:22:30.540Z
    refs:
      - agent-hook
      - requirements/tech#agent-hook
  4539ej14:
    title: Avviso dei lavori non seguiti
    proposal: u4osxzox
    tag: Controllo esecuzione
    finished: 2026-10-21T15:22:03.262Z
    refs:
      - panel/Board
      - requirements/rules#panel/Board
      - requirements/tech#panel/Board
      - requirements/ui#time
---
# Controllo di esecuzione dei lavori

Il controllo di esecuzione (`time.CHECK_DUE`) scatta all'apertura del progetto e poi ogni minuto, solo mentre la finestra ha un lavoro o il progetto un Task preso. Guarda soltanto fatti certi: un agente vivo ma fermo resta in corso.

- Controllo di esecuzione, scheduler della finestra: z01qm7ia.
- Hook di omp `trama hook start <pid>`, che indica il processo dell'agente: yym5fvgm.
- Terminale con agente scomparso: Run finito, Task rilasciati, annunci ritirati, chiusura con `autoExit`: g1kctrbn.
- Fine dei lavori della chat mai legati e registro dei lavori: mf6tycye.
- Rilascio dei Task che nessuna finestra segue più: iun3pcny.
- Annunci ritirati con l'avviso per ogni ghost: 04qjmn5c.
- Avviso in cima alla Board `Trama stopped following <lavoro>: <motivo>.`: 4539ej14.
- `sessionEnd` aborted o error di Cursor come interruzione: dfek53vr.
- Comando `trama task check <id>` e passo della skill che lo usa: 3gucetfk.
