---
column: done
technical: true
refs:
  - requirements/tech#drift
  - requirements/rules#drift
  - requirements/ui#drift
  - requirements/data#drift
  - requirements/rules#work
  - requirements/tech#work
drift: null
proposal: lvblkg0l
agent: false
created: 2026-10-20T19:29:56.736Z
finished: 2026-10-20T20:19:13.550Z
---
# Comandi dei Drift

Si fa dopo il Task del registro dei comandi.

- Comandi dei Drift: `drift new`, `drift show <id>`, `drift list` (`{ all?, refs? }`) e `drift move <id> code-to-be-fixed|proposal-accepted|dismissed`. Valgono le regole di `tech#drift`.
- `drift new` prende `options` come elenco di `{ title, text }` e `notBlocking` come elenco di `{ task, reason }`, al posto delle coppie di opzioni abbinate per posizione.
- `drift new` con `dryRun: true` sostituisce `drift candidates`: non scrive nulla e stampa i Task che il Drift bloccherebbe.
- `drift move` sostituisce `drift resolve`. `code-to-be-fixed` prende `option` e `note` e, in un terminale interattivo senza `option`, mostra il menu delle opzioni come prima. `proposal-accepted` prende `skillsDir`.
- Comandi dei confronti: `comparison new <machine>` (`{ refs?, candidates? }`) e `comparison move <id> delivered` (le schede in `--input`, con lo stesso JSON di prima) sostituiscono `compare brief` e `compare file`, con le stesse impronte, gli stessi registri e gli stessi messaggi all'editor.
- `timing list` (`{ last? }`) sostituisce `timings`. Le registrazioni delle timing restano le stesse.
- Le skill `trama-compare`, `trama-scan`, `trama-implement` e `trama-import` archiviano Drift e confronti solo con questi comandi, con l'input passato con `--input -`.
- Test: il dry run non scrive nulla, `options` fuori dai limiti e il menu interattivo di `code-to-be-fixed`.
