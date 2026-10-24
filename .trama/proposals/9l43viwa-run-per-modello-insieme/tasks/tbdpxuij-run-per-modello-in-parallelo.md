---
technical: false
refs:
  - task
  - drift-resolution/Running tasks
  - drift-resolution/Free/developer.ASK_AGENT
  - requirements/rules#drift-resolution/Running tasks
  - requirements/rules#agent-launching
  - requirements/tech#agent-launching
---
# Run per modello in parallelo

Con Parallel Execution accesa al lancio di Run all, i Run di una sequenza per modello partono insieme e si dividono il limite dei sotto-agenti, invece di partire uno dopo l'altro.

Quando è fatto:
- Con `trama.parallelExecution` acceso al lancio, l'host divide N (`trama.maxParallelAgents`, 20 se non valido) fra i gruppi di modello in proporzione ai loro Task eseguibili al lancio: a ogni gruppo la parte intera di N per i suoi Task diviso il totale, almeno 1; i posti avanzati uno ciascuno ai gruppi con il resto più grande, a parità al gruppo con il Task più vecchio; la somma non supera mai N. Le parti non si ricalcolano.
- Partono insieme, nell'ordine dei gruppi di oggi, tanti Run quanti ne stanno in N con almeno un posto ciascuno; con più gruppi che posti, i gruppi rimasti partono uno alla volta alla fine normale di un Run già partito, ciascuno con un posto.
- L'istruzione di ogni Run porta la sua parte al posto di N, sia nella frase "Run at most N sub-agents at once." sia nel `max` di `trama task list`; il resto dell'istruzione (filtri `proposals` / `notProposals`, modello, nome del terminale `All tasks · <modello>`) è quello di oggi.
- Ogni Run ha il suo terminale o la sua conversazione di omp Chat. L'host li segue nello stesso lavoro di tipo Run: la sequenza conta come un solo Run per `Run all`, il Run dei Task, Clear, Resolve e Unify Drifts finché l'ultimo dei suoi Run non è finito e nessun gruppo aspetta.
- Una fine anomala di un Run (terminale chiuso mentre l'agente lavora, comando finito in errore o senza codice, controllo di esecuzione, istruzione che non parte, chiusura dell'editor) toglie i gruppi non ancora partiti e lascia lavorare i Run già partiti.
- Con l'impostazione spenta la sequenza resta `runSequence` com'è oggi, uno alla volta.
- Divisione delle parti e scelta dei Run che partono insieme sono funzioni pure accanto a `planRuns` (`extension/src/host/run-groups.ts`), con test `bun:test` (proporzionalità, minimo 1, somma non oltre N, resto più grande, più gruppi che posti); un test dell'host prova due gruppi lanciati insieme con le loro parti, la fine anomala di uno che lascia lavorare l'altro e il lavoro di tipo Run che finisce solo con l'ultimo.
- `extension/README.md` e `CHANGELOG.md` descrivono i Run per modello in parallelo.
