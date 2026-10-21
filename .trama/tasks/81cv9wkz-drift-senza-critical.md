---
column: done
technical: false
refs:
  - drift
  - requirements/rules#drift
  - requirements/tech#drift
  - requirements/data#drift
drift: null
proposal: c9fp4trm
agent: false
created: 2026-10-21T05:42:19.328Z
finished: 2026-10-21T05:45:28.097Z
---
# Drift senza gravità critica

Un Drift non ha più una gravità: nessun Drift è segnato come più urgente degli altri, e un Drift registrato quando esisteva questo segno lo perde.

A lavoro finito:

- Un Drift nuovo non scrive più il campo `critical`. Un Drift salvato prima con il campo resta leggibile: il campo è letto e ignorato, qualunque valore abbia (anche non booleano), senza riscrivere il file.
- `trama drift new` non accetta più `critical`, e nemmeno un Drift del blocco di `trama comparison move <id> delivered`: il campo è un errore d'uso come ogni campo sconosciuto (per il blocco, segnalato fra i problemi della scheda senza scrivere nulla).
- `list`, `show`, `board`, la Snapshot e i loro `--json` non portano più `critical`, e la CLI non distingue più i critici in `list` e `board` né lo mostra nei dettagli.
- Nel pannello sparisce ogni badge `Critical`: dalla scheda della Board, dalle righe della risoluzione e dai dettagli del Diagramma (`CriticalBadge` in `extension/src/webview/diagram/panel.tsx` e i suoi usi in `board/cards.tsx`), insieme al campo nei tipi del webview e del protocollo.
- Le skill che archiviano Drift (`skills/trama-scan`, `trama-implement`, `trama-import`, `trama-compare`, `trama-design`, `trama-resolve-drifts`) non valutano più l'urgenza e non passano più `critical`.
- Con il blocco sperimentale, un Drift che alla creazione non blocca nessun Task e non è ricorrente entra, alla fine del lavoro, nella risoluzione `nonBlocking` del lavoro: ne restano esclusi soltanto i Drift ricorrenti (con `previous`), non più i critici né quelli che una delega tratterebbe. Le skill (`skills/trama-implement`, `skills/trama-resolve-drifts`) lo dicono così.
- `trama proposal new` con `nonBlocking` senza `kind: resolution` resta un errore d'uso; non c'è più il caso con `automatic`.
- I Drift ricorrenti restano: `previous` continua a essere scritto, letto e portato da `list`, `show`, `board`, Snapshot e `--json`, e un Drift ricorrente lo decide il developer vedendo la catena dei precedenti. Non c'è più nessuna menzione di `eligibleDrifts` o di controlli dell'host prima di un'approvazione automatica.
- Un Drift Aperto aspetta una decisione del developer; con Codice da correggere il developer avvia a mano sia il Task di correzione sia la ripresa dell'origine.
- Test (`test/` su drift new, comparison move, list/show/board, Snapshot) e documenti (`docs/cli.md`, `README.md`, `CHANGELOG.md`) seguono: nessun `critical` scritto o mostrato, rifiuto del campo in ingresso, lettura che ignora quello vecchio.
