---
column: done
technical: false
refs:
  - proposal
  - task
  - drift
  - requirements/data#General
drift: null
proposal: "0037"
agent: false
---
# Citare una scheda con l'identità, un prefisso univoco o il nome del file

Un comando trova una Proposal, un Task o un Drift senza doverne conoscere solo il numero.

Fatto quando:
- Un argomento cita la scheda con l'identità intera, con un prefisso univoco fra le schede di quel tipo, o con il nome completo del file o della cartella.
- Un prefisso che combacia con più schede è rifiutato e il comando elenca le identità.
- Un argomento di sole cifre cita solo una scheda numerata, accettata come `12` o `0012`, e mai un'identità casuale, anche se quella è fatta solo di cifre.
- Vale per ogni comando che già riceve l'identità di una Proposal, di un Task o di un Drift.
