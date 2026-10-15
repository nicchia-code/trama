---
column: done
technical: false
refs:
  - proposal/Open
  - requirements/tech#proposal
drift: null
proposal: 2pa6eli4
agent: false
created: 2026-10-14T08:39:17.104Z
finished: 2026-10-14T09:52:04.037Z
---
# Show a Proposal's Tasks, removals and scope in trama proposal show

`trama proposal show` di una Proposal ordinaria non allegata mostra tre sezioni.

- `## Tasks`: per ogni Task l'identità, il titolo, `(technical)` quando lo è e i riferimenti.
- `## Created on approval`: i `Remove code of <riferimento>` che nasceranno, con il riferimento a cui punteranno.
- `## Scope`: una voce per riga nella forma di `--ref`, con il motivo e ciò che la copre: l'identità del Task, `already present`, `removal`, oppure `not covered`.

Con `--json` le stesse informazioni stanno nei campi `tasks`, `removals` e `scope`, lista di `{ ref, reason, coveredBy }`. Una Proposal approvata con lo scope salvato mostra invece la vecchia sezione `## Scan scope`, come oggi. La sezione `## Already present` del corpo resta leggibile come testo.
