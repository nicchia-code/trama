---
refs:
  - developer.ASK_ISSUE_UPDATE
  - developer.SCAN_ISSUE
  - agent.RECORD_ISSUE_UPDATED
  - solo-mode
  - menu-laterale
  - requirements/rules#developer.ASK_ISSUE_UPDATE
  - requirements/rules#developer.SCAN_ISSUE
  - requirements/rules#work
  - requirements/cli#issue
  - requirements/tech#menu-laterale
  - requirements/ui#panel
  - requirements/ui#issue
  - requirements/ui#issue/Published
---
# Segnali, Comment update e Scan

La scheda Issues mostra gli stati e i segnali delle issue pubblicate e offre le due azioni del Manager. Quando il Task è finito:

- Stati come pillole con icona: `Open` (verde, `CircleDot`), `In progress` (blu, `LoaderCircle`), `In review` (ambra, `Eye`), `Closed` (viola, `CircleCheck`), `Not planned` (attenuato, `CircleSlash`), `Not found on GitHub` (attenuato, `CircleHelp`, solo `Open on GitHub`). La riga del gruppo di un'epica aggiunge ` · <n> closed`.
- Segnali di un'issue aperta, calcolati in `src/core/timeline.ts` a ogni lettura e a ogni quadro, come badge con icona e motivo, in quest'ordine: `Stale` (`Clock`, `The Model changed after publishing`) quando l'impronta del testo di almeno un riferimento differisce da quella registrata o un riferimento non esiste più; `Carry-over` (`ArrowRight`, `From <sprint>`) quando il suo sprint è finito prima di oggi; `Overload` (`Gauge`, `<nome> <carico> / <capacità> d`) quando il carico dell'assegnatario nel suo sprint supera la capacità; `Dependency` (`Link`, `Blocked by #<n>` o il titolo) quando un'issue da cui dipende è aperta e non ha sprint, ha uno sprint successivo, o lo stesso sprint con un altro assegnatario. Capacità e carico come in `rules#issue/Published` (giorni lavorativi lunedì–venerdì, assenze tolte, arrotondamento a 0.5; somma delle stime degli item aperti del Project assegnati, anche non di Trama, 0 senza stima). Nessun segnale cambia nulla.
- `Comment update` su un'issue aperta `Stale`: istruzione «Use the trama-handoff skill to comment on issue <issue id> what changed in the Model since it was published.», terminale `Update #<n>`, ruolo dell'esecuzione, ghost nella barra di stato. La skill legge `trama issue show <id>` con `## Changed since publishing` (testo di prima e di adesso di ogni riferimento cambiato; senza git solo il riferimento), scrive il commento con `gh issue comment` nella lingua dell'issue senza riferimenti a Trama, poi `trama issue edit <id>` con `{ updated: true }`, che registra l'istante e le impronte di adesso. Il corpo non si riscrive.
- `Scan` su un'issue `Closed`, con Team disponibile e nessun Run di questa finestra in corso: istruzione «Use the trama-scan skill on the references of issue <issue id>: <refs>. The work was done by a person of the team from this issue, so a difference leans towards fixing the code.», terminale `Scan #<n>`, ruolo dello scan; confronta solo quei riferimenti, archivia i Drift come ogni scan e non cambia il numero di `Scan System` né il ricordo dell'ultimo scan del Sistema.
- Azioni disabilitate, con il motivo come tooltip, mentre il loro lavoro gira (`Updating…`, `Scanning…`), durante un Run di questa finestra (`A run is in progress`) o senza Team; `Open on GitHub` diventa a sola icona quando c'è un'altra azione. Messaggi `askIssueUpdate` e `scanIssue` validati da `parseToHost`; nuovi `ResolvedAction` in `extension/src/host/prompts.ts` e ruoli in `roleOf`.
- Testi aggiornati sul fatto che `Scan System` non è più l'unico lancio di scan: menu laterale, `rules#work`, `tech#menu-laterale`, `ui#panel`; Solo mode dice che i Drift sul lavoro delle issue del team pendono verso la correzione del codice.
- Test dei segnali, di capacità e carico (assenze, sprint parziali, item senza stima) e di `trama issue edit` con `updated`.

Le immagini legate a questo Task mostrano la scheda Issues con ogni stato, segnale e azione: il segnale `Stale` del mockup dice «No activity for 5 days», ma qui significa che il Modello è cambiato dopo la pubblicazione, con il testo `The Model changed after publishing`.
