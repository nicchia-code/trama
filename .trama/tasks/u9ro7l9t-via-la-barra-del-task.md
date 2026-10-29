---
column: done
technical: false
refs:
  - task
  - requirements/ui#task/Taken by the agent
  - requirements/data#task/Taken by the agent
  - requirements/tech#task/Taken by the agent
drift: null
proposal: q90tj59p
agent: false
created: 2026-10-28T16:50:19.603Z
finished: 2026-10-28T16:51:41.386Z
---
# Via la barra del Task

Quando l'agente ha preso un Task (`task`, stato Taken by the agent), la sua scheda nella Board non mostra più alcun avanzamento: spariscono sia la barra di caricamento sotto l'intestazione sia il testo percentuale (es. `40%`) nell'intestazione. Il bordo ciano animato `.board-working` che segnala il lavoro in corso resta com'è.

Restano invariati: la dichiarazione dell'avanzamento da parte dell'agente (`trama task move <id> doing` con `{progress}`), i file in `.trama/progress/`, `src/core/progress.ts` e il testo da riga di comando "(agent working, 40%)" in `src/cli/work.ts`, il testo delle skill e `docs/cli.md`. La barra globale di `Run all` (`extension/src/webview/board/parts.tsx:90-93`) non si tocca. Il componente `extension/src/webview/ui/progress.tsx` e la dipendenza `@radix-ui/react-progress` restano, perché li usa il wizard (`extension/src/webview/wizard/index.tsx:14,87`).

Il dato `progress` non serve più alla Board: va tolto da `TaskCard` e da `TaskView` (con il calcolo via `taskProgress` nello snapshot) se nessun altro lo usa; i test vanno aggiornati per verificare che la scheda di un Task preso non mostri né barra né percentuale.

- `extension/src/webview/board/cards.tsx:394` — testo `40%` nell'intestazione della scheda
- `extension/src/webview/board/cards.tsx:413-421` — barra `<Progress aria-label="Agent progress">`
- `extension/src/webview/board/cards.tsx:11` — import di `Progress`, da togliere
- `extension/src/webview/board/logic.ts:241-242,591` — campo `TaskCard.progress`
- `src/core/snapshot.ts:210-211,553` — `TaskView.progress` calcolato con `taskProgress`
- `test/board-render.test.tsx:442-452` — test della barra e del `40%`; fixture a `:93` e `:612`
- `test/board-logic.test.ts:42` — fixture con `progress`
