---
column: done
technical: false
refs:
  - agent-terminal/No agent terminal/developer.ASK_AGENT
  - agent-terminal/No agent terminal/proposal.APPROVED
  - design-request/Writing/developer.ASK_AGENT
  - design-request/Writing/developer.CLOSE_REQUEST
  - scan-hold/On/developer.TURN_SCAN_HOLD_OFF
  - requirements/rules#agent-launching
  - requirements/tech#agent-launching
  - requirements/ui#agent-launching
  - requirements/quality#agent-launching
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
drift: null
proposal: w2cspsnx
agent: false
created: 2026-10-07T15:00:22.226Z
finished: 2026-10-07T15:04:00.263Z
---
# Let the developer choose the terminal agent once and treat an existing command as custom

Oggi esiste solo il comando dell'agente in testo libero, chiesto con una casella. Quando è fatto:
- le impostazioni `trama.terminalAgent`, `trama.analysis`, `trama.scan`, `trama.execution` e `trama.system1` esistono, vuote per default, valide solo nelle impostazioni utente e con le descrizioni in inglese dei Requisiti `ui`;
- l'agente effettivo è l'agente scelto, altrimenti `custom` se c'è già un comando, altrimenti nessuno;
- alla prima corsa con un launcher del terminale senza agente né comando compare l'elenco `Choose the agent Trama starts in the terminal` con i cinque agenti e `Other command…`; la scelta vale per tutti i progetti, «Other command…» chiede il comando come oggi e salva `custom`; Esc non invia nulla, e richiesta scritta, Hold scan spento e terminale restano come quando si annulla oggi la richiesta del comando;
- la scansione automatica dopo un'approvazione parte anche quando c'è solo un agente scelto, senza comando, e mai quando l'agente effettivo manca.
