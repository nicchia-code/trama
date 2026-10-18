---
status: approved
kind: resolution
drifts:
  - drift: 1kixdbge
    decision: proposal
base:
  agent-questions/question-round.md: 50a31896aa2e14fd7954d11ad8d1e8cc15088bbd7df2ffed10b1374496bb08b1
  actors/developer.md: db77b53d8d09d8c9ae5e6fb369b532cb97ba05938d5e09ce4a50ac1370f598f6
  requirements/rules/questions-notices.md: ee13a0d13124a00d264dd8abf72ed12ab4deb9f6c6c9158be9670e1504f41d53
  requirements/ui/questions-notices.md: 7076a1c932c09cb7ea5726b45af8a59a0278d2b6549e98bfc3eea5dce4b48888
delete: []
created: 2026-10-18T10:27:05.585Z
---
# Round fuori vista senza progetto

Risolve i Drift scelti dal developer nel round di domande.

- `1kixdbge` – Round nascosto senza progetto: il comportamento attuale del codice è quello giusto (decisione `proposal`). Un round di domande in corso si vede solo mentre la finestra è sul suo progetto: se la cartella del progetto lascia la finestra, il round resta in attesa fuori vista, Reopen e il comando aprono il pannello senza il round, e le domande ricompaiono quando il progetto torna. Il Modello e i Requisiti lo dicono.
