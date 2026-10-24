---
refs:
  - panel/Board
  - panel/Closed/developer.SHOW_BOARD
  - panel/Open/developer.SHOW_BOARD
  - panel/Closed/developer.OPEN_GHOST_DETAILS
  - panel/Open/developer.OPEN_GHOST_DETAILS
  - panel/Settings/developer.CONFIRM_SETUP
  - panel/Settings/developer.CANCEL_SETUP
  - panel/Get Started/developer.INITIALIZE_PROJECT
  - panel/Get Started/workspace.MODEL_CHANGED
  - panel/Settings/developer.INSTALL_OMP
  - setup-wizard/omp/developer.INSTALL_OMP
  - requirements/ui#panel/Board
  - requirements/ui#panel
  - requirements/ui#developer.UNIFY_DRIFTS
  - requirements/ui#developer.REWORK_PROPOSAL
  - requirements/tech#developer.UNIFY_DRIFTS
  - requirements/tech#developer.REWORK_PROPOSAL
  - requirements/rules#task
  - requirements/rules#developer.CLEAR_DONE
  - requirements/rules
  - requirements/tech
  - requirements/ui
---
# Board senza Add Quick Task

Quando il Task è fatto, la Board non offre più Add Quick Task: per un lavoro rapido il developer scrive nella conversazione General di omp Chat (vedi `omp-chat-general`), che però appartiene ad altri Task.

Nelle Aree `rules`, `tech` e `ui` dei Requisiti questo Task riguarda solo le sezioni di Add Quick Task che spariscono (i frammenti `quick-task`, con la sezione `developer.OPEN_QUICK_TASK`): il loro codice si toglie qui; le altre sezioni di quelle Aree appartengono ai Task che le nominano.

## Pulsante diviso di Backlog

- Il pulsante diviso `+ Add Work Item` in fondo a `Backlog` resta com'è oggi (due `Button` `outline` con bordo tratteggiato, `Plus` e freccetta `ChevronUp`, tutto dentro la colonna, tooltip e nomi accessibili invariati; la parte principale manda `writeDesignRequest`).
- La freccetta apre il `DropdownMenu` (`side="top"`) con una sola voce, senza icona: `Unify Drifts`, con tooltip `Merge every open Drift into one Drift to resolve`. Il menu non ripete `+ Add Work Item` e non ha più `Add Quick Task`. Scegliere la voce abilitata chiude il menu; Esc, un clic fuori o un nuovo clic sulla freccetta lo chiudono senza fare nulla e il focus torna alla freccetta. La freccetta è sempre abilitata; solo `Unify Drifts` può essere disabilitata, con i suoi motivi di sempre. Testi in inglese, senza `trama.language`.
- I requisiti del pulsante diviso, prima in `ui#developer.OPEN_QUICK_TASK` e `tech#developer.OPEN_QUICK_TASK` (frammenti `quick-task.md`, ora rimossi), stanno in `requirements/ui#panel/Board` e `requirements/tech#developer.UNIFY_DRIFTS`; i rimandi di `ui#developer.UNIFY_DRIFTS`, `ui#developer.REWORK_PROPOSAL` e `tech#developer.REWORK_PROPOSAL` puntano lì. Il comportamento del pulsante non cambia; l'unica differenza visibile è la voce tolta. Nella mappa delle icone di `requirements/ui#panel` la voce del menu senza icona è `Unify Drifts`.

## Codice da togliere

- La voce `Add Quick Task` di `items` in `extension/src/webview/board/index.tsx` (~262).
- Il messaggio `{ type: "openQuickTask" }` in `extension/src/protocol.ts` (~63-64), la sua validazione in `extension/src/host/messages.ts` (~115) e il suo caso nel controller (`extension/src/host/controller.ts` ~799-805, e l'import ~22).
- `openQuickTask` in `extension/src/host/agent.ts` (~607-616). `openFocusedTerminal`, `quickCommandLine` e `quickOptions` (`extension/src/host/terminal-agent.ts` ~44, ~65) oggi servono anche ad Ask more (`openAskMore`, agent.ts ~671): un altro Task di questa Proposal rende Ask more indipendente dal Quick Task (`developer.ASK_MORE`); si tolgono qui solo se Ask more non li usa più, altrimenti restano, con commenti che non parlano più di Quick Task.
- I test di Add Quick Task: in `test/board-render.test.tsx` (~654-699, ~746) quelli che aprono il menu cercando `Add Quick Task` o si aspettano `openQuickTask`, sostituiti da un test che prova che la freccetta apre il menu con la sola voce `Unify Drifts` (e che `Unify Drifts` disabilitata resta nel menu e non manda nulla); in `test/host-messages.test.ts` (~16) l'attesa di `openQuickTask`, che ora dev'essere rifiutato come messaggio sconosciuto; in `test/host-agent-terminals.test.ts` i test del terminale e della conversazione `Quick` (~433-462, ~534-580, ~2525-2563), spostando su Ask more o su un altro terminale ciò che provano ancora di valido (focus con `editor`, programma omp citato); in `test/host-terminal-agent.test.ts` (~25-27) i casi di `quickCommandLine`, solo se la funzione sparisce.
- Restano i nomi `Quick` usati come dati qualsiasi nei test di omp Chat. La spiegazione del ghost `Quick` in `extension/src/webview/board/logic.ts` (~674) e il suo test in `test/board-logic.test.ts` (~377) spariscono, ma con il Task di Ask more (`requirements/ui#announcement`). Riprendere le conversazioni `Quick` salvate e la conversazione General sono di altri Task.

## Run e Clear

- `requirements/rules#task`: `Run all` e il Run di un Task non sono disponibili mentre un Run lanciato da Trama non è finito; scan, design, import, Resolve Drifts, Ask more e la conversazione General di omp Chat non ne sono toccati. `requirements/rules#developer.CLEAR_DONE`: mentre un Run non è finito Clear è disabilitato con `A run is in progress`; le altre attività (scan, design, import, risoluzione, unificazione, Ask more, la conversazione General) non fermano Clear. Nessun motivo dei pulsanti nomina più Quick Task; General e Ask more non registrano lavori, quindi non entrano in `driftWork()` né nei motivi di `Run all`, del Run, di `Resolve` o di Clear. Che General non sia un lavoro di Trama è garantito dal Task di General; qui basta che la Board non li conti.

## Transizioni del pannello

- `panel/Closed/developer.SHOW_BOARD`, `panel/Open/developer.SHOW_BOARD`, `panel/Closed/developer.OPEN_GHOST_DETAILS`, `panel/Open/developer.OPEN_GHOST_DETAILS`, `panel/Settings/developer.CONFIRM_SETUP`, `panel/Settings/developer.CANCEL_SETUP`, `panel/Get Started/developer.INITIALIZE_PROJECT` e `panel/Get Started/workspace.MODEL_CHANGED` portano alla Board, o alle Settings, il cui testo è cambiato; non richiedono altri cambiamenti oltre a quanto sopra (e all'Intent Tracing nelle Settings, di un altro Task).
- `panel/Settings/developer.INSTALL_OMP` e `setup-wizard/omp/developer.INSTALL_OMP` portano a `developer.INSTALL_OMP`, che ora si preme anche dentro General quando omp manca: quel caso è del Task di General; Settings e procedura guidata restano come sono.
