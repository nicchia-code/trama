---
status: approved
kind: resolution
drifts:
  - drift: g7zzm3n2
    decision: fix-code
    option: 1
  - drift: rlcr0aw4
    decision: proposal
  - drift: ux20voo4
    decision: proposal
  - drift: xn2rdodn
    decision: fix-code
    option: 1
  - drift: tt6a35jq
    decision: fix-code
    option: 1
  - drift: qphm54a5
    decision: fix-code
    option: 1
  - drift: hak11eb1
    decision: fix-code
    option: 1
  - drift: 9lemwnhf
    decision: fix-code
    option: 1
base:
  model-changes/proposal.md: 3eef40825e6c721233f988f40e85359fba3daceb705f5c0f607fd3c1217edf1a
  requirements/rules/decisions.md: 143f584c5133d8ae5a89c5d52242e81fd3f3a197863b75809b9cb48f60ab5df5
  requirements/tech/agent-terminal.md: e12abd6b3eaa567228ac4456e5ee5e89d54584eabf383f34f177c9c249b14108
  requirements/rules/drifts.md: b42d3bef7f0017a469fbf1f731266e8e812913d896c08fac069f59b1ea725136
  requirements/tech/cursor-chat.md: new
delete: []
created: 2026-10-09T21:39:56.694Z
---
# Resolve eight Drifts on chat jobs, end markers, resolutions, Hold scan, design requests, announcements, question rounds and discards

Risolve otto Drift secondo le risposte del developer:

- g7zzm3n2 – A Trama conversation's turn ending in Cursor's chat ends every Run and Resolve Drifts there: si corregge il codice, ogni lavoro in chat segue la propria conversazione; la frase di `rules#drift-resolution` che diceva il contrario si allinea al Modello.
- rlcr0aw4 – End markers live in a folder per editor window, not in external-terminals/ as the Requirement says: si aggiorna il Requisito, ogni finestra dell'editor ha la sua sottocartella dei marcatori di fine, pulita quando nessuno la tocca da una settimana.
- ux20voo4 – Resolutions that fix the code of a Drift whose Model elements are gone are refused, unknown to the Proposal Model: si aggiorna il Modello della Proposal, la correzione del codice di un Drift senza più elementi del Modello è rifiutata alla registrazione e alla consegna, e blocca l'approvazione.
- xn2rdodn – Hold scan switch waits for the host before it changes on a click: si corregge il codice, lo switch cambia al click e torna com'era con l'avviso se l'host rifiuta o fallisce.
- tt6a35jq – A design request is bound to every Proposal given its id, not only the first: si corregge il codice, Trama lega alla richiesta solo la prima Proposal.
- qphm54a5 – Draft changes refresh the quiet period of every announcement: si corregge il codice, la modifica di una Draft tiene vivo solo il suo annuncio.
- hak11eb1 – A question round without a Trama project does not open the panel: si corregge il codice, l'agente riceve subito che le domande non sono disponibili.
- 9lemwnhf – A developer can discard a Draft attached to an open Drift from the command line: si corregge il codice, lo scarto diretto è rifiutato come l'approvazione e il rifiuto.
