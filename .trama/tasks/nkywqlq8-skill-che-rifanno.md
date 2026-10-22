---
column: done
technical: true
refs:
  - requirements/rules#developer.REWORK_PROPOSAL
drift: null
proposal: q51924cv
agent: false
created: 2026-10-22T05:44:18.607Z
finished: 2026-10-22T05:46:27.822Z
---
# Skill che rifanno

Quando il task è finito, le skill distribuite in `skills/` sanno rifare una Proposal rifiutata con Rework with feedback, come dice `requirements/rules#developer.REWORK_PROPOSAL`.

- `skills/trama-design/SKILL.md` ha una sezione per la rielaborazione, descritta per intero: quando l'istruzione chiede di rifare la Proposal rifiutata `<id>`, l'agente la legge con `trama proposal show <id>` (corpo, decisioni, file, Task e `## Feedback`); le decisioni della Proposal rifiutata valgono come già prese, salvo ciò che il feedback cambia o lascia in dubbio; l'intervista è facoltativa: un round di `trama question new` solo per le decisioni che il feedback apre o lascia aperte; senza `## Feedback` rifà la stessa modifica sul Modello di adesso. Riscrive la Proposal da capo sul Modello di adesso, senza richiedere la rifiutata, può dividerla come un design e passa `reworks` con l'identità della rifiutata solo alla prima `trama proposal new`, mai insieme a `request`. Poi scrive i Task e consegna come in ogni design.
- La sezione «When a Proposal comes back» di `trama-design` rimanda a questa sezione per Rework with feedback e resta valida per i rifiuti senza rielaborazione.
- `skills/trama-setup/SKILL.md`, `skills/trama-import/SKILL.md` e `skills/trama-resolve-drifts/SKILL.md` hanno la stessa regola per le Proposal che scrivono (setup, import, risoluzione sui Drift nominati dall'istruzione), rimandando a `trama-design` per ciò che non cambia; la risoluzione rifatta lega con `reworks` la risoluzione che apre.
- Nessuna skill approva, rifiuta o scarta da sé la Proposal nuova: dopo la consegna chiede al developer di esaminarla.
