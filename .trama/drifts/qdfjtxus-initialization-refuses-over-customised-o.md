---
status: resolved
resolution: proposal
refs:
  - project/Not a Trama project/developer.INITIALIZE_PROJECT
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: i0e2coiq
created: 2026-10-10T08:48:23.476Z
---
# Initialization refuses over customised omp sub-agent definitions

## What happens

Inizializzando un progetto che ha già copie personalizzate delle definizioni dei sotto-agenti di omp, Trama rifiuta e non crea nulla, chiedendo di spostarle o di usare la conferma.

## What should happen

Il Model dice che il rifiuto riguarda solo le skill già presenti con contenuto diverso. Le definizioni dei sotto-agenti di omp vanno sostituite senza rifiuto, come deciso per la Drift r72wjye7.

## Fix options

### Togliere il rifiuto per le definizioni di omp

Le definizioni dei sotto-agenti vengono sovrascritte sempre, come da Task x80q6buy. Il rifiuto resta solo per le skill.

### Tenere il rifiuto e aggiornare il Model

Il rifiuto per le definizioni di omp resta, e il Model lo descrive in INITIALIZE_PROJECT.

## Where in the code

src/cli/commands.ts (init, ompAgentConflicts)
