---
status: approved
kind: resolution
drifts:
  - drift: j4eehkfp
    decision: fix-code
    option: 1
  - drift: f7rip05f
    decision: proposal
  - drift: mpvllkma
    decision: fix-code
    option: 1
  - drift: cydzmlpy
    decision: fix-code
    option: 1
base:
  requirements/rules/drifts.md: 35200f508d36e7cdc94d913302e8c0716d8ede0ed0426615ce7fc49b607f986b
  editor-panel/panel.md: 89e9da99439540b3f6ec558413f8a36fb8b5671c0dc6a544b82eb75920689085
  work/drift.md: b4849934fb50dbc217fdc877b426e16a01b0753db93ab2ef4f4d05b611348df0
  agent-launching/drift-resolution.md: 5d3068903fe8aa58cc225e6aeda5236079444c20642a17536d157827e75ce9f4
delete: []
created: 2026-10-10T09:36:51.922Z
---
# Resolve four Drifts on finished requests, Drift details, resolution notes and unbound Cursor chat jobs

Risolve quattro Drift con le decisioni prese dal developer:

- Drift j4eehkfp – Richieste finite ricordate tra un riavvio e l'altro contro l'elenco dei requisiti: si corregge il codice derivando la fine dal file; una richiesta il cui file non esiste più è finita e la sua scheda ripristinata si chiude senza salvare né inviare.
- Drift f7rip05f – Drift details in the Diagram list Points at: il Modello si adegua al codice; lo Stato Diagram e la Machine Drift dicono che i dettagli e la scheda di un Drift mostrano anche i suoi riferimenti, sempre senza modo di decidere.
- Drift mpvllkma – Empty note accepted with a non-fix-code decision in a resolution: si corregge il codice, rifiutando ogni nota, anche vuota, con una decisione diversa dalla correzione del codice.
- Drift cydzmlpy – A Cursor chat job whose conversation is never seen never ends: si corregge il codice con la quiete finché il lavoro non è legato alla sua conversazione; il Modello e la regola di Drift resolution lo dicono, così il Task di correzione ha la regola su cui poggiare.
