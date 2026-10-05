---
column: done
technical: false
refs:
  - panel/Open
  - panel/Diagram
  - panel/Board
  - panel/Requirements
  - requirements/ui#multi-branch
  - requirements/tech#multi-branch
  - requirements/ui#worktree-round
drift: null
proposal: e6051b33
agent: false
created: 1970-01-01T00:00:00.179Z
---
# Mostrare lo switch Multi-branch su ogni scheda del pannello

Ogni scheda del pannello mostra l'interruttore multi-branch di questa copia di lavoro, e un click lo accende o lo spegne subito.

Fatto quando:
- I testi sono in inglese. In ogni barra che ha `Design…` (Diagramma, Board e Requirements), subito dopo quel pulsante, c'è uno switch con etichetta `Multi-branch`. Nel Diagramma lo switch sta prima di `Scan`.
- Il tooltip è `When on, accepting an ordinary Proposal runs it in a worktree.` Il nome accessibile è `Multi-branch`, il controllo è uno switch, e lo stato acceso o spento è annunciato.
- Un click cambia subito, senza conferma. Le tre schede mostrano lo stesso stato, anche quella nascosta.
- Il quadro del pannello include l'interruttore e si aggiorna anche quando cambia solo quello. Un cambio del file, anche da un'altra finestra sullo stesso progetto, aggiorna lo switch su tutte le schede.
- La descrizione di `trama.worktreeAgent` dice che è il comando del terminale dei worktree, solo nelle impostazioni utente, e che vuoto impedisce sia di accendere l'interruttore sia l'accettazione con l'interruttore acceso. Il resto della Board dei worktree resta com'è.
