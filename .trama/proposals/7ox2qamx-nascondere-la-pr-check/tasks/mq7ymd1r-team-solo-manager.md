---
refs:
  - editor-panel
  - team
  - panel
  - menu-laterale
  - manager-mode
  - developer.SHOW_TEAM
  - developer.REFRESH_TEAM
  - requirements/rules#manager-mode
  - requirements/ui#panel/Team
  - requirements/ui#menu-laterale
  - requirements/tech#panel
  - requirements/tech#menu-laterale
technical: false
---

# Team solo in Manager mode

A lavoro finito la vista Team, la voce `Team` del menu laterale e il comando `Show Team` esistono solo con Team disponibile: Manager mode registrata nella copia di lavoro e origin su GitHub (`requirements/rules#manager-mode`). Con Manager mode spenta, o origin non su GitHub, nessuno dei tre c'è, come nella 0.1.1. La PR Check è nascosta, quindi la vista Team non ha più la scheda `Pull Requests` né un ramo "senza Manager": le sue schede sono, in quest'ordine, `Decisions`, `Issues`, `Timeline` e `People`. Riabilitare la PR Check richiede una nuova Proposal. Le Feature `editor-panel` e `team` lo dicono così: la settima vista del pannello, Team, c'è solo con Manager mode acceso e origin su GitHub, con le persone del team del Manager e il loro lavoro; la PR Check, che la offriva a tutti, è nascosta. Delle Feature `editor-panel` e `team` questo Task cambia solo la vista Team e il suo accesso; il resto delle due Feature non cambia.

## Menu laterale

Nello stato Project del menu laterale la voce `Team` (icona `Users`) sta subito dopo `History` e prima della linea solo con Team disponibile, con il numero delle handoff che aspettano la decisione del Manager; senza Team disponibile la voce non c'è e non lascia spazio, e il menu segue Manager mode e origin appena cambiano. Il campo `team` di `menuState`, che seguiva la sola origin (`team: status.repository !== null` in `extension/src/host/menu/view.ts:184-191`, e `extension/src/host/menu/model.ts:28-29,83-85`), sparisce: la voce è guidata da `manager` (`manager: status.available`). Vanno adeguati `projectEntries` in `extension/src/webview/menu/logic.ts:11-12` e `extension/src/webview/menu/app.tsx:25-26`, e il tipo del messaggio in `extension/src/menu-protocol.ts`.

## Show Team

`developer.SHOW_TEAM`: con Team disponibile, dal menu o con `trama.showTeam` (`extension/package.json:72-75`), il pannello si apre in primo piano sulla vista Team, o passa a Team se è già aperto; in Get Started la vista non c'è. Senza Team disponibile `show team` del menu e `trama.showTeam` fanno l'apertura ordinaria di `trama.open`, o con il pannello già aperto lasciano la vista com'è. La guardia oggi basata su `originRepository` (`extension/src/host/controller.ts:365-369`) deve usare Team disponibile (Manager mode registrata + origin su GitHub; helper in `controller.ts:167-176` `originRepository`/`teamRepository`, `:1013-1023` `teamTarget`/`managerTarget`, `extension/src/host/team/github.ts:181-184` `githubTarget`); anche `navigate` con `team` senza Team disponibile apre `board`.

Nella webview la vista Team esiste solo con l'`available` di `managerMode`, non con la presenza di un repository: `team: message.repository !== null` in `extension/src/webview/main.tsx:36,42-46,143-145` e l'uso in `extension/src/webview/shell.tsx:21-22,48,61` seguono `available`.

## Manager mode spenta

`manager-mode.TURNED_OFF` (da On a Off, dalla scheda Settings o dal wizard): la voce Team e la vista Team spariscono e un pannello che mostrava Team passa alla Board; lo stesso quando origin smette di essere su GitHub. L'host manda `navigate` con `board` (`postManager` in `controller.ts:918-929`, `setManager` → `openedTeam` in `:1186-1197`); oggi la webview resta su Team mostrando solo le pull request (`extension/src/webview/team/index.tsx:72-77`): quel comportamento va tolto. Spegnere Manager mode cancella solo il file di Manager mode.

## Schede e testi

`TEAM_TABS`, `teamTabs` e `shownTab` in `extension/src/webview/team/logic.ts:191-205` e la barra in `team/index.tsx:127-134` danno sempre `Decisions`, `Issues`, `Timeline`, `People`, mai `pull-requests`; la vista apre sulla prima scheda e ricorda la scelta finché il pannello resta aperto. I testi senza Manager di `GitHubBanner` (`extension/src/webview/team/github.tsx:140,188-191,219-227,245-253,281`) e `PULL_REQUESTS_READ_ERROR_TITLE` (`logic.ts:207-208`) diventano irraggiungibili e vanno rimossi se non servono più ad altro; il codice della PR Check resta (vedi la Task della PR Check).

## Refresh

`developer.REFRESH_TEAM` e il mostrare la vista Team leggono solo lo stato della riga di comando GitHub, il Project collegato con campi e iterazioni e le issue; non leggono nessuna pull request (`readGitHub`, `openedTeam`, `viewChanged team` in `controller.ts:1025-1061,1097-1101,1555`). La rimozione della chiamata a `readPullRequests`, di `postPullRequests` e della cancellazione dei report spetta alla Task che nasconde la PR Check. Durante la lettura Refresh non è disponibile e la vista tiene ciò che mostra.

## Test

I test che fissano "Manager mode spenta = solo Pull Requests" vanno riscritti per il nuovo comportamento (nessuna vista/voce Team senza Manager mode, passaggio alla Board, schede senza `Pull Requests`): `test/webview-team.test.tsx:78-126`, `test/menu-model.test.ts:103-137`, `test/menu-webview.test.tsx:316-364`, `test/webview-shell.test.tsx:38-53`, `test/webview-team-timeline.test.tsx:378-381`. I test unitari della PR Check restano.
