---
column: done
technical: true
refs:
  - requirements/tech#proposal
  - requirements/tech#General
  - requirements/rules#project
  - requirements/tech#agent-launching
drift: null
proposal: suahhze5
agent: false
created: 2026-10-18T19:48:52.057Z
finished: 2026-10-18T20:10:59.241Z
---
# Skill trama-compare

Una skill distribuita corta, `trama-compare`, porta tutto ciò che serve a chi confronta una Machine; le skill che confrontano e quelle che consegnano Proposal si alleggeriscono.

Fatto quando:
- `skills/trama-compare/SKILL.md` esiste, in inglese e corta: leggere solo `trama compare brief <machine> [--ref …] [--candidates]`, confrontare il codice con il briefing, rileggere il punto citato in `where` prima di archiviare, scrivere i Drift come dice "Writing a Drift", nominare le schede e dare titoli brevi, la regola delle decisioni del developer, il blocco sperimentale con i candidati del briefing, il Drift con Proposal (Draft che nomina il confronto, poi `trama proposal submit`), un solo `trama compare file` anche vuoto, la nota per PowerShell; non legge `task list`, `drift list`, `trama machine`, le General, le skill `trama-req-*` né `trama-scan`;
- `trama init` e Update skills la installano con le altre, e conta come le altre per i conflitti;
- il `prompt` di `trama-analysis` in `src/core/sub-agents.ts` dice di confrontare la Machine seguendo `trama-compare` e di non leggere `trama-scan`; le definizioni di omp, Claude Code, Cursor e Copilot lo riprendono;
- `trama-scan` dà a chi confronta solo la Machine e i riferimenti, non legge `task list` e `drift list` per i sotto-agenti, legge per sé solo le General e le sezioni che non nominano una Machine, confronta le Machine con `trama-compare` anche senza sotto-agenti, e non annuncia più le schede una per una;
- il pre-flight e la scansione di fine corsa di `trama-implement` confrontano le Machine con `trama-compare` sui riferimenti esatti, con solo Drift nel pre-flight;
- `trama-design`, `trama-setup`, `trama-import`, `trama-resolve-drifts`, `trama-scan` e `trama-implement` consegnano con `trama proposal submit` senza `validate --proposal` e `proposal show` prima, leggono le modifiche nell'uscita della consegna e, se non corrispondono, riaprono con `trama proposal edit` e riconsegnano.
