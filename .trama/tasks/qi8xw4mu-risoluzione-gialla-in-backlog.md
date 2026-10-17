---
column: done
technical: false
refs:
  - proposal
  - requirements/ui#proposal
drift: null
proposal: dk0grfyg
agent: false
created: 2026-10-17T10:26:29.439Z
finished: 2026-10-17T10:46:11.692Z
---
# Proposal e risoluzioni in Backlog

Le schede delle Proposal da decidere stanno nella colonna Backlog, che sostituisce Work Items in ogni testo del pannello: una Proposal allegata a un Drift aperto non ha scheda in Backlog e non entra nel numero della colonna né in quello della scheda Board; la riga attenuata `Creates N Tasks` (`Creates 1 Task` al singolare) resta sulla scheda della Proposal in Backlog.

Una risoluzione consegnata appare in Backlog come una sola scheda gialla: la Proposal in testa e sotto le righe dei suoi Drift, ciascuna con i Task che quel Drift blocca; quei Drift non hanno la loro scheda in Blocked. La scheda conta una volta fra ciò che aspetta una decisione, anche se bloccata, e i pulsanti Approve e Reject decidono sempre l'intera risoluzione. Una risoluzione ancora in Draft non unifica nulla: resta il suo ghost, se annunciata, e i Drift aperti restano in Blocked. Tornare in Draft, essere rifiutata o scartata riporta in Blocked i Drift ancora aperti, con i loro Task.

Una Proposal che porta Task ha un'etichetta breve (`label`) che il pannello rende disponibile come tag dei suoi Task, compresi quelli di rimozione creati dall'approvazione; per le Proposal consegnate senza etichetta il tag è il titolo della Proposal.

Togliere il vecchio posizionamento della scheda gialla nella colonna Work Items. Aggiornare i test del webview.
