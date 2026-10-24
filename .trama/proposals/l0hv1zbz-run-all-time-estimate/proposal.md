---
status: approved
base:
  editor-panel/panel.md: e6be713a384875439b31edac6eaafbcd598e4631d08827dda1bc0ead9c5473ca
  requirements/rules/run-paralleli.md: 602eabb4eb259534f7e5a9cb6c77405ce19d5e2ed000571462f7187ebc88d612
  requirements/rules/scans.md: 2b2872ead7e396540e1418ba2937580555439d5ad170e362129dae29ea9d0bc5
  requirements/ui/run-estimate.md: new
  requirements/tech/run-estimate.md: new
  requirements/tech/scans.md: bef31d1b86f788855c2be0c9c0f7d09c5bbd864488f7cee977d2b8e6d2fbae9c
delete: []
created: 2026-10-24T16:11:48.105Z
label: Run all ETA
---
# Run all time estimate

Durante un Run all il developer non sa quanto manca. La percentuale dichiarata dall'agente sui Task è un giudizio, non una misura. Le registrazioni dei tempi (`.trama/timings/`) contengono già il piano della Run (scelte `order` e `conflict`) e la durata dei Task passati. Provata a ritroso su 9 Run di questo progetto, una stima a percorso critico calcolata al piano era entro un fattore 2 dalla durata vera in 7 casi su 9 (errore tipico circa ×1,45). Trama la calcola da sola, senza agente e senza modelli.

Decisioni:
- Durante un Run all il pulsante `Run all` mostra la stima al posto del suo nome, resta disabilitato con i motivi di oggi.
- Forma: forchetta (stima ×0,7 e ×1,5), per esempio `~15–35 min left`.
- Pesi: media delle durate passate sopra i 30 s, con costanti di riserva (9 min, 1 min per un Task di correzione) quando la storia ha meno di 10 durate.
- Solo Run all, sequenze per modello comprese; il Run di un Task non ha stima.
- La skill `trama-implement` registra ogni unione di gruppi anche come `order`, così il piano non perde quelle catene.
- Prima della stima il pulsante dice `Estimating time left…`.
- Ricalcolo a ogni registrazione dei tempi del Run e una volta al minuto.
- Icona `Clock` al posto di `Play` mentre mostra la stima.
- Oltre il limite alto della prima stima il pulsante dice `Taking longer than expected`; la forchetta ricalcolata resta nel tooltip.
- Sequenza per modello: Run uno dopo l'altro sommano le stime, Run insieme prendono la più lunga; un Run non partito conta i suoi Task in fila.
- Nome accessibile: `Run all, about 15 to 35 minutes left`, poi i motivi di disabilitazione come oggi.

Scelte dell'agente, da controllare:
- Avvio 0,5 min finché nessun Task del Run è preso; coda 2,5 min, dopo l'ultimo Task la coda che resta, mai meno di 0,5 min.
- Un Task In progress pesa il suo peso meno il tempo da quando è preso, mai meno di 1 min.
- Tempo dei Task con Parallel Execution: il più grande fra il percorso più lungo delle attese e la somma dei pesi divisa per i posti del Run.
- Con un limite alto da 60 min in su la forchetta si scrive in ore, arrotondate alla mezz'ora (`~1–2.5 h left`).
- Un Run che aspetta un posto in una sequenza in parallelo parte dopo la stima più breve fra i Run partiti.
- La stima non scrive nulla sotto `.trama/` e non cambia `trama timing list`.

## Already present
- `panel/Closed/developer.SHOW_BOARD` — `extension/src/webview/shell.tsx` (vista `board` di `PROJECT_VIEWS`) e `extension/src/host/controller.ts` (`navigate`)
- `panel/Open/developer.SHOW_BOARD` — `extension/src/webview/shell.tsx` e `extension/src/webview/menu/app.tsx`
- `panel/Closed/developer.OPEN_GHOST_DETAILS` — `extension/src/host/controller.ts` (`openGhostDetails`, `pendingView` con `ghost`)
- `panel/Open/developer.OPEN_GHOST_DETAILS` — `extension/src/host/controller.ts` (`openGhostDetails`, `navigate` con `ghost`) e `extension/src/host/activities-item.ts`
- `panel/Settings/developer.CONFIRM_SETUP` — `extension/src/webview/settings/index.tsx`
- `panel/Settings/developer.CANCEL_SETUP` — `extension/src/webview/settings/index.tsx`
- `panel/Get Started/developer.INITIALIZE_PROJECT` — `extension/src/webview/main.tsx` e `extension/src/host/controller.ts`
- `panel/Get Started/workspace.MODEL_CHANGED` — `extension/src/webview/main.tsx` e `extension/src/host/controller.ts`
