---
column: done
technical: false
refs:
  - project/Trama project/developer.REWRITE_IDENTITIES
  - requirements/rules#project
drift: null
proposal: g0kh74u5
agent: false
created: 2026-10-07T05:28:50.998Z
finished: 2026-10-07T05:38:22.093Z
---
# Riscrivere le identità numerate senza guardare i worktree

`trama ids rewrite` (la riscrittura delle identità ancora numerate) non è più rifiutata quando esiste un giro di worktree: i soli rifiuti sono due schede dello stesso tipo con lo stesso numero, o identità nuove che coincidono o sono già usate. Worktree e branch `trama/*` presenti non cambiano il risultato.
