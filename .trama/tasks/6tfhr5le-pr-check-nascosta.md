---
column: done
technical: false
refs:
  - pr-check
  - pull-request-check
  - pull-request-report
  - developer.CHECK_PULL_REQUEST
  - developer.STOP_PULL_REQUEST_CHECK
  - github.PULL_REQUEST_GONE
  - requirements/rules#pr-check
  - requirements/ui#pull-request-check
  - requirements/tech#pr-check
  - requirements/quality#agent-launching
drift: null
proposal: 7ox2qamx
agent: false
created: 2026-10-28T18:32:45.016Z
finished: 2026-10-28T18:35:12.386Z
---
# Nascondere la PR Check

Al termine nessuna superficie di Trama offre la PR Check e Trama non legge più alcuna pull request da GitHub. La decisione del developer è definitiva: per riattivarla serve una nuova Proposal.

Cosa deve valere, come dice il Modello:

- `pull-request-check` resta sempre in Idle: `developer.CHECK_PULL_REQUEST` e `developer.STOP_PULL_REQUEST_CHECK` non possono accadere. Il dispatch dei messaggi del controller (`extension/src/host/controller.ts`, circa righe 1606-1613) ignora `checkPullRequest` e `stopPullRequestCheck` senza fare nulla: non chiama `checkPullRequest`/`stopPullRequestCheck` né `PrChecks.start`/`stop`. `parseToHost` (`extension/src/host/messages.ts:339-342`) può continuare a validarli. Nessuna PR Check può partire, quindi nessun lancio `prCheck`.
- Trama non esegue mai `gh pr list`: né quando la vista Team viene mostrata né a Refresh. In `readGitHub` (controller.ts circa 1025-1035) la chiamata a `readPullRequests` sparisce e Refresh legge solo Project e issue del Manager. Non resta alcuna chiamata di rete `gh` della PR Check (`requirements/quality#agent-launching`: le uniche chiamate `gh` sono quelle in sola lettura di Team con Team disponibile).
- `github.PULL_REQUEST_GONE` non può accadere: Trama non chiama mai `deleteReportsExcept` (oggi in `readPullRequests`, controller.ts circa 1048). I report già presenti in `.trama/pr-checks/` restano come sono, né letti né cancellati, e `.trama/pr-checks/` resta tra le cartelle locali di Trama. `pull-request-report` non scrive, non mostra e non cancella report.
- L'host non manda mai il messaggio `pullRequests` alla webview: `postPullRequests` non viene più chiamato da `readGitHub`/`readPullRequests`, da `openedTeam` (circa 1097-1101), dall'invio del quadro (circa 1373-1376), dal `ready`/`viewChanged team` (circa 1555-1563) né dalla callback `changed` di `PrChecks` (circa 255). Il fallback di Show details che usa `pullRequests.details()` (circa 1149) non offre più dettagli della lettura delle pull request.
- `removeLeftoverWorktrees` all'attivazione (`extension/src/host/main.ts:59-62`, controller.ts circa 1092) continua a girare: un worktree lasciato da una PR Check precedente viene ancora rimosso quando una finestra apre il progetto.
- Nessun testo, scheda, pulsante o finestra di `requirements/ui#pull-request-check` è mostrato. La rimozione della scheda `Pull Requests` da `TEAM_TABS`/`teamTabs` (`extension/src/webview/team/logic.ts`) e il gating della vista Team sulla Manager mode appartengono al Task del gating di Team, non a questo.

Il codice della PR Check resta, invariato per quanto possibile, e non va cancellato: `src/core/pr-check.ts`, `readPullRequests` di `src/core/github.ts`, `extension/src/host/team/pr-check.ts` (`PrChecks`), `extension/src/host/team/pull-requests.ts` (`TeamPullRequests`), `extension/src/webview/team/pull-requests-tab.tsx`, `extension/src/webview/team/pull-request-report.tsx`, il tipo di lancio `prCheck` e i messaggi del protocollo (`extension/src/protocol.ts`). Restano anche i loro unit test: `test/pr-check.test.ts`, `test/host-pr-check.test.ts`, `test/github.test.ts` (circa 343-392), `test/webview-pull-requests-tab.test.tsx`, `test/webview-pull-request-report.test.tsx`. Se metodi privati del controller restano inutilizzati e il compilatore lo segnala, l'agente li rimuove dal controller ma non dai moduli della PR Check.

La documentazione (README, sito, `docs/`, `CHANGELOG.md`) è di un altro Task.
