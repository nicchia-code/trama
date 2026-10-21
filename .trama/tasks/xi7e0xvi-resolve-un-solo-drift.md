---
column: done
technical: true
refs:
  - requirements/ui#drift-resolution
drift: null
proposal: c9fp4trm
agent: false
created: 2026-10-21T05:42:19.328Z
finished: 2026-10-21T05:59:29.701Z
---
# Resolve su un solo Drift nella Board

Quando il Task è fatto la Board lancia Resolve Drifts soltanto da `Resolve` sulla scheda rossa di un Drift in `Backlog`, e solo su quel Drift.

- Il pulsante `Resolve all` non c'è più, né in fondo a una colonna né nella barra della Board (`webview/board/index.tsx`, `board/logic.ts`), e il webview non manda mai `resolveDrifts` senza l'identità di un Drift.
- Mentre l'agente di risoluzione lavora, `Run all` e il `Run` di ogni Task sono disabilitati allo stesso modo con il motivo `Drifts are being resolved`; con altri motivi il tooltip li dà tutti, a partire da questo, nell'ordine della Board.
- Il ghost della Proposal annunciata da `Resolve`, con qualunque agente, sta in `System Activities` con tipo `Resolve` e titolo `Resolving Drift <numero breve>` fino alla consegna; mentre il round di domande è aperto la sua riga di fase è `Waiting for your answers`.
- Spariscono l'indicatore `delegated` sulle schede gialle, il badge `autopilot failed` (anche nei dettagli del Diagramma, `diagram/panel.tsx`), l'avviso `Trama: the automatic Drift step did not reach the agent, so it is paused. Resolve Drifts or start a scan to resume it.` e l'errore `Drift autopilot: <motivo>`, con `autopilotFailed`, `autopilotModes`, `autopilotNote`, `failedReasons` e `FailedBadge`.
- La scheda gialla di una risoluzione `nonBlocking: true` ha accanto al titolo il badge `blocks nothing` con tooltip e nome accessibile `Filed by the experimental Drift blocker: these Drifts block no Task. Approve or reject it like any resolution.`, senza cambiare pulsanti o righe; `trama project show` e `trama proposal list` la segnano `(blocks nothing)`.
- I test della Board (`test/board-logic.test.ts`, `test/board-render.test.tsx`) provano questo comportamento.
