---
status: approved
base:
  requirements/quality/main.md: 775932a241c6a85b62feb19742784457706fe1f599694cbfb99384d854a97086
  requirements/tech/models.md: 80c0f16c5a544d7178c7d2c4944130d8793246280947e1a9320723f5f1d5abd6
  requirements/tech/proposal.md: f1fdfc9ee2a1b53d601407de41a005b9b71968f70f6b58e665ed4ab8785ad816
delete: []
created: 2026-10-10T09:19:03.021Z
scanScope:
  - ref: requirements/quality#task
    reason: changed
  - ref: requirements/tech#agent-launching
    reason: changed
  - ref: requirements/tech#proposal
    reason: changed
---
# Scansione: fino a venti sotto-agenti fra triage e analisi, classify a quattro

Problema: il limite di quattro sotto-agenti della scansione (smistamento e analisi insieme, skill trama-scan) è solo un'istruzione nelle skill; nel codice non c'è. Il developer chiede fino a venti.

Decisioni (dal developer):
1. Il tetto di venti vale per triage e analisi della scansione insieme, un solo tetto. Design, resolve-drifts e il batch di Task restano a quattro (BATCH_MAX in src/core/work.ts).
2. L'editor lascia passare al massimo quattro chiamate trama classify contemporanee a Jev; le altre aspettano in coda.

Assunzioni prese senza chiedere:
- Il timeout di classifyWithEditor (15 secondi) include il tempo in coda; una chiamata che scade risponde unavailable e il triage usa la vista completa, come già previsto.
- La coda sta nell'host dell'editor (extension/src/host), non nel CLI.
- Le skill sorgenti in skills/ (trama-scan, trama-req-tech-models, trama-req-quality-main) vanno aggiornate dal Task che implementa questa Proposal.
