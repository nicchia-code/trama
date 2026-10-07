---
column: done
technical: false
refs:
  - developer.TURN_SCAN_HOLD_ON
  - scan-hold/Off/developer.TURN_SCAN_HOLD_ON
  - scan-hold/On/proposal.APPROVED
  - proposal.APPROVED
  - agent-terminal/No agent terminal/proposal.APPROVED
  - agent-terminal/Agent running/proposal.APPROVED
  - agent-terminal/Agent idle/proposal.APPROVED
  - requirements/rules#scan-hold
  - requirements/rules#agent-terminal
  - requirements/tech#scan-hold
drift: null
proposal: u935y83q
agent: false
created: 2026-10-07T05:20:41.609Z
finished: 2026-10-07T05:25:11.275Z
---
# Accendere Hold scan e mettere in sospeso le approvazioni dal pannello invece di scansionare

Accendere Hold scan riesce sempre, scrive `on` e parte con il sospeso vuoto, indipendentemente da Multi-branch. Con l'interruttore acceso, un'approvazione dal pannello (diretta o accettando la Proposal di un Drift) che farebbe partire la scansione automatica, tolto il requisito del comando dell'agente (modifica ordinaria, `trama.autoScan` acceso, almeno una Feature toccata che esiste ancora, non l'arrivo di un giro di worktree), non avvia nessuna scansione né chiede il comando: la Proposal entra in fondo a `held` una volta sola e il contatore cresce. Con `trama.autoScan` spento non entra nulla; un'accettazione in un worktree non entra; `trama proposal approve` e `trama drift resolve --accept-proposal` dalla riga di comando non toccano il sospeso. La decisione usa lo `scanScope` salvato e lo stesso calcolo delle Feature toccate della scansione automatica, in `src/core`. Con Hold scan spento la scansione automatica resta com'è.
