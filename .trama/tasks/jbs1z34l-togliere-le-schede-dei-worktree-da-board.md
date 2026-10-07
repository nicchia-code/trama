---
column: done
technical: false
refs:
  - task
  - drift
  - announcement
  - task/Taken by the agent/terminal.COMMAND_ENDED
  - requirements/data#General
  - requirements/rules#General
  - requirements/rules#announcement
  - requirements/tech#task
  - requirements/tech#announcement
drift: null
proposal: g0kh74u5
agent: false
created: 2026-10-07T05:28:51.219Z
finished: 2026-10-07T05:48:27.378Z
---
# Togliere le schede dei worktree da Board testuale, numeri brevi, annunci e round di domande

Task, Drift e annunci sono solo quelli della cartella aperta. Quando è fatto:

- `trama board` (testo e `--json`) non ha il gruppo In worktree, né schede marcate `(worktree)`, né il Merge Drift, né il Task di riconciliazione.
- I numeri brevi contano solo le schede di questa copia di lavoro, senza leggere i worktree di un giro.
- Gli annunci si leggono, si ritirano e si mostrano solo nella cartella aperta; non si cercano più copie nei worktree.
- Il canale dei round di domande accetta solo il progetto della finestra, non più i worktree del suo giro.
- La correzione del codice di un Drift lega il Task di correzione al design del Task d'origine, senza il caso del worktree.
- La fine del comando dell'agente rilascia i Task che il suo terminale ha preso nella cartella aperta, senza terminali di worktree.
