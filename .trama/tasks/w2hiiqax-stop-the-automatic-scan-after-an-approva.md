---
column: done
technical: false
refs:
  - proposal/Approved
  - proposal/Open/developer.APPROVE_PROPOSAL
  - project/Trama project/proposal.APPROVED
  - drift/Open/proposal.APPROVED
drift: null
proposal: 2pa6eli4
agent: false
created: 2026-10-14T08:39:15.326Z
finished: 2026-10-14T09:46:25.658Z
---
# Stop the automatic scan after an approval

Nessuna scansione segue un'approvazione: né quella di una Proposal approvata dalla Board o dalla riga di comando, né quella di una Proposal accettata attraverso il suo Drift.

- Si tolgono l'impostazione `trama.autoScan`, lo scan dopo l'approvazione e l'avviso di Cursor «Scan now» che offre di mandarlo quando la chat non può inviarlo da sé.
- Si tolgono la loro descrizione nel README e in quello dell'estensione.
- Un valore di `trama.autoScan` rimasto nelle impostazioni è ignorato e non viene riscritto.
- Gli scan manuali restano come sono; nessuna migrazione.
