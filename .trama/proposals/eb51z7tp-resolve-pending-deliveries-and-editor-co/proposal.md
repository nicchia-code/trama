---
status: approved
kind: resolution
drifts:
  - drift: eh3y283f
    decision: fix-code
    option: 1
  - drift: 6ghsf1vz
    decision: fix-code
    option: 1
  - drift: 7p60kj91
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-10T17:23:17.755Z
---
# Resolve pending deliveries and editor controls

- Drift eh3y283f – A pending multi-Task Run ignores Tasks taken before delivery: correggere il codice ricontrollando, immediatamente prima della consegna dell’istruzione, che nessun Task pertinente sia preso; una presa intervenuta durante la preparazione impedisce l’invio, senza liberare il Task e senza bloccare un design per prese su altri design.
- Drift 6ghsf1vz – Editor title action cannot target its editor group: correggere il codice usando un controllo associato alla scheda e al suo gruppo, visibile soltanto sulla richiesta mai inviata nel gruppo a fuoco.
- Drift 7p60kj91 – Resolve Drifts freezes its chat scope before the instruction is sent: correggere il codice determinando tutti e soli i Drift aperti al momento dell’invio effettivo, dopo la preparazione della chat, insieme al controllo delle condizioni di partenza; se non valgono più, non inviare nulla e avvisare lo sviluppatore.
