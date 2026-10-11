---
column: done
technical: false
refs:
  - proposal/Open
  - proposal/Open/drift-resolution.AUTOMATIC_APPROVAL_GRANTED
  - requirements/data#proposal
  - requirements/rules#proposal
  - requirements/tech#proposal
drift: null
proposal: ndrmsitf
agent: false
created: 2026-10-10T20:33:29.416Z
finished: 2026-10-10T20:42:47.881Z
---
# Record automatic resolution proposals

## What should happen
Le risoluzioni automatiche devono essere distinguibili da quelle manuali mediante il campo storico automatic: true, scritto solo per Proposal di risoluzione create con --automatic. La CLI deve consentire questa opzione solo insieme a --resolution. Validazione e consegna devono rifiutare una risoluzione automatica che tocchi o elimini file del Modello o dei Requisiti, o registri decisioni diverse da fix-code con option: 1 senza nota; il marcatore da solo non deve autorizzare l’approvazione. Dopo l’approvazione, il marcatore resta nella storia della Proposal.
