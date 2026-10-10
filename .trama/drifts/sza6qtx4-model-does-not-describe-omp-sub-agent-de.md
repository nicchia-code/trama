---
status: resolved
resolution: proposal
refs:
  - project/Trama project/developer.UPDATE_SKILLS
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: i0e2coiq
created: 2026-10-10T08:48:23.813Z
---
# Model does not describe omp sub-agent definitions

## What happens

Inizializzazione e aggiornamento delle skill scrivono anche le definizioni dei sotto-agenti di omp in .omp/agents/, ma i Transition del Model non lo dicono.

## What should happen

Il Model descrive ciò che inizializzazione e aggiornamento scrivono, incluse le definizioni dei sotto-agenti di omp, come indicato in requirements/tech#models.

## Fix options

### Aggiungere le definizioni di omp al Model

INITIALIZE_PROJECT e UPDATE_SKILLS descrivono la scrittura in .omp/agents/ come già fa il codice.

### Togliere la scrittura dei file omp

Inizializzazione e aggiornamento tornano a installare solo le skill, come descritto oggi nel Model.

## Where in the code

src/cli/commands.ts (init, skills update); src/cli/skills.ts (installOmpAgents)
