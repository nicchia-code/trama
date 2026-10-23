---
column: done
technical: false
refs:
  - panel/Board
  - panel/Open/developer.SHOW_BOARD
  - task
  - requirements/rules#task
  - requirements/rules#developer.OPEN_QUICK_TASK
  - requirements/rules#developer.UNIFY_DRIFTS
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
  - requirements/ui#panel/Board
drift: null
proposal: 54yy16h2
agent: false
created: 2026-10-23T08:09:20.219Z
finished: 2026-10-23T09:08:43.693Z
---
# Via Submit While Running

Quando il Task è finito, l'impostazione `trama.submitWhileRunning` e la sua funzione non esistono più: due Run lanciati da Trama dalla stessa finestra non lavorano mai insieme.

- `Run all` e il Run di ogni Task sono sempre disabilitati mentre un Run lanciato da Trama non è finito (scan di fine corsa compreso, fra quelli lanciati dalla stessa finestra), con il motivo `A run is in progress`, come oggi con l'impostazione spenta; nessuna impostazione lo cambia. Quando valgono più motivi, il tooltip e la descrizione accessibile li danno tutti, in quest'ordine: `Drifts are being resolved`, poi `A run is in progress`, poi gli altri motivi (un Task preso dall'agente, tutti i Task bloccati).
- Una richiesta di Run che arriva comunque all'editor in quel momento è rifiutata come per gli altri motivi (`A run cannot start: …` in `extension/src/host/controller.ts`).
- Scan, design, import, Resolve Drifts e Add Quick Task restano avviabili durante un Run; un Quick Task non è un Run e non è mai rifiutato per un altro lavoro in corso. Una sequenza di Run per modello conta sempre come un solo Run.
- Unify Drifts resta indisponibile con il motivo `A run is in progress` mentre un Run lanciato da Trama non è finito.
- Nel codice: `extension/src/host/controller.ts` non legge più `submitWhileRunning` (né per `runReason` del quadro della Board né per il rifiuto del lancio); `runWindowBlocker` in `src/core/resolution.ts` perde il parametro dell'impostazione; i commenti che la citano (`ownWindowRuns`, `unifyDriftsBlockers`) non la citano più. La dichiarazione esce da `extension/package.json`, dal gruppo di `SETTING_GROUPS` (`extension/src/host/settings-schema.ts`) e dal passo `Advanced` del wizard (`extension/src/webview/wizard/logic.ts`); l'avviso «The workspace setting overrides this» resta solo per `trama.skillsDir` e `trama.language`.
- Un valore rimasto nelle impostazioni utente o del workspace è ignorato e non viene riscritto.
- Test: `test/resolution.test.ts` perde i casi con l'impostazione accesa, `test/prepared-resolve-instant.test.ts` non passa più il secondo argomento, `test/settings-schema.test.ts` non la elenca, e `test/wizard-view.test.tsx` usa come casella d'esempio del passo Advanced un'altra impostazione. Il caso Y1 di `docs/uat.md` verifica che `Run all` e il Run di un Task restano indisponibili mentre un Run è in corso. `CHANGELOG.md` ha una voce nuova: «Removed `trama.submitWhileRunning`: Run and Run all are always unavailable while a Trama run is in progress; a leftover value is ignored.»; le voci vecchie non cambiano.
- Le conversazioni e i terminali di Trama continuano a tenere ciascuno i propri Task: la fine del turno di una conversazione della chat rilascia solo i Task di quella conversazione.
