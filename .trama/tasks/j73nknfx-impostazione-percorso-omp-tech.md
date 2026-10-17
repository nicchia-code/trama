---
column: done
technical: true
refs:
  - requirements/tech#agent-launching
  - requirements/tech#panel/Settings
drift: null
proposal: b006amix
agent: false
created: 2026-10-17T03:28:12.255Z
finished: 2026-10-17T03:37:44.703Z
---
# Percorso di omp per i suggerimenti e motivo quando mancano

Quando il Task è finito:

- Esiste l'impostazione `trama.ompPath`: stringa, default vuota, `scope: "application"`, dichiarata nel manifest accanto a `trama.agent`. Il valore vuoto fa usare `omp` dal PATH dell'editor.
- `ompModels()` in `extension/src/host/model-lists.ts` avvia il programma indicato da `trama.ompPath` (o `omp`) senza shell, con argomenti fissi e una scadenza di 15 s. Il suo risultato è `{ models, error? }`: su errore `models` è vuoto e `error` porta uno dei tre testi inglesi della Requirement (`omp not found at <percorso>`, `omp models did not answer within 15 s`, `omp models did not return a valid list`), dove il percorso è quello usato.
- Il messaggio `modelSuggestions` porta `error` insieme a `models`. Cursor e Copilot non producono `error`: il loro comportamento resta quello di oggi.
- Un cambio di `trama.ompPath` ricalcola l'elenco come un cambio di `trama.agent` (`affectsConfiguration("trama.ompPath")` in `extension/src/host/controller.ts`).
- Il terminale dell'agente continua a lanciare `omp` dalla shell: `extension/src/host/agent.ts` non cambia.
- Test `bun:test` su `ompModels()` con un programma inesistente, una scadenza, un'uscita con errore, un JSON non valido e un'uscita valida: per ciascun caso è controllato `error` (o la sua assenza) e l'elenco.
