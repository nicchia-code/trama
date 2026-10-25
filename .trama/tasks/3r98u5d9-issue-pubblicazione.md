---
column: done
technical: false
refs:
  - issue
  - agent.RECORD_ISSUE_PUBLISHED
  - agent.RECORD_ISSUE_FAILED
  - developer.PUBLISH_AGAIN
  - requirements/data#issue
  - requirements/rules#issue
  - requirements/tech#issue
  - requirements/cli#issue
  - requirements/quality#issue
  - requirements/rules#agent-launching
  - requirements/rules#agent-terminal
drift: null
proposal: qf161zkz
agent: false
created: 2026-10-25T15:11:57.313Z
finished: 2026-10-25T15:45:24.110Z
---
# Issue e pubblicazione

Le issue di una handoff approvata nascono come card in `.trama/issues/` e l'agente le pubblica su GitHub. Quando il Task è finito:

- Card (`data#issue`): identità, titolo, corpo, `handoff`, `label`, `refs`, `estimate`, `assignee`, `reviewer`, `sprint`, `fields`, `dependsOn`, `created`, `state` (`publishing`, `not-published`, `published`), e quando servono `number`, `url`, `published`, `unset`, `reason`, `texts`. Seguono `.trama/`: versionate col progetto, fuori da git con Solo mode.
- Corpo per GitHub composto da una funzione pura di `src/core/issues.ts`, uguale nell'anteprima e su GitHub: `**Reviewer:** @<handle>` se c'è un reviewer, `**Depends on:** #<n>, …` per le dipendenze pubblicate (quelle non pubblicate col titolo), riga vuota, corpo dell'agente, e tranne con Solo mode il blocco `<details><summary>Trama references</summary>` con i riferimenti in codice inline. Nient'altro.
- CLI (`cli#issue`): `trama issue list` (filtri `handoff`, `state`, ordine di pubblicazione), `trama issue show <id>` con `## GitHub body` e `githubBody` in `--json` (anche per issue di una handoff non ancora approvata), `trama issue move <id> published` con `{ number, url }` che registra `published` e `texts` (impronta del testo di ogni riferimento, la stessa funzione di `tech#scans`), `trama issue move <id> not-published` con `{ reason }`, `publishing` rifiutato, spostare un'issue già `published` rifiutato, `trama issue edit <id>` con `{ unset }`. Tutti falliscono con il motivo di `rules#manager-mode` senza Team; nessuno è riservato al developer.
- Lancio della pubblicazione dopo l'approvazione e con `Publish again`: istruzione di una riga «Use the trama-handoff skill to publish the issues of handoff <handoff id>.», terminale `Publish <numero breve>`, ruolo dell'esecuzione, ghost nella barra di stato, nessun Drift. `Publish again` è disponibile solo con Team disponibile e Project collegato e manda la stessa istruzione; se l'istruzione non parte nulla cambia e la vista lo dice.
- Il controllo di esecuzione (`rules#time`) porta a `not-published`, con `The agent stopped before publishing it.`, ogni issue in `publishing` il cui agente di pubblicazione non vive più.
- Elenchi dei Requisiti aggiornati nel codice: l'istruzione della richiesta di handoff e il terminale `Handoff` in `extension/src/host/prompts.ts`, i ruoli in `roleOf` (`Handoff` e `Split <n>` analisi, `Publish <n>` esecuzione).
- Privacy: su GitHub arriva solo ciò che il Manager ha approvato; nessun token GitHub letto, salvato o passato da Trama.
- Test `bun:test` della composizione del corpo (con e senza Solo mode, con dipendenze pubblicate e no), dell'ordine di pubblicazione e degli spostamenti di stato; `docs/cli.md` descrive `trama issue`.
