---
column: done
technical: false
refs:
  - solo-merge
  - solo-mode
  - agent-launching
  - developer.START_MERGE
  - developer.CHOOSE_MERGE_BRANCH
  - developer.CANCEL_MERGE
  - developer.OPEN_MERGE_EDITOR
  - developer.RECONCILE_MERGE_WITH_AGENT
  - developer.ABORT_MERGE
  - workspace.MERGE_COMMITTED
  - workspace.MERGE_ABANDONED
  - requirements/rules#solo-merge
  - requirements/data#solo-merge
  - requirements/tech#solo-merge
  - requirements/rules#agent-terminal
  - requirements/rules#work
  - requirements/data#task
drift: null
proposal: lx7xcuct
agent: false
created: 2026-10-25T09:03:35.826Z
finished: 2026-10-25T09:44:38.521Z
---
# Merge: flusso e scan

Con Solo mode acceso (la modalità in cui i file di Trama restano fuori da git solo in questa copia di lavoro), Merge porta nel branch corrente un branch scelto dal developer e poi fa scansionare all'agente tutto il System. Il pulsante e le righe del menu laterale e il segno sui Drift da merge arrivano con altri Task della stessa Proposal; i testi esatti di notifiche, `QuickPick` e conferme sono in `ui#solo-merge`.

A Task finito:

- `src/core/solo-merge.ts`, con test `bun:test` su repository git temporanei veri, calcola la disponibilità (nessun merge, rebase, cherry-pick o revert in corso; HEAD su un branch; nessuna modifica a file tracciati, nell'indice o no, fuori dai percorsi del blocco di Solo mode, mentre i file non tracciati non contano; nessun lavoro dell'agente lanciato da questa finestra in corso), l'elenco dei branch (upstream per primo, poi gli altri remoti, poi i locali, ognuno in ordine alfabetico, senza il corrente né `<remote>/HEAD`), il controllo «già aggiornato», il merge (`git merge --no-edit <branch>`, con `base` e `incoming` registrati prima), l'abort (`git merge --abort`) e la fine di un merge ricordato. Ogni chiamata passa da `src/core/git.ts`, senza shell; `git fetch --all --prune` ha 120 s; un nome di branch che comincia con `-` è rifiutato.
- Flusso (`extension/src/host/solo-merge.ts`): `Merge` fa il fetch con la notifica di avanzamento `Fetching…`; un fetch fallito si ferma con `Trama: could not fetch: <reason>.`. Poi il `QuickPick`; Escape non fa nulla. Un branch che non è l'upstream né `<remote>/<branch corrente>` chiede la conferma modale; annullarla non fa nulla. Già aggiornato: avviso e nessuno scan. Merge senza conflitti, anche fast-forward: scan dopo il merge. Merge con conflitti: Trama ricorda il merge e mostra l'avviso con `Open Merge Editor`, `Reconcile with Agent` e `Abort`. Un merge rifiutato o fallito per altri motivi mostra il motivo di git e non cambia nulla.
- Merge aperto: `.trama/solo/merge.json` (`{ branch, base, incoming, started }`) esiste dall'avvio di `git merge` alla fine. Il merge è finito quando `MERGE_HEAD` non c'è più: committato se HEAD contiene `incoming`, abbandonato altrimenti (anche quando `MERGE_HEAD` punta a un altro commit). Trama controlla a ogni cambiamento della cartella git (`FileSystemWatcher` su `HEAD`, `MERGE_HEAD`, `index` e i ref), all'attivazione e a ogni controllo di esecuzione, così una finestra chiusa o ricaricata riprende ad aspettare. Committato → scan dopo il merge; abbandonato → niente scan. Un file non valido vale come merge abbandonato e si cancella. Trama non fa mai il commit del merge.
- `Open Merge Editor` apre il primo file in conflitto con `git.openMergeEditor`, o il file se il comando manca. `Reconcile with Agent` lancia l'agente (terminale o omp Chat, nome `Merge`) con "Use the trama-merge skill to resolve the conflicts of the merge of `<branch>` in progress." e le frasi di ogni istruzione tranne quella del limite. `Abort Merge`, dopo la conferma modale, esegue `git merge --abort`; un errore lo dice e il merge resta aperto.
- Nuova skill distribuita `trama-merge`: risolve i conflitti del merge in corso nella cartella aperta mantenendo l'intento dei due lati, chiede con `trama question new` quando non sa quale intento vale, fa `git add` solo dei file risolti, non committa mai, non esegue mai `git merge --abort`, `git reset` o checkout di interi branch, non tocca `.trama/`, e chiude con una riga che dice al developer di rivedere i file nell'indice e committare. Ha la sezione `## Language` delle altre skill.
- Scan dopo il merge: `AgentAction` `{ kind: "mergeScan", base, incoming }`, che il pannello non può mandare, passa dallo stesso `send` di `Scan System` senza conferma, terminale `Scan`, con "Use the trama-scan skill on the whole System. A merge brought in `<base>...<incoming>`: mark `merge` on every Drift whose Where in the code lies in a file `git diff --name-only <base>...<incoming>` lists." e le frasi di ogni istruzione. Alla consegna scrive `.trama/last-scan/system` come `Scan System`, quindi `· N` torna a zero. Uno scan che non può partire si segnala come ogni lancio, senza riprovare.
- `rules#work`, `rules#agent-terminal`, `data#task` e la descrizione di Agent launching dicono che questo è l'unico scan che Trama lancia oltre a `Scan System`.
- `README.md`, `extension/README.md`, `docs/` e `CHANGELOG.md` descrivono Merge; `docs/uat.md` ha i passi: merge pulito, fast-forward, già aggiornato, fetch fallito, conflitto risolto nell'editor, conflitto riconciliato dall'agente, abort dal menu, abort fuori da Trama, finestra ricaricata durante un merge.
