---
column: done
technical: false
refs:
  - proposal/Approved
  - proposal/Open
  - requirements/rules#proposal/Approved
  - requirements/data#proposal
drift: null
proposal: 2pa6eli4
agent: false
created: 2026-10-14T08:39:16.242Z
finished: 2026-10-14T09:49:03.656Z
---
# Compute a Proposal's scan scope live instead of saving it on approval

Lo scope di una Proposal si calcola dal Modello e dai Requisiti di prima e di dopo ogni volta che serve: alla validazione, alla consegna, all'approvazione e nella vista della Proposal. Per una Proposal in Draft o Open non è mai salvato.

- All'approvazione non si scrive più lo scope nel file della Proposal.
- Le Proposal già approvate che lo hanno salvato restano leggibili come storia, con il loro scope scritto.
- La validazione, la consegna e il blocco dell'approvazione usano lo stesso scope calcolato dal vivo.
