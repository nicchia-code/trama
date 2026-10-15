---
column: done
technical: false
refs:
  - proposal/Open/developer.APPROVE_PROPOSAL
  - proposal/Approved
  - requirements/rules#proposal/Approved
drift: null
proposal: 2pa6eli4
agent: false
created: 2026-10-14T08:39:14.362Z
finished: 2026-10-14T09:38:30.328Z
---
# Create the Tasks of an ordinary Proposal when it is approved

Approvando una Proposal ordinaria, senza nessun agente e nello stesso passo che copia i suoi file nel Modello, il sistema crea in To do i Task della Proposal, legati a lei come un design, tutti con l'istante dell'approvazione e ordinati per identità.

- Per ogni elemento del Modello che la Proposal rimuove, quando il suo contenitore resta, crea un Task `Remove code of <riferimento>` che punta al contenitore ancora vivo.
- Per una Feature o un Actor rimossi crea un Technical Task senza riferimenti.
- Le sezioni dei Requisiti rimosse non creano Task.
- Se un Task non si può creare, l'approvazione è rifiutata prima di cambiare qualunque file.
- Import, risoluzioni e Proposal allegate a un Drift non creano Task: per le risoluzioni restano i Task di correzione dei Drift che decidono.
- Nessuna scansione parte dopo l'approvazione.
