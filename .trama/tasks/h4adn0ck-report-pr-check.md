---
column: done
technical: false
refs:
  - pull-request-report
  - github
  - github.PULL_REQUEST_GONE
  - requirements/rules#pull-request-report
  - requirements/rules#github.PULL_REQUEST_GONE
  - requirements/data#pull-request-report
  - requirements/ui#pull-request-report
drift: null
proposal: e4joewta
agent: false
created: 2026-10-28T10:21:27.991Z
finished: 2026-10-28T10:57:54.940Z
---
# Report della PR Check

Il report di una pull request: una tabella informativa, locale alla copia di lavoro, che il PR Check successivo della stessa PR sostituisce e che si cancella quando la PR non è più aperta e pronta per la review.

Quando è fatto:
- Il report sta in `.trama/pr-checks/<numero>.json` nella cartella aperta, mai nel worktree; la cartella ha un `.gitignore` con `*` e il file non entra mai in un commit, con il Solo mode acceso o spento. Contenuto: `{ number, title, url, variant: "solo" | "collaborative", base: { branch, commit }, head: { branch, commit }, mergeBase, checkedAt, rows }`, con ogni riga `{ section: "model" | "model-problems" | "code" | "open-work", ref, finding, source, where }`. Si scrive in un file temporaneo poi rinominato, LF e newline finale; un file non valido conta come nessun report e si cancella alla scrittura successiva.
- In `src/core/pr-check.ts`, con test, i controlli di Trama della modalità Collaborative, calcolati fra il merge-base e la head leggendo il Modello dagli oggetti git (`git show`, `git ls-tree`), mai con un checkout: le righe `Model` per ogni elemento, sezione dei Requisiti e campo delle Specs aggiunto, cambiato o rimosso, con lo stesso codice dei cambiamenti di `trama proposal show`; le righe `Model problems` per ogni errore di `trama model check` sul Modello della head, per ogni file del Modello, dei Requisiti o delle Specs cambiato senza una Proposal approvata nella PR (`Changed without an approved Proposal`) e per ogni elemento cambiato anche sul branch di destinazione dopo il merge-base (`Also changed on <base branch>`); le righe `Open work` per ogni Proposal in Draft o Open, Task in To do o In progress e Drift aperto alla head il cui file la PR ha aggiunto o cambiato. La fonte di queste righe è `Trama`.
- Le righe `Code` vengono dalle schede che lo scan ha archiviato nel worktree, in entrambe le modalità: un Task dà `Missing in the code: <titolo>` con i suoi riferimenti; un Drift il suo titolo, i suoi riferimenti e il suo Where in the code. In Solo la fonte di un Drift con `merge` è `This pull request`, degli altri `Existing code`; in Collaborative la fonte è `Scan`. Il riferimento di una riga è il primo riferimento, o nessuno. Le righe sono ordinate per sezione (`Model`, `Model problems`, `Code`, `Open work`) e dentro la sezione per riferimento.
- Dopo ogni lettura riuscita delle pull request, Trama cancella il report di ogni PR che non è più nella lista (mergiata, chiusa o tornata in bozza); una lettura fallita non cancella nulla. Un report è superato quando la head letta da GitHub è diversa da quella su cui è stato fatto.
- `Report` apre una `Dialog` di shadcn/ui sopra la vista, larga al più 960 px, con titolo `#<n> · <title>`, sotto `Checked <data e ora> on <commit breve> · Solo` o `· Collaborative` e `<base branch> ← <head branch>`; quando è superato, una riga nel colore di avviso con lucide `Clock`: `The pull request has new commits since this check.`. La tabella ha le colonne `Section`, `Reference`, `Finding`, `Source`, `Where in the code`, con le righe raggruppate per sezione (riga di gruppo su fondo muted con nome e numero; una sezione vuota non si mostra). `Reference` è un chip come i riferimenti delle schede, che apre il focus nel Diagramma, nei Requisiti o nelle Specs solo se il riferimento esiste nella cartella aperta, altrimenti testo monospace; una cella vuota mostra `–`. Senza righe: lucide `CircleCheck` e `No differences found.`. In fondo `Open on GitHub` (`outline`, lucide `ExternalLink`) e `Close`; Escape chiude. Sotto i 640 px ogni riga diventa un blocco. Tutto da tastiera, con una riga d'intestazione per le tecnologie assistive. I testi sono in inglese; i finding dello scan restano nella lingua dell'agente.
- La finestra sta in `extension/src/webview/team/pull-request-report.tsx`; raggruppamento delle righe e segno di superato sono funzioni pure di `extension/src/webview/team/logic.ts`, provate senza DOM. `Table` e `Dialog` di shadcn/ui si copiano in `extension/src/webview/ui/` se mancano.
