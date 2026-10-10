---
column: done
technical: false
refs:
  - drift/Open/proposal.APPROVED
  - drift/Dismissed
  - drift.RESOLVED_BY_PROPOSAL
  - proposal/Draft/drift.RESOLVED_BY_PROPOSAL
  - proposal/Open/drift.RESOLVED_BY_PROPOSAL
  - requirements/data#drift
  - requirements/rules#drift
drift: null
proposal: hlnh5d44
agent: false
created: 2026-10-09T07:12:26.822Z
finished: 2026-10-09T08:26:52.827Z
---
# Resolve listed Drifts when a resolution Proposal is approved

Oggi approvare una Proposal non tocca mai i Drift, e il Drift non ha il campo `resolvedBy`.

Quando è fatto:
- Il Drift ha il campo `resolvedBy` (identità della Proposal di risoluzione che lo ha risolto), letto e scritto; assente nei Drift risolti in altro modo e in quelli scritti prima.
- Approvare una Proposal con `kind: resolution`, in qualunque modo sia approvata, risolve nello stesso passo ogni Drift della sua lista `drifts` ancora aperto con la decisione registrata, con le regole della riga di comando:
  - `fix-code`: crea il Task di correzione come `trama drift resolve --fix-code`, con l'opzione e la nota registrate, e riporta l'origine non Done in To do (bloccata finché il Task di correzione non è Done);
  - `proposal`: chiude il Drift con `resolution: proposal` (il Modello è già cambiato con la risoluzione; la Proposal allegata NON viene approvata);
  - `dismissed`: chiude il Drift con `resolution: dismissed`, anche quando ha una Proposal allegata.
- Ogni Drift risolto così ha `resolution`, `option`, `note`, `task` come da riga di comando, più `resolvedBy`; l'origine resta dov'è per `proposal` e `dismissed`.
- La Proposal allegata a ciascuno è messa da parte: rifiutata con il feedback «Drift <id> resolved by Proposal <id>» se aperta, scartata senza feedback se Draft; una già decisa resta com'è. Il Drift non la trattiene più.
- Un Drift della lista già risolto in altro modo è saltato senza errore, e l'uscita dell'approvazione dice quali.
- Rifiutare o scartare la risoluzione lascia i Drift aperti con le loro Proposal allegate.

Il tipo `resolution`, la lista `drifts` e i comandi per scriverla non fanno parte di questo Task.
