---
refs:
  - developer.CHECK_PULL_REQUEST
  - developer.STOP_PULL_REQUEST_CHECK
  - requirements/ui#pull-request-check
---
# Scheda Pull Requests

La scheda `Pull Requests` della vista Team, da cui chiunque, con o senza Manager mode, lancia e ferma la PR Check di una pull request e ne apre il report.

Quando è fatto:
- La scheda sta subito dopo `Issues` con il Manager mode acceso ed è l'unica scheda senza Manager mode. Intestazione in testo secondario: `<n> open pull requests ready for review` (`1 open pull request…`).
- Una riga per pull request aperta e non in bozza, dal numero più alto: `#<n>` in monospace, il titolo in medium e sotto, in testo secondario, `<author> · <base branch> ← <head branch>`.
- Stato della riga come pillola con icona: `Not checked` (bordo tratteggiato, lucide `CircleDashed`); `Checking…` (lucide `LoaderCircle` che gira, fermo con `motion-reduce`); `Checked <tempo fa>` (lucide `CircleCheck`) e, con il report superato, il badge `Outdated` (ambra, lucide `Clock`, tooltip `New commits since this check`).
- Azioni a destra: `Check` (`outline`, lucide `ScanSearch`), `Check again` quando c'è un report; mentre la PR Check di quella riga gira, `Stop` (`outline`, lucide `Square`) al suo posto; `Report` (`ghost`, lucide `Table`) quando c'è un report; `Open on GitHub` solo icona (`ghost`, lucide `ExternalLink`, tooltip `Open on GitHub`), con il messaggio esistente che apre un link.
- `Check` è disabilitato con il motivo come tooltip: `A PR Check is running` mentre gira un'altra PR Check della finestra; `A run is in progress` mentre è in corso un Run lanciato da questa finestra; `Can't read GitHub` dopo una lettura fallita.
- Senza pull request: `No open pull requests ready for review.` in testo secondario. Senza Manager mode gli stati di GitHub nominano le pull request: `Team uses gh to read the pull requests. Install it, then select Refresh.`, `Log in so Trama can read the pull requests of <owner>/<repo>. This runs gh auth login in a terminal.` e, per una lettura fallita, il titolo `Couldn't read the pull requests`.
- Sotto i 640 px ogni riga diventa un blocco: numero e stato sulla prima riga, titolo e branch sotto, azioni a destra della prima riga.
- Messaggi webview → host, validati da `parseToHost`: `checkPullRequest { number }` e `stopPullRequestCheck { number }`. Host → webview: `pullRequests { readAt, error, items, running, blocked }` al `ready`, quando Team diventa visibile, dopo ogni lettura e a ogni inizio e fine di una PR Check; ogni item porta `report` (`checkedAt`, `variant`, `head`, `mergeBase`, `outdated`, `rows`) o `null`.
- La scheda sta in `extension/src/webview/team/pull-requests-tab.tsx`; ordinamento e motivi di un `Check` disabilitato sono funzioni pure di `extension/src/webview/team/logic.ts`, provate senza DOM. Tutto è raggiungibile da tastiera, con anello di focus visibile; ogni pulsante solo icona ha tooltip e nome accessibile uguali; lo stato non si dice mai solo con il colore. I testi sono in inglese e non seguono `trama.language`.
