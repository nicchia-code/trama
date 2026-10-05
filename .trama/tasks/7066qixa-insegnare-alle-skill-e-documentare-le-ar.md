---
column: done
technical: true
refs:
  - requirements/tech#project
  - requirements/rules#proposal
drift: null
proposal: null
agent: false
created: 2026-10-05T13:21:56.441Z
---
# Insegnare alle skill e documentare le Aree divise in frammenti

Quando è fatto:
- la skill `trama-design` e il suo riferimento di formato descrivono le Aree come cartelle con `area.md` e frammenti, le due modalità delle skill di Requisiti, gli avvisi di `trama validate` e quando dividere un frammento;
- le skill che scrivono Proposal (design, import, scan quando allega una Proposal a un Drift), se la Proposal scrive in un frammento che è o diventa più grande di 12 KB, lo dividono nella stessa Proposal prima di consegnarla: tagli adatti al progetto (di solito per Feature o gruppo di Macchine vicine), nome e descrizione che dicono quando serve ogni frammento, sezioni spostate senza cambiarne il testo, preferendo pochi frammenti di media grandezza per restare nel budget di 4.000 caratteri;
- `docs/` descrive il formato nuovo e la migrazione con `trama update-skills`, e lo script di accettazione la prova.
