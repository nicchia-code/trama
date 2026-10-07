---
column: done
technical: false
refs:
  - proposal.APPROVED
  - proposal/Open
  - proposal/Draft/agent.SUBMIT_PROPOSAL
  - project/Trama project/proposal.APPROVED
  - scan-hold
  - requirements/rules#proposal/Approved
  - requirements/tech#proposal
  - requirements/data#proposal
  - requirements/tech#General
drift: null
proposal: g0kh74u5
agent: false
created: 2026-10-07T05:28:50.786Z
finished: 2026-10-07T05:45:52.972Z
---
# Accettare una Proposal sempre nella cartella aperta e togliere il giro di worktree dal nucleo e dalla riga di comando

Accettare una Proposal ordinaria ha una sola strada: la applica nella cartella aperta, da riga di comando come dal pannello. Quando è fatto:

- `trama proposal approve` non legge più nessun interruttore multi-branch e non chiede all'editor di aprire un worktree; il comando `trama proposal withdraw` non esiste più.
- Una Proposal Open si modifica, si approva e si rifiuta senza alcun rifiuto «is in a worktree»; fra i motivi di blocco non c'è più il worktree.
- L'ambito di scansione si scrive solo quando la Proposal è approvata; non esiste più l'approvazione di una Proposal «unita» da un giro.
- Il nucleo non crea, legge né elimina worktree, branch `trama/*`, Merge Drift o Task di riconciliazione; la logica del giro e dell'interruttore multi-branch sparisce. Hold scan continua a leggere e scrivere la sua cartella locale da solo, senza dipendere dal codice tolto.
- Una cartella `.trama/multi-branch/` già presente non è letta né cancellata; worktree e branch `trama/*` di un giro rimasto aperto non sono guardati e le sue Proposal risultano semplicemente da decidere.
