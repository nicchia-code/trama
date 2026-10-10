---
column: done
technical: false
refs:
  - drift-resolution/Resolving
  - requirements/rules#drift-resolution
  - requirements/tech#General
drift: null
proposal: hlnh5d44
agent: false
created: 2026-10-09T07:11:11.625Z
finished: 2026-10-09T08:26:49.817Z
---
# Add the trama-resolve-drifts skill

Il lavoro dell'agente lanciato da Resolve Drifts è descritto da una nuova skill `trama-resolve-drifts`, in `skills/` con le altre, inclusa nel programma e installata da init e Update skills.

- Legge ogni Drift nominato dall'istruzione e la sua Proposal allegata, ed esplora Modello e codice con sotto-agenti (al massimo quattro insieme) quando l'agente li ha, come `trama-design`.
- Fa un solo round di domande con `trama ask`: una domanda a scelta singola per Drift, in ordine di creazione, che presenta la situazione in parole del dominio senza dire cosa fa oggi il codice; le opzioni sono le Fix options e il comportamento attuale, scritte allo stesso modo, con la raccomandazione dell'agente e pro e contro in `details`. Ripiega sulle proprie domande solo con `status: "unavailable"` iniziale.
- Una domanda saltata lascia quel Drift fuori e aperto, senza applicare la raccomandazione, e lo dice nel resoconto; la risposta libera diventa la nota.
- Scrive una Proposal di risoluzione con le decisioni (Fix option → correggere il codice con quell'opzione; comportamento del codice → adeguare Modello o Requisiti quando servono, sempre se il Drift ha una Proposal allegata, altrimenti chiudere), o più Proposal in catena quando i Drift sono tanti, ogni Drift in una sola; annuncia le Proposal dopo la prima, nomina le schede con numero breve e titolo e usa sempre l'identità permanente nei comandi.
- La consegna la Proposal e si ferma: non approva, non rifiuta, non risolve Drift.

Fatto quando un agente che riceve l'istruzione di Resolve Drifts arriva, seguendo solo la skill, a una Proposal di risoluzione consegnata.
