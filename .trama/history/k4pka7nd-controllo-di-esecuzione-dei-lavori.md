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
