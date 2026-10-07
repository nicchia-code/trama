---
column: done
technical: false
refs:
  - panel/Open
  - panel/Closed/developer.OPEN_PANEL
  - panel/Closed/question-round.ROUND_OPENED
  - developer
  - requirements/ui#scan-hold
  - requirements/tech#General
drift: null
proposal: g0kh74u5
agent: false
created: 2026-10-07T05:28:51.467Z
finished: 2026-10-07T05:52:39.898Z
---
# Togliere dal pannello lo switch Multi-branch, il gruppo In worktree e le decisioni del giro

Nel pannello non resta traccia del multi-branch. Quando è fatto:

- Diagramma, Board e Requirements non hanno più lo switch `Multi-branch`; lo switch `Hold scan` sta subito dopo `Design…` in ogni barra, e nel Diagramma prima di `Scan`.
- La Board non ha il gruppo In worktree, `Remove from round`, `Abandon round`, il badge `worktree`, il Merge Drift né il Task di riconciliazione; i badge `blocked` portano sempre al Drift nel Diagramma.
- Il Diagramma e la scheda Requirements non offrono Proposal «(worktree)» legate a un Drift di un worktree.
- I messaggi fra pannello e host per accendere il multi-branch, togliere una Proposal dal giro, abbandonarlo, riconciliarlo e decidere o aprire file di un worktree non esistono più, e il quadro del pannello non porta più l'interruttore multi-branch né le Proposal o le schede dei worktree.
- Accettare una Proposal dal pannello, anche quella di un Drift, la applica sempre nella cartella aperta.
