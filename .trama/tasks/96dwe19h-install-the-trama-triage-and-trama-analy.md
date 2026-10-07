---
column: done
technical: true
refs:
  - requirements/tech#agent-launching
drift: null
proposal: null
agent: false
created: 2026-10-07T15:00:23.315Z
finished: 2026-10-07T15:07:28.340Z
---
# Install the trama-triage and trama-analysis agent definitions for omp with the skills

Update skills e l'inizializzazione del progetto installano in `.omp/agents/` le definizioni `trama-triage.md` (`model: "@smol"`) e `trama-analysis.md` (`model: "@slow"`), senza modelli concreti, con prompt brevi in inglese: la prima decide soltanto se una Machine è in conflitto seguendo `trama-scan`, la seconda confronta a fondo una Machine in conflitto e archivia Task e Drift seguendo la stessa skill. Le definizioni per `--agents` di Claude Code usano gli stessi prompt.
