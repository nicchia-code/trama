---
status: approved
kind: resolution
drifts:
  - drift: tedlgfp3
    decision: proposal
  - drift: zoizgq8f
    decision: fix-code
    option: 1
  - drift: n7ualzko
    decision: fix-code
    option: 1
  - drift: nw8485i2
    decision: fix-code
    option: 1
  - drift: o7kv3use
    decision: proposal
base:
  agent-launching/drift-resolution.md: 4f1d959c984cd30bc51ca490f7e72976f8c7ba6e422b18213b8b138e11ed0508
  work/drift.md: 0e192268b9d5be369e1e3e443de7f00067038489c34bd3e960bd2ebcb70e209d
  requirements/rules/drifts.md: 4c63c407333947aa8cb616df7dc01ee75823f7b9d7b4b047cd2ce76294136e5c
delete: []
created: 2026-10-09T20:12:52.584Z
---
# Resolve Drifts on quiet Runs, State level expansion, panel Markdown, Drift references

Risoluzione dei Drift decisa con il developer:
- Drift tedlgfp3 – Quiet period ends each quiet Run on its own instead of all Runs together: si adegua il Modello. La quiete chiude ogni Run senza fine visibile per conto suo, e si torna in Free quando non resta nessun Run.
- Drift zoizgq8f – States can be expanded in place at the State level, the Model allows it only at the Machine level: si corregge il codice. Al livello di uno Stato i sotto-Stati restano chiusi, solo Drill in.
- Drift n7ualzko – Panel Markdown loses formatting and links after an unclosed angle bracket: si corregge il codice. Un `<` che non chiude un tag è un carattere normale.
- Drift nw8485i2 – Diagram details mark a Drift's Requirement references as no longer resolving: si corregge il codice. Un Requisito che esiste diventa un link alla scheda Requirements.
- Drift o7kv3use – Fixing the code of a Drift whose references no longer resolve is not in the Model: si adegua il Modello. Un riferimento sparito diventa il suo contenitore più vicino nel Task di correzione; senza alcun elemento del Modello rimasto la correzione è rifiutata.
