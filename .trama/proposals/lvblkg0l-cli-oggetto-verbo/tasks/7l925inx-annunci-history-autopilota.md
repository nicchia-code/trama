---
technical: true
refs:
  - requirements/tech#announcement
  - requirements/tech#voce-history
  - requirements/rules#voce-history
  - requirements/data#voce-history
  - requirements/tech#drift-resolution
  - requirements/rules#drift-resolution
  - requirements/ui#drift-resolution
---
# Annunci, History e autopilota

Si fa dopo il Task del registro dei comandi.

- Annunci: `announcement new` (`{ kind, title, phase?, job? }`) sostituisce `announce <kind> <title>`. `announcement move <id> scanning|history|delivered|failed` sostituisce `announce phase` e `announce done` (con `failed` al posto di `--failed`). Ripresa del controllo di scan annunciato da Trama, ID sconosciuti e passi all'indietro si comportano come prima.
- History: `history new`, `history edit <id>`, `history show <id>` e `history list` sostituiscono `history add`, `history update`, `history show` e `history list`. In `edit`, `tasks` aggiunge Task e non ne toglie.
- Autopilota: `autopilot show` (`{ job? }`, oppure `TRAMA_JOB`) sostituisce `drift autopilot`. `autopilot move <job> failed` con `{ task | drift, reason }` sostituisce `agent-event failed`.
- Le istruzioni della risoluzione automatica e del Run automatico, e le skill `trama-scan`, `trama-implement` e `trama-resolve-drifts`, usano solo questi comandi.
- Test: `failed` arriva al coordinatore come esito fallito, `autopilot move` accetta un solo riferimento fra Task e Drift, e `history edit` aggiunge Task senza toglierne.
