---
status: resolved
resolution: proposal
refs:
  - drift-resolution/Running tasks/time.QUIET_PERIOD_ELAPSED
  - requirements/rules#drift-resolution
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: 207t8egb
created: 2026-10-09T19:19:11.761Z
---
# Quiet period ends each quiet Run on its own instead of all Runs together

## What happens

La quiete è contata **Run per Run**: ogni Run di cui Trama non vede la fine con certezza finisce da solo quando il *suo* agente resta fermo quindici minuti, anche se altri Run sono ancora in corso.

- Un Run in una finestra esterna rimasto quieto finisce mentre un Run in un terminale integrato continua; alla fine di quest'ultimo la finestra torna in Free.
- Con due Run in finestre esterne, uno quieto e uno attivo da due minuti, finisce solo il primo: si resta in Running tasks finché anche l'altro non tace o non finisce.

## What should happen

Il Modello fa scattare la quiete **solo se ogni Run ancora in corso** è uno di cui Trama non può vedere la fine con certezza, e allora li considera **tutti finiti** insieme e torna in Free.

- Con un Run visibile ancora in corso la quiete non cambia nulla, e il Run quieto resta in corso.
- Con due Run in finestre esterne, la quiete del primo chiude anche quello ancora attivo.

Il Requisito `rules#drift-resolution` invece descrive la quiete per singolo lavoro, come fa il codice.

## Fix options

### Align the Model to per-Run quiet

Il codice resta com'è. Si riscrive la Transizione della quiete di Running tasks: la quiete chiude ogni Run senza fine visibile rimasto fermo quindici minuti, e si torna in Free quando non resta nessun Run. Modello e Requisito dicono la stessa cosa; un agente ancora attivo non viene mai dato per finito.

### Make the code follow the Model

La quiete chiude i Run solo quando tutti quelli in corso sono senza fine visibile, e allora li chiude tutti insieme. Costa: un Run attivo in una finestra esterna può essere dato per finito perché un altro tace, sbloccando Resolve Drifts mentre lavora; un Run quieto accanto a uno visibile resta in corso finché non ne arriva un'altra. Va cambiato anche il Requisito.

### End quiet Runs one by one but go Free only when all are quiet

Via di mezzo: ogni Run senza fine visibile si chiude quando il suo agente è fermo da quindici minuti, ma solo se nessun Run con fine visibile è ancora in corso; altrimenti si aspetta. Più vicino alla lettera del Modello senza chiudere agenti attivi; costa una regola in più nel codice e una riscrittura parziale del Modello.

## Where in the code

`extension/src/host/drift-resolution.ts`, `endQuietJobs`
