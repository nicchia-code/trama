---
column: done
technical: true
refs:
  - requirements/tech#General
drift: null
proposal: null
agent: false
created: 2026-10-11T17:08:07.721Z
finished: 2026-10-11T17:23:51.359Z
---
# Add the PowerShell note to the skills and docs/cli.md

Le skill distribuite `trama-design`, `trama-import`, `trama-resolve-drifts`, `trama-scan` e `trama-implement` e `docs/cli.md` hanno una breve nota per PowerShell: passare il JSON con una pipe (per esempio `Get-Content -Raw round.json | trama ask`) invece di `<`; in Windows PowerShell 5.1 impostare prima `$OutputEncoding` e `[Console]::OutputEncoding` su UTF-8, altrimenti i caratteri non ASCII arrivano come `?`; usare virgolette singole per `--body` e `--reason`, perché PowerShell espande `$` e il backtick dentro le doppie. Gli esempi restano in sintassi POSIX. Oggi nessuna skill né `docs/cli.md` parla di PowerShell.
