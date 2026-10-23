---
technical: false
refs:
  - agent-launching
  - agent-terminal
  - drift
  - drift-resolution
  - proposal
  - requirements/rules#agent-terminal
  - requirements/rules#agent-launching
  - requirements/rules#drift-resolution
  - requirements/rules#developer.REWORK_PROPOSAL
  - requirements/tech#drift
  - requirements/tech#work
  - requirements/cli#General
  - requirements/data#proposal
  - requirements/quality#agent-terminal
---
# Testi senza «experimental»

Quando il Task è finito, i testi che Trama manda agli agenti e le skill distribuite non chiamano più «experimental» il Drift Blocker, Parallel Execution e Sub-agents Context Sharing. Il comportamento delle funzioni non cambia: si accendono come prima (ora con le chiavi `trama.driftBlocker`, `trama.parallelExecution`, `trama.subagentsContextSharing`, rinominate da un altro Task di questa Proposal), le frasi arrivano alle stesse istruzioni e nello stesso ordine sulla riga.

Frasi delle istruzioni (`extension/src/host/prompts.ts`):
- Drift Blocker: "The Drift blocker is on: follow its steps whenever you file a Drift, and tell your sub-agents." (al posto di "The experimental Drift blocker is on: …"), nelle istruzioni che possono registrare Drift (scan del System e di Feature, implement, implement all, import e Unify Drifts); design e Resolve Drifts non la portano.
- Parallel Execution: "The parallel execution is on: follow the \"Parallel execution\" section of the trama-implement skill.", nelle corse su più Task (implement all e ogni Run di una sequenza per modello).
- Sub-agents Context Sharing: "The sub-agents context sharing is on: pass each sub-agent what you have already read that concerns its part, as the \"Sub-agents context sharing\" section of your skill says.", in ogni istruzione che porta la frase del limite, subito dopo quella dell'Async Drift Resolver o dove starebbe.
- Le frasi dell'Advisor Scanner e dell'Async Drift Resolver sono già senza «experimental» e non cambiano.

Skill distribuite (`skills/`, da cui le copie installate):
- La sezione "Experimental Drift blocker" di `trama-compare`, `trama-implement`, `trama-scan` e `trama-import` si chiama "Drift blocker", e ogni rimando interno alla sezione o alla frase usa il testo nuovo.
- La sezione "Experimental parallel execution" di `trama-implement` si chiama "Parallel execution", anche dove la skill la cita.
- La sezione "Experimental context sharing" di `trama-design`, `trama-scan`, `trama-compare`, `trama-implement`, `trama-import` e `trama-resolve-drifts` si chiama "Sub-agents context sharing", e la frase che la sezione cita come condizione è quella nuova.
- Il prompt del sotto-agente `trama-analysis` (`src/core/sub-agents.ts` e la definizione `.omp/agents/trama-analysis.md` che Trama scrive) e le istruzioni di Unify Drifts (`extension/media/unify-drifts.md`, «With the experimental Drift blocker on, judge again…») nominano il Drift blocker senza «experimental».

Altri testi: l'aiuto di `trama timing new` (`src/cli/commands/timing.ts`) dice «Record a choice of the parallel execution.»; i commenti e i testi di `src/core/timings.ts` che dicono «experimental parallel execution» dicono «parallel execution»; i commenti del campo `nonBlocking` in `src/core/proposals.ts` e `src/core/snapshot.ts` dicono «Drift blocker» senza «experimental». `docs/cli.md` (Async Drift Resolver, timing, Drift blocker) e `docs/uat.md` usano i nomi nuovi. I test che fissano frasi e sezioni (`test/host-prompts.test.ts`, `test/host-agent-terminals.test.ts`, `test/skills.test.ts`) usano i testi nuovi.
