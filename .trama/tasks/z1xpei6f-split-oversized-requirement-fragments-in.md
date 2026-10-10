---
column: done
technical: true
refs:
  - requirements/rules#proposal
drift: null
proposal: null
agent: false
created: 2026-10-09T12:29:39.981Z
finished: 2026-10-09T18:38:34.485Z
---
# Split oversized Requirement fragments in Drift resolutions

La skill `trama-resolve-drifts` deve fare ciò che `rules#proposal` chiede a ogni skill che scrive Proposal, come già fanno `trama-design`, `trama-import` e `trama-scan`: quando una risoluzione scrive in un frammento di Requisiti che è o diventa più grande di 12 KB (l'avviso di `trama validate --proposal`), lo divide in quella stessa Proposal prima di consegnarla.

Quando è fatto:
- la skill dice di dividere il frammento prima della consegna, tagliando dove conviene al progetto (di solito per Feature o per gruppo di Machine vicine);
- ogni frammento nuovo ha un nome e una descrizione che dicono quando serve, e le sezioni sono spostate senza cambiarne il testo;
- la skill ricorda il budget di 4.000 caratteri delle skill di Requisiti e preferisce pochi frammenti di media grandezza a molti frammenti minuscoli.
