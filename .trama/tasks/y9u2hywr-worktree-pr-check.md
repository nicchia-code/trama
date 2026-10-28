---
column: done
technical: false
refs:
  - pull-request-check
  - requirements/rules#pr-check
  - requirements/rules#pull-request-check
  - requirements/rules#developer.STOP_PULL_REQUEST_CHECK
  - requirements/data#pull-request-check
  - requirements/tech#pr-check
  - requirements/tech#General
  - requirements/quality#pr-check
  - requirements/quality#agent-launching
drift: null
proposal: e4joewta
agent: false
created: 2026-10-28T10:21:27.991Z
finished: 2026-10-28T10:57:55.432Z
---
# Worktree della PR Check

La PR Check di una pull request: Trama prepara un git worktree sulla head della PR, ci fa lavorare l'agente con lo scan di tutto il Sistema e, alla fine, scrive il report e rimuove il worktree. Al massimo una PR Check per finestra.

Quando è fatto:
- `src/core/pr-check.ts` (con test `bun:test` su repository git temporanei veri) sa: scegliere la modalità al momento di Check (Solo con il Solo mode acceso o quando la head della PR non ha `.trama/` al prefisso del progetto, `git ls-tree <head> -- <prefix>.trama`; Collaborative altrimenti); fare il fetch con `git fetch --no-tags origin refs/pull/<n>/head refs/heads/<base branch>` leggendo i due commit da `FETCH_HEAD`, senza creare né spostare branch, tag o altri ref; calcolare il merge-base con `git merge-base <base> <head>`; creare il worktree staccato con `git worktree add --detach <cartella> <head>` in `pr-check/<numero>/` dentro `ExtensionContext.storageUri` (una cartella già lì si rimuove prima); copiare nella modalità Solo i file di Trama della cartella aperta (`.trama/` senza le cartelle locali, cioè ogni cartella con un `.gitignore` che contiene `*`, la cartella delle skill, `.omp/agents/trama-analysis.md`, `.omp/agents/trama-implementer.md`, `.omp/WATCHDOG.yml`); rimuovere il worktree con `git worktree remove --force` e `git worktree prune`, e, se git non riesce, cancellando la cartella e facendo prune. Ogni chiamata git passa da `src/core/git.ts`, senza shell, con argomenti fissi; il fetch ha un limite di 120 s; numeri non interi positivi e nomi di branch che iniziano con `-` si rifiutano.
- La lista delle pull request si legge in sola lettura in `src/core/github.ts` con `gh pr list --repo <owner>/<repo> --state open --limit 100 --json number,title,author,isDraft,baseRefName,headRefName,headRefOid,url`, tenendo solo le PR non in bozza, dalla più recente; il risultato va nella cache `trama.team.pullRequests` di `workspaceState` (`{ readAt, items, error }`). Si legge quando la vista Team si mostra e con Refresh, mai a tempo.
- `extension/src/host/team/pr-check.ts` tiene in memoria la PR Check in corso della finestra (numero, cartella, modalità, merge-base, istante del lancio, terminale o conversazione, righe dei controlli di Trama) e rifiuta una seconda PR Check. `Check` è disponibile solo su una PR della lista, senza un'altra PR Check della finestra in corso, senza un Run lanciato da questa finestra in corso e con l'ultima lettura delle PR riuscita.
- La preparazione segue l'ordine di `rules#pull-request-check`: fetch, worktree, copia (Solo) o controlli di Trama (Collaborative, con le funzioni del report), skill di questa versione scritte nel worktree con lo stesso codice del controllo all'apertura, lancio. Il primo passo che fallisce ferma tutto, rimuove ciò che è stato creato del worktree, lascia com'è il report precedente e mostra `Trama: could not check #<n>: <reason>.` con la prima riga d'errore di git o gh.
- `AgentAction` ha `{ kind: "prCheck", number }`, che il pannello non può mandare: passa dallo stesso `send` dello scan di `Scan System`, senza `confirmScanSystem` né `rememberDeliveredScan`, con la cartella di lavoro del terminale o della conversazione sul worktree, il ruolo dello scan, il nome `PR #<n>` e l'annuncio nella cartella aperta di un lavoro intitolato `Checking PR #<n>`. Istruzione: "Use the trama-scan skill on the whole System. This is the PR Check of pull request #<n>, in a worktree of its own: file the cards here, and do not run, build or install anything of the pull request.", più in Solo "A merge brought in `<merge-base>...<head>`: mark `merge` on every Drift whose Where in the code lies in a file `git diff --name-only <merge-base>...<head>` lists."; con le frasi solite di ogni istruzione tranne quella dell'Async Drift Resolver.
- La fine del lavoro (hook a riposo, fine del turno, fine del comando, terminale chiuso, controllo di esecuzione) porta la PR Check a Idle: se il controllo dello scan annunciato dall'agente nel worktree è stato consegnato, Trama scrive il report (funzioni del report) e poi rimuove il worktree; altrimenti nessun report nuovo, il precedente resta, e l'avviso `Trama: the PR Check of #<n> did not finish. The previous report, if any, is kept.`.
- Stop chiude il terminale o termina la conversazione della PR Check, rimuove il worktree e non scrive nulla, senza messaggi.
- All'apertura di una finestra sul progetto, ogni cartella sotto `pr-check/` dello storage che nessuna PR Check in corso usa si rimuove, senza report e senza messaggi. Un worktree che non si riesce a rimuovere mostra `Trama: could not remove the worktree of #<n>: <reason>.`.
- Lo scan di una PR Check non scrive mai `.trama/last-scan/system` della cartella aperta, non cambia il numero di `Scan System` e le sue schede non arrivano mai sulla Board della cartella aperta. Dopo una PR Check, riuscita, fermata o fallita, `git status`, `git branch` e `git worktree list` della cartella aperta sono quelli di prima.
- In `requirements/tech#General` e `requirements/quality#agent-launching` le chiamate `gh` in sola lettura della PR Check sono l'unica rete nuova, e il worktree della PR Check è l'unica eccezione al divieto dei worktree.
